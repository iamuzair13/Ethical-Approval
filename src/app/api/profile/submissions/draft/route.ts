import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { allocateUniqueApplicationId } from "@/lib/application-id";
import { mergeUploadedFilesIntoEthics } from "@/lib/submission-multipart";
import { db } from "@/lib/db";

type DraftBody = {
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

const PLACEHOLDER = "(Draft)";

function normalizeDraftText(value: string | undefined): string {
  const t = value?.trim() ?? "";
  return t || PLACEHOLDER;
}

/**
 * Creates a new server-side draft (first "Save Progress" for a new application).
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const sapId = session?.user?.sapId;

  if (!sapId) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  let body: DraftBody;
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
      body = JSON.parse(rawPayload) as DraftBody;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON in payload field." }, { status: 400 });
    }
  } else {
    try {
      body = (await request.json()) as DraftBody;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
    }
  }

  const type = body.type;
  const domain = body.domain;
  const applicant = body.applicantProfile;

  if (!type || !domain) {
    return NextResponse.json(
      { ok: false, error: "Application type and domain are required to save a draft." },
      { status: 400 },
    );
  }

  const title = normalizeDraftText(body.title);
  const objectives = normalizeDraftText(body.objectives);
  const methodology = normalizeDraftText(body.methodology);

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

    const applicationId = await allocateUniqueApplicationId(client);

    const submissionResult = await client.query<{
      id: number;
      application_id: string;
      current_status: "draft";
      submitted_at: Date;
    }>(
      `
        INSERT INTO submissions (type, domain, applicant_role, current_status, application_id)
        VALUES ($1, $2, 'student', 'draft', $3)
        RETURNING id, application_id, current_status, submitted_at
      `,
      [type, domain, applicationId],
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
        sapId,
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
    console.error("Failed to create draft submission", error);
    return NextResponse.json(
      { ok: false, error: "Failed to save draft." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
