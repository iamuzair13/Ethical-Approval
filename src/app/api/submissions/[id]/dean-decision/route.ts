import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertActiveAdmin } from "@/lib/admin-auth";
import { canAccessFacultySnapshot, canAccessSubmissionStage } from "@/lib/authorization";

type DecisionBody = {
  decision?: "approved" | "rejected";
  comment?: string;
};

type SubmissionStageRow = {
  current_status: string;
  faculty: string;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await assertActiveAdmin(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canAccessSubmissionStage(admin, "dean")) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const { id } = await context.params;
  const submissionId = Number(id);
  if (!Number.isInteger(submissionId)) {
    return NextResponse.json({ ok: false, error: "Invalid submission id." }, { status: 400 });
  }

  const body = (await request.json()) as DecisionBody;
  if (body.decision !== "approved" && body.decision !== "rejected") {
    return NextResponse.json({ ok: false, error: "Invalid decision." }, { status: 400 });
  }
  if (body.decision === "rejected" && !body.comment?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Comment is required when rejecting." },
      { status: 400 },
    );
  }

  const submissionResult = await db.query<SubmissionStageRow>(
    `
      SELECT s.current_status, sas.faculty
      FROM submissions s
      INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
      WHERE s.id = $1
      LIMIT 1
    `,
    [submissionId],
  );
  const submission = submissionResult.rows[0];
  if (!submission) {
    return NextResponse.json({ ok: false, error: "Submission not found." }, { status: 404 });
  }

  if (!(await canAccessFacultySnapshot(admin, submission.faculty))) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  if (submission.current_status !== "under_dean_review") {
    return NextResponse.json(
      { ok: false, error: "Submission is not in dean review stage." },
      { status: 409 },
    );
  }

  const nextStatus = body.decision === "approved" ? "dean_approved" : "dean_rejected";
  await db.query("BEGIN");
  try {
    await db.query(
      `
        INSERT INTO approval_decisions (
          submission_id,
          stage,
          decision,
          comment,
          decided_by_sap_id,
          decided_by_name
        ) VALUES ($1, 'dean', $2, $3, $4, $5)
      `,
      [
        submissionId,
        body.decision,
        body.comment?.trim() ?? null,
        admin.adminId,
        `Admin ${admin.adminId}`,
      ],
    );

    await db.query(
      `
        UPDATE submissions
        SET current_status = $2,
            updated_at = NOW(),
            last_updated_at = NOW(),
            last_updated_by_sap_id = $3
        WHERE id = $1
      `,
      [
        submissionId,
        nextStatus === "dean_approved" ? "under_ireb_review" : "dean_rejected",
        admin.adminId,
      ],
    );

    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }

  return NextResponse.json({ ok: true });
}
