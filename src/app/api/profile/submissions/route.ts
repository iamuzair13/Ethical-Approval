import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { allocateUniqueApplicationId } from "@/lib/application-id";
import { mergeUploadedFilesIntoEthics } from "@/lib/submission-multipart";
import { stripAdminAuditNote } from "@/lib/approval-comment-utils";
import { scheduleSubmissionConfirmationEmail } from "@/lib/email";
import { resolveFacultyIdsFromSnapshotValue } from "@/lib/admin-repository";
import { isFormAllowedForApplicant } from "@/lib/form-eligibility";
import { validateSupervisorForSubmission, type VerifiedSupervisor } from "@/lib/supervisor-selection";
import { db } from "@/lib/db";

type ProfileSubmissionRow = {
  id: number;
  application_id: string;
  type: "thesis" | "publication";
  current_status:
    | "draft"
    | "submitted"
    | "under_supervisor_review"
    | "supervisor_approved"
    | "supervisor_rejected"
    | "under_ireb_review"
    | "approved"
    | "rejected";
  submitted_at: Date;
  title: string | null;
  objectives: string | null;
  ethics_json: unknown;
  latest_feedback_comment: string | null;
  faculty: string;
  supervisor_name_snapshot: string | null;
  supervisor_department_snapshot: string | null;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const sapId = session?.user?.sapId;

  if (!sapId) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const result = await db.query<ProfileSubmissionRow>(
    `
      SELECT
        s.id,
        s.application_id,
        s.type,
        s.current_status,
        s.submitted_at,
        src.title,
        src.objectives,
        sep.ethics_json,
        sas.faculty,
        s.supervisor_name_snapshot,
        s.supervisor_department_snapshot,
        afd.latest_feedback_comment
      FROM submissions s
      INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
      LEFT JOIN submission_research_core src ON src.submission_id = s.id
      LEFT JOIN submission_ethics_payload sep ON sep.submission_id = s.id
      LEFT JOIN LATERAL (
        SELECT ad.comment AS latest_feedback_comment
        FROM approval_decisions ad
        WHERE ad.submission_id = s.id
          AND ad.comment IS NOT NULL
          AND LENGTH(TRIM(ad.comment)) > 0
        ORDER BY ad.decided_at DESC
        LIMIT 1
      ) afd ON TRUE
      WHERE sas.sap_id = $1
      ORDER BY s.submitted_at DESC
    `,
    [sapId],
  );

  // Supervisor name: prefer the per-application snapshot (authoritative for
  // new submissions). Fall back to faculty-scoped lookup for legacy
  // submissions that don't have a supervisor_user_id yet.
  const facultyValues = Array.from(
    new Set(
      result.rows
        .filter((r) => !r.supervisor_name_snapshot)
        .map((r) => r.faculty)
        .filter(Boolean),
    ),
  );
  const legacySupervisorMap = new Map<string, string | null>();
  for (const facultyValue of facultyValues) {
    const facultyIds = await resolveFacultyIdsFromSnapshotValue(facultyValue);
    if (facultyIds.length === 0) {
      legacySupervisorMap.set(facultyValue, null);
      continue;
    }
    const supervisorResult = await db.query<{ name: string }>(
      `
        SELECT au.name
        FROM admin_users au
        INNER JOIN admin_faculty_assignments afa ON afa.admin_user_id = au.id
        WHERE au.role = 'supervisor'
          AND au.status = 'active'
          AND au.deleted_at IS NULL
          AND afa.assignment_type = 'supervisor_primary'
          AND afa.deleted_at IS NULL
          AND afa.faculty_id = ANY($1::bigint[])
        ORDER BY au.updated_at DESC
        LIMIT 1
      `,
      [facultyIds],
    );
    legacySupervisorMap.set(facultyValue, supervisorResult.rows[0]?.name ?? null);
  }

  const submissions = result.rows.map((row) => ({
    ...row,
    latest_feedback_comment: stripAdminAuditNote(row.latest_feedback_comment),
    supervisor_name: row.supervisor_name_snapshot ?? legacySupervisorMap.get(row.faculty) ?? null,
    supervisor_department: row.supervisor_department_snapshot ?? null,
  }));

  return NextResponse.json({ ok: true, submissions });
}

