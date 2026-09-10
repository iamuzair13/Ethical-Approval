import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin } from "@/lib/admin-auth";
import {
  getAdminUserById,
  getIrebEmailsForFacultyIds,
  getIrebUserEmailById,
  resolveFacultyIdsFromSnapshotValue,
} from "@/lib/admin-repository";
import { canAccessFacultySnapshot } from "@/lib/authorization";
import { scheduleAdminReleaseToIrebEmail } from "@/lib/email";
import { db } from "@/lib/db";
import { getSubmissionDetailById } from "@/lib/submission-details";
import { resolveDecisionRecorder } from "@/lib/view-as";
import { logAdminReviewActivity } from "@/lib/activity-log/log-decision";

type AdminReviewBody = {
  action?: "recommend" | "mark_sensitive";
  comment?: string;
  irebUserId?: string;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await assertActiveAdmin(request);
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  // Only the Administrator (IREB chairman) can recommend / mark as sensitive
  // at the admin review stage.
  if (actor.role !== "administrator") {
    return NextResponse.json(
      { ok: false, error: "Only the Administrator can perform this action." },
      { status: 403 },
    );
  }

  const recorderContext = await resolveDecisionRecorder(request, actor);
  if (!recorderContext) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const submissionId = Number(id);
  if (!Number.isInteger(submissionId)) {
    return NextResponse.json({ ok: false, error: "Invalid submission id." }, { status: 400 });
  }

  const body = (await request.json()) as AdminReviewBody;
  if (body.action !== "recommend" && body.action !== "mark_sensitive") {
    return NextResponse.json(
      { ok: false, error: "Invalid action. Use 'recommend' or 'mark_sensitive'." },
      { status: 400 },
    );
  }

  // The recommend action requires a specific IREB user to assign the
  // application to.  Only that IREB member (and administrators) will be
  // able to see the application once it has been recommended.
  const irebUserId = body.irebUserId?.trim();
  if (body.action === "recommend" && !irebUserId) {
    return NextResponse.json(
      { ok: false, error: "Please select an IREB member to recommend to." },
      { status: 400 },
    );
  }
  if (irebUserId) {
    const irebEmail = await getIrebUserEmailById(irebUserId);
    if (!irebEmail) {
      return NextResponse.json(
        { ok: false, error: "Selected IREB member not found or inactive." },
        { status: 404 },
      );
    }
  }

  const submission = await getSubmissionDetailById(submissionId);
  if (!submission) {
    return NextResponse.json({ ok: false, error: "Submission not found." }, { status: 404 });
  }

  const canAccessFaculty = await canAccessFacultySnapshot(actor, submission.applicant_faculty);
  if (!canAccessFaculty) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  if (submission.current_status !== "under_admin_review") {
    return NextResponse.json(
      { ok: false, error: "Submission is not in the Administrator review stage." },
      { status: 409 },
    );
  }

  const effectiveAdminUser = await getAdminUserById(actor.adminId);
  if (!effectiveAdminUser) {
    return NextResponse.json({ ok: false, error: "Acting admin not found." }, { status: 404 });
  }

  const isSensitive = body.action === "mark_sensitive";
  const nextStatus = "under_ireb_review";
  const decisionValue = isSensitive ? "marked_sensitive" : "recommended";
  const comment = body.comment?.trim() || null;
  const finalComment = [comment, recorderContext.auditNote].filter(Boolean).join("\n\n") || null;

  const decidedBySapId = recorderContext.isViewAs
    ? recorderContext.recorderSapId
    : (effectiveAdminUser.sapId ?? effectiveAdminUser.id);
  const decidedByName = recorderContext.isViewAs
    ? recorderContext.recorderName
    : effectiveAdminUser.name;

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO approval_decisions (
          submission_id,
          stage,
          decision,
          comment,
          decided_by_sap_id,
          decided_by_name
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        submissionId,
        "admin",
        decisionValue,
        finalComment,
        decidedBySapId,
        decidedByName,
      ],
    );

    await client.query(
      `
        UPDATE submissions
        SET current_status = $2,
            is_sensitive = $3,
            assigned_ireb_user_id = $4,
            updated_at = NOW(),
            last_updated_at = NOW(),
            last_updated_by_sap_id = $5
        WHERE id = $1
      `,
      [
        submissionId,
        nextStatus,
        isSensitive,
        body.action === "recommend" ? irebUserId : null,
        decidedBySapId,
      ],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to record admin review action", error);
    return NextResponse.json(
      { ok: false, error: "Failed to save action." },
      { status: 500 },
    );
  } finally {
    client.release();
  }

  // Notify IREB members that the application has been released for review.
  // For "recommend", only the specific IREB member selected by the
  // administrator is notified (and can see the application).
  // For "mark_sensitive", all IREB members scoped to the faculty are notified.
  let irebEmails: string[] = [];
  if (body.action === "recommend" && irebUserId) {
    const email = await getIrebUserEmailById(irebUserId);
    if (email) irebEmails = [email];
  } else {
    const facultyIds = await resolveFacultyIdsFromSnapshotValue(submission.applicant_faculty);
    irebEmails = await getIrebEmailsForFacultyIds(facultyIds);
  }
  if (irebEmails.length > 0) {
    scheduleAdminReleaseToIrebEmail({
      irebEmails,
      applicantName: submission.applicant_name,
      title: submission.title,
      applicationId: submission.application_id,
      adminName: effectiveAdminUser.name,
      isSensitive,
    });
  }

  void logAdminReviewActivity({
    request,
    actor,
    submissionId,
    applicationId: submission.application_id,
    applicantFaculty: submission.applicant_faculty,
    action: body.action,
  });

  return NextResponse.json({ ok: true });
}
