import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { allocateUniqueApplicationId } from "@/lib/application-id";
import { mergeUploadedFilesIntoEthics } from "@/lib/submission-multipart";
import { stripAdminAuditNote } from "@/lib/approval-comment-utils";
import { scheduleSubmissionConfirmationEmail } from "@/lib/email";
import { isStudentApplicantEmail } from "@/lib/applicant-email";
import { resolveFacultyIdsFromSnapshotValue } from "@/lib/admin-repository";
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

  // Batch-resolve supervisor names by faculty
  const facultyValues = Array.from(new Set(result.rows.map((r) => r.faculty).filter(Boolean)));
  const supervisorMap = new Map<string, string | null>();
  for (const facultyValue of facultyValues) {
    const facultyIds = await resolveFacultyIdsFromSnapshotValue(facultyValue);
    if (facultyIds.length === 0) {
      supervisorMap.set(facultyValue, null);
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
    supervisorMap.set(facultyValue, supervisorResult.rows[0]?.name ?? null);
  }

  const submissions = result.rows.map((row) => ({
    ...row,
    latest_feedback_comment: stripAdminAuditNote(row.latest_feedback_comment),
    supervisor_name: supervisorMap.get(row.faculty) ?? null,
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
  applicantEmail: string,
): ProfileSubmissionRow["current_status"] {
  const isStudent = isStudentApplicantEmail(applicantEmail);

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
  // For non-students there is no supervisor stage, so go directly to IREB.
  return isStudent ? "submitted" : "under_ireb_review";
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const sapId = session?.user?.sapId;

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

  const applicantName = applicant?.name?.trim() || session.user?.name?.trim() || "Student";
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

      const nextStatus = resolveResubmissionStatus(existing.current_status, applicantEmail);

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

      const draftInitialStatus = isStudentApplicantEmail(applicantEmail) ? 'submitted' : 'under_ireb_review';
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
      const latestDraftInitialStatus = isStudentApplicantEmail(applicantEmail) ? 'submitted' : 'under_ireb_review';
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
        VALUES ($1, $2, 'student', $4, $3)
        RETURNING id, application_id, current_status, submitted_at
      `,
      [type, domain, applicationId, isStudentApplicantEmail(applicantEmail) ? 'submitted' : 'under_ireb_review'],
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
    console.error("Failed to create student submission", error);
    return NextResponse.json(
      { ok: false, error: "Failed to save submission." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