type CreateSubmissionBody = {
  /** When set, promotes this draft row to a full submission instead of inserting a new row. */
  draftSubmissionId?: number;
  title?: string;
  objectives?: string;
  methodology?: string;
  type?: "thesis" | "publication";
  domain?: "medical" | "non_medical";
  ethics?: Record<string, unknown>;
  applicantProfile?: {
    name?: string;
    sapId?: string;
    email?: string;
    faculty?: string;
    department?: string;
    program?: string;
  };
};

function parseRevisionSubmissionId(ethics: Record<string, unknown> | undefined): number | null {
  if (!ethics) return null;
  const raw = ethics.revisionOfSubmissionId;
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw)) {
    const n = Number.parseInt(raw, 10);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  return null;
}

function parseDraftSubmissionIdFromEthics(ethics: Record<string, unknown> | undefined): number | null {
  if (!ethics) return null;
  const raw = ethics.draftSubmissionId;
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw)) {
    const n = Number.parseInt(raw, 10);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  return null;
}

function resolveResubmissionStatus(
  previousStatus: ProfileSubmissionRow["current_status"],
  isStudent: boolean,
  type: "thesis" | "publication" | undefined,
): ProfileSubmissionRow["current_status"] {
  // If IREB rejected a student submission, supervisor approval remains valid.
  if (previousStatus === "rejected" && isStudent) {
    return "under_ireb_review";
  }

  // If IREB rejected a non-student submission, return to applicant for resubmission.
  // The applicant edits and resubmits; on resubmission it goes directly to IREB again.
  if (previousStatus === "rejected" && !isStudent) {
    return "under_ireb_review";
  }

  // If supervisor rejected (or anything else), restart from the beginning.
  // Student thesis → supervisor stage; everything else → IREB directly.
  return resolveInitialStatus(isStudent, type);
}

/**
 * Determines whether a submission requires a supervisor selection.
 *
 * Only student thesis applications (Form 1 and Form 3) go through the
 * supervisor approval stage. Student publications and all faculty
 * submissions go directly to IREB.
 */
function requiresSupervisor(
  isStudent: boolean,
  type: "thesis" | "publication" | undefined,
): boolean {
  return isStudent && type === "thesis";
}

/**
 * Resolves the initial status for a new or resubmitted application based on
 * the applicant role and application type.
 *
 * Routing rules (the single centralized point that determines the workflow):
 *   - Student THESIS       → 'submitted'              (supervisor stage first)
 *   - Student PUBLICATION  → 'under_ireb_review'      (IREB directly, no supervisor)
 *   - Faculty (any type)   → 'under_ireb_review'      (IREB directly, no supervisor)
 */
function resolveInitialStatus(
  isStudent: boolean,
  type: "thesis" | "publication" | undefined,
): ProfileSubmissionRow["current_status"] {
  if (requiresSupervisor(isStudent, type)) {
    return "submitted";
  }
  return "under_ireb_review";
}

/**
 * Persists the supervisor relationship for a submission.
 *
 * Stores the authoritative supervisor_user_id FK plus snapshot columns on
 * the submissions row, and inserts a submission_participants row with
 * source='internal_faculty' for the historical record.
 *
 * Must be called inside an open transaction.
 */
