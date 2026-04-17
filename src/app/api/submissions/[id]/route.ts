import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin } from "@/lib/admin-auth";
import { canAccessFacultySnapshot } from "@/lib/authorization";
import { getSubmissionDetailById } from "@/lib/submission-details";

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

  const submission = await getSubmissionDetailById(submissionId);
  if (!submission) {
    return NextResponse.json({ ok: false, error: "Submission not found." }, { status: 404 });
  }

  if (!(await canAccessFacultySnapshot(admin, submission.applicant_faculty))) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({ ok: true, submission });
}
