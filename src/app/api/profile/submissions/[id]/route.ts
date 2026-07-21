import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { mergeUploadedFilesIntoEthics } from "@/lib/submission-multipart";
import { db } from "@/lib/db";

type SubmissionDetailRow = {
  id: number;
  application_id: string;
  type: "thesis" | "publication";
  domain: "medical" | "non_medical";
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
  methodology: string | null;
  participants_range: string | null;
  research_population: string | null;
  applicant_name: string;
  applicant_email: string;
  applicant_faculty: string;
  applicant_department: string;
  applicant_program: string | null;
  ethics_json: unknown;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const sapId = session?.user?.sapId;

  if (!sapId) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const submissionId = Number(id);
  if (!Number.isInteger(submissionId)) {
    return NextResponse.json({ ok: false, error: "Invalid submission id." }, { status: 400 });
  }

  const result = await db.query<SubmissionDetailRow>(
    `
      SELECT
        s.id,
        s.application_id,
        s.type,
        s.domain,
        s.current_status,
        s.submitted_at,
        src.title,
        src.objectives,
        src.methodology,
        src.participants_range,
        src.research_population,
        sas.name AS applicant_name,
        sas.email AS applicant_email,
        sas.faculty AS applicant_faculty,
        sas.department AS applicant_department,
        sas.program AS applicant_program,
        sep.ethics_json
      FROM submissions s
      INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
      LEFT JOIN submission_research_core src ON src.submission_id = s.id
      LEFT JOIN submission_ethics_payload sep ON sep.submission_id = s.id
      WHERE s.id = $1 AND sas.sap_id = $2
      LIMIT 1
    `,
    [submissionId, sapId],
  );

  const submission = result.rows[0];
  if (!submission) {
    return NextResponse.json({ ok: false, error: "Submission not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, submission });
}

type PatchDraftBody = {
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

const DRAFT_PLACEHOLDER = "(Draft)";

function normalizeDraftText(value: string | undefined): string {
  const t = value?.trim() ?? "";
  return t || DRAFT_PLACEHOLDER;
}

/**
 * Updates an existing in-progress draft (subsequent "Save Progress" actions).
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const sapId = session?.user?.sapId;

  if (!sapId) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const submissionId = Number(id);
  if (!Number.isInteger(submissionId)) {
    return NextResponse.json({ ok: false, error: "Invalid submission id." }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  let body: PatchDraftBody;
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
        { ok: false, error: 'Multipart requests must include a JSON "payload" field.' },
        { status: 400 },
      );
    }
    try {
      body = JSON.parse(rawPayload) as PatchDraftBody;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON in payload field." }, { status: 400 });
    }
  } else {
    try {
      body = (await request.json()) as PatchDraftBody;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
    }
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const own = await client.query<{
      id: number;
      application_id: string;
      current_status: string;
    }>(
      `
        SELECT s.id, s.application_id, s.current_status
        FROM submissions s
        INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
        WHERE s.id = $1 AND sas.sap_id = $2
        LIMIT 1
      `,
      [submissionId, sapId],
    );

    const existing = own.rows[0];
    if (!existing) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { ok: false, error: "Submission not found or access denied." },
        { status: 404 },
      );
    }

    if (existing.current_status !== "draft") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { ok: false, error: "Only draft applications can be updated this way." },
        { status: 400 },
      );
    }

    const type = body.type;
    const domain = body.domain;
    if (!type || !domain) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { ok: false, error: "Application type and domain are required." },
        { status: 400 },
      );
    }

    const title = normalizeDraftText(body.title);
    const objectives = normalizeDraftText(body.objectives);
    const methodology = normalizeDraftText(body.methodology);
    const applicant = body.applicantProfile;

    const applicantName = applicant?.name?.trim() || session.user?.name?.trim() || "Student";
    const applicantEmail = applicant?.email?.trim() || session.user?.email?.trim() || "";
    const applicantFaculty = applicant?.faculty?.trim() || "Unknown Faculty";
    const applicantDepartment = applicant?.department?.trim() || "Unknown Department";
    const applicantProgram = applicant?.program?.trim() || "";

    if (!applicantEmail) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { ok: false, error: "Applicant email is required." },
        { status: 400 },
      );
    }

    const finalizeEthics = async (sid: number, base: Record<string, unknown>) => {
      if (!multipartForm) return base;
      return mergeUploadedFilesIntoEthics(multipartForm, sid, base);
    };

    await client.query(
      `
        UPDATE submissions
        SET
          type = $1::submission_type,
          domain = $2::submission_domain,
          updated_at = NOW()
        WHERE id = $3
      `,
      [type, domain, submissionId],
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
        submissionId,
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
      [submissionId, title, objectives, methodology],
    );

    const mergedEthics = await finalizeEthics(
      submissionId,
      (body.ethics ?? {}) as Record<string, unknown>,
    );

    await client.query(
      `
        UPDATE submission_ethics_payload
        SET ethics_json = $2::jsonb
        WHERE submission_id = $1
      `,
      [submissionId, JSON.stringify(mergedEthics)],
    );

    await client.query("COMMIT");

    return NextResponse.json({
      ok: true,
      submission: {
        id: existing.id,
        application_id: existing.application_id,
        current_status: "draft" as const,
        title,
        objectives,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to update draft submission", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update draft." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/**
 * Permanently deletes an in-progress draft owned by the current applicant.
 */
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const sapId = session?.user?.sapId;

  if (!sapId) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const submissionId = Number(id);
  if (!Number.isInteger(submissionId)) {
    return NextResponse.json({ ok: false, error: "Invalid submission id." }, { status: 400 });
  }

  const result = await db.query<{ id: number; application_id: string }>(
    `
      DELETE FROM submissions s
      USING submission_applicant_snapshot sas
      WHERE s.id = sas.submission_id
        AND s.id = $1
        AND sas.sap_id = $2
        AND s.current_status = 'draft'
      RETURNING s.id, s.application_id
    `,
    [submissionId, sapId],
  );

  const deleted = result.rows[0];
  if (!deleted) {
    return NextResponse.json(
      { ok: false, error: "Draft not found or already submitted." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, deleted });
}
