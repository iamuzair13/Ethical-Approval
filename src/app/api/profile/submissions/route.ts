import { NextResponse } from "next/server";
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
        src.objectives
      FROM submissions s
      INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
      LEFT JOIN submission_research_core src ON src.submission_id = s.id
      WHERE sas.sap_id = $1
      ORDER BY s.submitted_at DESC
    `,
    [sapId],
  );

  return NextResponse.json({ ok: true, submissions: result.rows });
}