async function persistSupervisorRelationship(
  client: { query: typeof db.query },
  submissionId: number,
  supervisor: {
    userId: string;
    facultyMemberId: string;
    sapId: string;
    name: string;
    email: string;
    department: string;
    faculty: string | null;
  },
): Promise<void> {
  // Update the submissions row with the authoritative FK + snapshot columns.
  await client.query(
    `
      UPDATE submissions
      SET
        supervisor_user_id = $2,
        supervisor_name_snapshot = $3,
        supervisor_sap_id_snapshot = $4,
        supervisor_email_snapshot = $5,
        supervisor_department_snapshot = $6,
        supervisor_faculty_snapshot = $7
      WHERE id = $1
    `,
    [
      submissionId,
      supervisor.userId,
      supervisor.name,
      supervisor.sapId,
      supervisor.email,
      supervisor.department,
      supervisor.faculty ?? null,
    ],
  );

  // Replace any existing supervisor participant row for this submission.
  await client.query(
    `
      DELETE FROM submission_participants
      WHERE submission_id = $1 AND participant_role = 'supervisor'
    `,
    [submissionId],
  );

  // Use 'internal_faculty' source when we have a faculty_member_id (preferred),
  // falling back to 'internal_erp' when faculty_member_id is missing (uses
  // sap_id only). The submission_participants_source_check constraint
  // requires faculty_member_id IS NOT NULL for 'internal_faculty' source.
  const hasFacultyMemberId = Boolean(supervisor.facultyMemberId?.trim());
  if (hasFacultyMemberId) {
    await client.query(
      `
        INSERT INTO submission_participants (
          submission_id,
          participant_role,
          source,
          faculty_member_id,
          sap_id,
          internal_name,
          internal_email,
          internal_faculty,
          internal_department
        )
        VALUES ($1, 'supervisor', 'internal_faculty', $2, $3, $4, $5, $6, $7)
      `,
      [
        submissionId,
        supervisor.facultyMemberId,
        supervisor.sapId,
        supervisor.name,
        supervisor.email,
        supervisor.faculty ?? null,
        supervisor.department,
      ],
    );
  } else {
    // Fallback: internal_erp source only requires sap_id IS NOT NULL.
    await client.query(
      `
        INSERT INTO submission_participants (
          submission_id,
          participant_role,
          source,
          sap_id,
          internal_name,
          internal_email,
          internal_faculty,
          internal_department
        )
        VALUES ($1, 'supervisor', 'internal_erp', $2, $3, $4, $5, $6, $7)
      `,
      [
        submissionId,
        supervisor.sapId,
        supervisor.name,
        supervisor.email,
        supervisor.faculty ?? null,
        supervisor.department,
      ],
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const sapId = session?.user?.sapId;
  const sessionApplicantRole = session?.user?.applicantRole;

  if (!sapId) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  let body: CreateSubmissionBody;
  let multipartForm: FormData | null = null;

  if (isMultipart) {
    try {
      multipartForm = await request.formData();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid multipart body." }, { status: 400 });
    }
    const rawPayload = multipartForm.get("payload");
    if (typeof rawPayload !== "string") {
      return NextResponse.json(
        { ok: false, error: "Multipart requests must include a JSON \"payload\" field." },
        { status: 400 },
      );
    }
    try {
      body = JSON.parse(rawPayload) as CreateSubmissionBody;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON in payload field." }, { status: 400 });
    }
  } else {
    try {
      body = (await request.json()) as CreateSubmissionBody;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
    }
  }

  const title = body.title?.trim() ?? "";
  const objectives = body.objectives?.trim() ?? "";
  const methodology = body.methodology?.trim() ?? "";
  const type = body.type;
  const domain = body.domain;
  const applicant = body.applicantProfile;

  if (!title || !objectives || !methodology || !type || !domain) {
    return NextResponse.json(
      { ok: false, error: "Missing required submission fields." },
      { status: 400 },
    );
  }

  const applicantName = applicant?.name?.trim() || session.user?.name?.trim() || "Applicant";
  const applicantEmail = applicant?.email?.trim() || session.user?.email?.trim() || "";
  const applicantFaculty = applicant?.faculty?.trim() || "Unknown Faculty";
  const applicantDepartment = applicant?.department?.trim() || "Unknown Department";
  const applicantProgram = applicant?.program?.trim() || "";

  if (!applicantEmail) {
    return NextResponse.json(
      { ok: false, error: "Applicant email is required." },
      { status: 400 },
    );
  }

  // Determine applicant type from the session (source of truth), not from email domain.
  // Faculty sessions have applicantRole = "faculty"; student sessions have "student".
  const isStudent = sessionApplicantRole === "student";

  // Validate that the selected form is available to this applicant role.
  // This prevents faculty from submitting student-only forms and vice versa.
  if (!isFormAllowedForApplicant(body.ethics, sessionApplicantRole)) {
    return NextResponse.json(
      { ok: false, error: "The selected form is not available for your account type." },
      { status: 403 },
    );
  }

  // Validate supervisor selection for student thesis applications.
  // The supervisor is verified server-side from supervisorUserId alone;
  // client-submitted name/email/sapId are never trusted as authoritative.
  const needsSupervisor = requiresSupervisor(isStudent, type);
  let verifiedSupervisor: VerifiedSupervisor | null = null;

  if (needsSupervisor) {
    const supervisorValidation = await validateSupervisorForSubmission(
      body.ethics as Record<string, unknown> | undefined,
    );
    if (!supervisorValidation.ok) {
      return NextResponse.json(
        { ok: false, error: supervisorValidation.error },
        { status: 400 },
      );
    }
    verifiedSupervisor = supervisorValidation.supervisor;
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const finalizeEthics = async (submissionId: number, base: Record<string, unknown>) => {
      if (!multipartForm) return base;
      return mergeUploadedFilesIntoEthics(multipartForm, submissionId, base);
    };

    const revisionSubmissionId = parseRevisionSubmissionId(body.ethics);

    if (revisionSubmissionId != null) {
      const own = await client.query<{
        id: number;
        application_id: string;
        current_status: ProfileSubmissionRow["current_status"];
        submitted_at: Date;
      }>(
        `
          SELECT s.id, s.application_id, s.current_status, s.submitted_at
          FROM submissions s
          INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
          WHERE s.id = $1 AND sas.sap_id = $2
          LIMIT 1
        `,
        [revisionSubmissionId, sapId],
      );

      const existing = own.rows[0];
      if (!existing) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { ok: false, error: "Submission not found or access denied." },
          { status: 404 },
        );
      }

      const nextStatus = resolveResubmissionStatus(existing.current_status, isStudent, type);

      await client.query(
        `
          UPDATE submissions
          SET
            type = $1::submission_type,
            domain = $2::submission_domain,
            current_status = $4,
            updated_at = NOW()
          WHERE id = $3
        `,
        [type, domain, revisionSubmissionId, nextStatus],
      );

      await client.query(
        `
          UPDATE submission_applicant_snapshot
          SET
            name = $2,
            email = $3,
            faculty = $4,
            department = $5,
            program = $6
          WHERE submission_id = $1
        `,
        [
          revisionSubmissionId,
          applicantName,
          applicantEmail,
          applicantFaculty,
          applicantDepartment,
          applicantProgram || null,
        ],
      );

      await client.query(
        `
          UPDATE submission_research_core
          SET
            title = $2,
            objectives = $3,
            methodology = $4
          WHERE submission_id = $1
        `,
        [revisionSubmissionId, title, objectives, methodology],
      );

      const mergedEthics = await finalizeEthics(
        revisionSubmissionId,
        (body.ethics ?? {}) as Record<string, unknown>,
      );

      await client.query(
        `
          UPDATE submission_ethics_payload
          SET ethics_json = $2::jsonb
          WHERE submission_id = $1
        `,
        [revisionSubmissionId, JSON.stringify(mergedEthics)],
      );

      // Re-validate and persist the supervisor relationship on resubmission.
      // The student may have changed the supervisor during revision.
      if (needsSupervisor && verifiedSupervisor) {
        await persistSupervisorRelationship(client, revisionSubmissionId, verifiedSupervisor);
      }

      const revisionNumber =
        typeof body.ethics?.revisionNumber === "number" ? body.ethics.revisionNumber : undefined;

      await client.query("COMMIT");

      scheduleSubmissionConfirmationEmail({
        to: applicantEmail,
        applicantName,
        applicationId: existing.application_id,
        submittedAt: existing.submitted_at,
      });

      return NextResponse.json({
        ok: true,
        submission: {
          id: existing.id,
          application_id: existing.application_id,
          current_status: nextStatus,
          submitted_at: existing.submitted_at,
          title,
          objectives,
          revision_number: revisionNumber,
        },
      });
    }

    const draftSubmissionId =
      typeof body.draftSubmissionId === "number" &&
      Number.isInteger(body.draftSubmissionId) &&
      body.draftSubmissionId > 0
        ? body.draftSubmissionId
        : parseDraftSubmissionIdFromEthics(body.ethics);

    if (draftSubmissionId != null) {
      const own = await client.query<{
        id: number;
        application_id: string;
        current_status: ProfileSubmissionRow["current_status"];
        submitted_at: Date;
      }>(
        `
          SELECT s.id, s.application_id, s.current_status, s.submitted_at
          FROM submissions s
          INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
          WHERE s.id = $1 AND sas.sap_id = $2
          LIMIT 1
        `,
        [draftSubmissionId, sapId],
      );

      const existingDraft = own.rows[0];
      if (!existingDraft) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { ok: false, error: "Submission not found or access denied." },
          { status: 404 },
        );
      }

      if (existingDraft.current_status !== "draft") {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { ok: false, error: "This application is not a draft." },
          { status: 400 },
        );
      }

      const draftInitialStatus = resolveInitialStatus(isStudent, type);
      await client.query(
        `
          UPDATE submissions
          SET
            type = $1::submission_type,
            domain = $2::submission_domain,
            current_status = $4,
            updated_at = NOW()
          WHERE id = $3
        `,
        [type, domain, draftSubmissionId, draftInitialStatus],
      );

      await client.query(
        `
          UPDATE submission_applicant_snapshot
          SET
            name = $2,
            email = $3,
            faculty = $4,
            department = $5,
            program = $6
          WHERE submission_id = $1
        `,
        [
          draftSubmissionId,
          applicantName,
          applicantEmail,
          applicantFaculty,
          applicantDepartment,
          applicantProgram || null,
        ],
      );

      await client.query(
        `
          UPDATE submission_research_core
          SET
            title = $2,
            objectives = $3,
            methodology = $4
          WHERE submission_id = $1
        `,
        [draftSubmissionId, title, objectives, methodology],
      );

      const mergedEthics = await finalizeEthics(
        draftSubmissionId,
        (body.ethics ?? {}) as Record<string, unknown>,
      );

      await client.query(
        `
          UPDATE submission_ethics_payload
          SET ethics_json = $2::jsonb
          WHERE submission_id = $1
        `,
        [draftSubmissionId, JSON.stringify(mergedEthics)],
      );

      // Persist the supervisor relationship for the promoted submission.
      if (needsSupervisor && verifiedSupervisor) {
        await persistSupervisorRelationship(client, draftSubmissionId, verifiedSupervisor);
      }

      await client.query("COMMIT");

      scheduleSubmissionConfirmationEmail({
        to: applicantEmail,
        applicantName,
        applicationId: existingDraft.application_id,
        submittedAt: existingDraft.submitted_at,
      });

      return NextResponse.json({
        ok: true,
        submission: {
          id: existingDraft.id,
          application_id: existingDraft.application_id,
          current_status: draftInitialStatus,
          submitted_at: existingDraft.submitted_at,
          title,
          objectives,
        },
      });
    }

    // Safety net: if client did not send draftSubmissionId but a draft exists for this
    // applicant, promote that draft instead of creating a second application record.
    const latestDraftResult = await client.query<{
      id: number;
      application_id: string;
      current_status: ProfileSubmissionRow["current_status"];
      submitted_at: Date;
    }>(
      `
        SELECT s.id, s.application_id, s.current_status, s.submitted_at
        FROM submissions s
        INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
        WHERE sas.sap_id = $1
          AND s.current_status = 'draft'
        ORDER BY s.updated_at DESC, s.id DESC
        LIMIT 1
      `,
      [sapId],
    );

    const latestDraft = latestDraftResult.rows[0];
    if (latestDraft) {
      const latestDraftInitialStatus = resolveInitialStatus(isStudent, type);
      await client.query(
        `
          UPDATE submissions
          SET
            type = $1::submission_type,
            domain = $2::submission_domain,
            current_status = $4,
            updated_at = NOW()
          WHERE id = $3
        `,
        [type, domain, latestDraft.id, latestDraftInitialStatus],
      );

      await client.query(
        `
          UPDATE submission_applicant_snapshot
          SET
            name = $2,
            email = $3,
            faculty = $4,
            department = $5,
            program = $6
          WHERE submission_id = $1
        `,
        [
          latestDraft.id,
          applicantName,
          applicantEmail,
          applicantFaculty,
          applicantDepartment,
          applicantProgram || null,
        ],
      );

      await client.query(
        `
          UPDATE submission_research_core
          SET
            title = $2,
            objectives = $3,
            methodology = $4
          WHERE submission_id = $1
        `,
        [latestDraft.id, title, objectives, methodology],
      );

      const mergedEthics = await finalizeEthics(
        latestDraft.id,
        (body.ethics ?? {}) as Record<string, unknown>,
      );

      await client.query(
        `
          UPDATE submission_ethics_payload
          SET ethics_json = $2::jsonb
          WHERE submission_id = $1
        `,
        [latestDraft.id, JSON.stringify(mergedEthics)],
      );

      // Persist the supervisor relationship for the promoted submission.
      if (needsSupervisor && verifiedSupervisor) {
        await persistSupervisorRelationship(client, latestDraft.id, verifiedSupervisor);
      }

      await client.query("COMMIT");

      scheduleSubmissionConfirmationEmail({
        to: applicantEmail,
        applicantName,
        applicationId: latestDraft.application_id,
        submittedAt: latestDraft.submitted_at,
      });

      return NextResponse.json({
        ok: true,
        submission: {
          id: latestDraft.id,
          application_id: latestDraft.application_id,
          current_status: latestDraftInitialStatus,
          submitted_at: latestDraft.submitted_at,
          title,
          objectives,
        },
      });
    }

    const applicationId = await allocateUniqueApplicationId(client);

    const submissionResult = await client.query<{
      id: number;
      application_id: string;
      current_status: ProfileSubmissionRow["current_status"];
      submitted_at: Date;
    }>(
      `
        INSERT INTO submissions (type, domain, applicant_role, current_status, application_id)
        VALUES ($1, $2, $5::applicant_role, $4, $3)
        RETURNING id, application_id, current_status, submitted_at
      `,
      [type, domain, applicationId, resolveInitialStatus(isStudent, type), isStudent ? 'student' : 'faculty'],
    );

    const submission = submissionResult.rows[0];

    await client.query(
      `
        INSERT INTO submission_applicant_snapshot (
          submission_id, sap_id, name, email, faculty, department, program
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        submission.id,
        applicant?.sapId?.trim() || sapId,
        applicantName,
        applicantEmail,
        applicantFaculty,
        applicantDepartment,
        applicantProgram || null,
      ],
    );

    await client.query(
      `
        INSERT INTO submission_research_core (
          submission_id, title, objectives, methodology, participants_range, research_population
        )
        VALUES ($1, $2, $3, $4, NULL, NULL)
      `,
      [submission.id, title, objectives, methodology],
    );

    const mergedEthics = await finalizeEthics(submission.id, (body.ethics ?? {}) as Record<string, unknown>);

    await client.query(
      `
        INSERT INTO submission_ethics_payload (submission_id, ethics_json)
        VALUES ($1, $2::jsonb)
      `,
      [submission.id, JSON.stringify(mergedEthics)],
    );

    // Persist the supervisor relationship for the new submission.
    if (needsSupervisor && verifiedSupervisor) {
      await persistSupervisorRelationship(client, submission.id, verifiedSupervisor);
    }

    await client.query("COMMIT");

    scheduleSubmissionConfirmationEmail({
      to: applicantEmail,
      applicantName,
      applicationId: submission.application_id,
      submittedAt: submission.submitted_at,
    });

    return NextResponse.json({
      ok: true,
      submission: {
        id: submission.id,
        application_id: submission.application_id,
        current_status: submission.current_status,
        submitted_at: submission.submitted_at,
        title,
        objectives,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Failed to create submission", error);
    return NextResponse.json(
      { ok: false, error: `Failed to save submission: ${detail}` },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

