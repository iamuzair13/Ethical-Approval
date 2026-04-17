import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

type SubmissionDetailRow = {
  id: number;
  type: "thesis" | "publication";
  domain: "medical" | "non_medical";
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
