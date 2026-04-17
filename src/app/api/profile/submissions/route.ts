import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

type ProfileSubmissionRow = {
  id: number;
  current_status:
    | "submitted"
    | "under_dean_review"
    | "dean_approved"
    | "dean_rejected"
    | "under_ireb_review"
    | "approved"
    | "rejected";
  submitted_at: Date;
  title: string | null;
  objectives: string | null;
  ethics_json: unknown;
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
        s.current_status,
        s.submitted_at,
        src.title,
        src.objectives,
        sep.ethics_json
      FROM submissions s
      INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
      LEFT JOIN submission_research_core src ON src.submission_id = s.id
      LEFT JOIN submission_ethics_payload sep ON sep.submission_id = s.id
      WHERE sas.sap_id = $1
      ORDER BY s.submitted_at DESC
    `,
    [sapId],
  );

  return NextResponse.json({ ok: true, submissions: result.rows });
}

type CreateSubmissionBody = {
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

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const sapId = session?.user?.sapId;

  if (!sapId) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: CreateSubmissionBody;
  try {
    body = (await request.json()) as CreateSubmissionBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
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

    const submissionResult = await client.query<{ id: number; current_status: ProfileSubmissionRow["current_status"]; submitted_at: Date }>(
      `
        INSERT INTO submissions (type, domain, applicant_role, current_status)
        VALUES ($1, $2, 'student', 'submitted')
        RETURNING id, current_status, submitted_at
      `,
      [type, domain],
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

    await client.query(
      `
        INSERT INTO submission_ethics_payload (submission_id, ethics_json)
        VALUES ($1, $2::jsonb)
      `,
      [submission.id, JSON.stringify(body.ethics ?? {})],
    );

    await client.query("COMMIT");

    return NextResponse.json({
      ok: true,
      submission: {
        id: submission.id,
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

