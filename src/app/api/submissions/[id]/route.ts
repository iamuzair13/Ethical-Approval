import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertActiveAdmin } from "@/lib/admin-auth";
import { canAccessFacultySnapshot } from "@/lib/authorization";

type SubmissionDetailRow = {
  id: number;
  current_status: string;
  faculty: string;
  department: string;
  applicant_name: string;
  applicant_email: string;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await assertActiveAdmin(request);
  if (!admin) {
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
        s.current_status,
        sas.faculty,
        sas.department,
        sas.name AS applicant_name,
        sas.email AS applicant_email
      FROM submissions s
      INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
      WHERE s.id = $1
      LIMIT 1
    `,
    [submissionId],
  );

  const submission = result.rows[0];
  if (!submission) {
    return NextResponse.json({ ok: false, error: "Submission not found." }, { status: 404 });
  }

  if (!(await canAccessFacultySnapshot(admin, submission.faculty))) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({ ok: true, submission });
}
