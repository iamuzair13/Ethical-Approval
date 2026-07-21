import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin } from "@/lib/admin-auth";
import { getAdminUserById, resolveFacultyIdsFromSnapshotValue } from "@/lib/admin-repository";
import { canAccessFacultySnapshot } from "@/lib/authorization";
import {
  scheduleSupervisorRejectionEmail,
  scheduleIrebApprovalEmail,
  scheduleIrebRejectionEmail,
} from "@/lib/email";
import { db } from "@/lib/db";
import { getSubmissionDetailById } from "@/lib/submission-details";
import {
  formatRejectionDecisionComment,
  normalizeRejectionReasonIds,
} from "@/lib/rejection-reasons";
import { resolveDecisionRecorder } from "@/lib/view-as";
import { logApplicationDecisionActivity } from "@/lib/activity-log";

type DecisionBody = {
  decision?: "approved" | "rejected";
  comment?: string;
  /** Required when rejecting: predefined reason ids (see `REJECTION_REASON_OPTIONS`). */
  rejectionReasonCodes?: string[];
  onBehalfOfAdminId?: string;
};

function getStageFromStatus(status: string): "supervisor" | "ireb" | "completed" {
  if (status === "submitted" || status === "under_supervisor_review") return "supervisor";
  if (status === "supervisor_approved" || status === "under_ireb_review") return "ireb";
  return "completed";
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await assertActiveAdmin(request);
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
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

  const body = (await request.json()) as DecisionBody;
  if (body.decision !== "approved" && body.decision !== "rejected") {
    return NextResponse.json({ ok: false, error: "Invalid decision." }, { status: 400 });
  }
  if (body.decision === "rejected") {
    const codes = normalizeRejectionReasonIds(body.rejectionReasonCodes);
    const elaborate = body.comment?.trim() ?? "";
    if (codes.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Select at least one rejection reason." },
        { status: 400 },
      );
    }
    if (!elaborate) {
      return NextResponse.json(
        { ok: false, error: "Please elaborate is required when rejecting." },
        { status: 400 },
      );
    }
  }

  const submission = await getSubmissionDetailById(submissionId);
  if (!submission) {
    return NextResponse.json({ ok: false, error: "Submission not found." }, { status: 404 });
  }
  const canAccessFaculty = await canAccessFacultySnapshot(actor, submission.applicant_faculty);
  if (!canAccessFaculty) {
    const resolvedFacultyIds = await resolveFacultyIdsFromSnapshotValue(
      submission.applicant_faculty,
    );
    return NextResponse.json(
      {
        ok: false,
        error: "Forbidden.",
        debug: {
          actorRole: actor.role,
          actorScopeMode: actor.scopeMode,
          actorFacultyIds: actor.facultyIds,
          submissionFaculty: submission.applicant_faculty,
          resolvedFacultyIds,
        },
      },
      { status: 403 },
    );
  }

  const stage = getStageFromStatus(submission.current_status);
  if (stage === "completed") {
    return NextResponse.json(
      { ok: false, error: "Submission review is already completed." },
      { status: 409 },
    );
  }

  const effectiveAdminUser = await getAdminUserById(actor.adminId);
  if (!effectiveAdminUser) {
    return NextResponse.json({ ok: false, error: "Acting admin not found." }, { status: 404 });
  }

  let effectiveAdmin = effectiveAdminUser;
  let auditNote: string | null = recorderContext.auditNote;

  if (recorderContext.isViewAs) {
    if (actor.role !== stage) {
      return NextResponse.json({ ok: false, error: "Forbidden for this stage." }, { status: 403 });
    }
  } else if (actor.role === "administrator") {
    if (!body.onBehalfOfAdminId) {
      return NextResponse.json(
        { ok: false, error: "Select the admin to act on behalf of." },
        { status: 400 },
      );
    }

    const selectedAdmin = await getAdminUserById(body.onBehalfOfAdminId);
    if (!selectedAdmin || selectedAdmin.status !== "active") {
      return NextResponse.json(
        { ok: false, error: "Selected admin is not available." },
        { status: 404 },
      );
    }
    if ((stage === "supervisor" && selectedAdmin.role !== "supervisor") || (stage === "ireb" && selectedAdmin.role !== "ireb")) {
      return NextResponse.json(
        { ok: false, error: "Selected admin cannot act for this stage." },
        { status: 400 },
      );
    }
    effectiveAdmin = selectedAdmin;
    auditNote = `Action performed by administrator ${effectiveAdminUser.name} on behalf of ${effectiveAdmin.name}.`;
  } else if (actor.role !== stage) {
    return NextResponse.json({ ok: false, error: "Forbidden for this stage." }, { status: 403 });
  }

  const decidedBySapId = recorderContext.isViewAs
    ? recorderContext.recorderSapId
    : effectiveAdmin.sapId ?? effectiveAdmin.id;
  const decidedByName = recorderContext.isViewAs
    ? recorderContext.recorderName
    : effectiveAdmin.name;

  const nextStatus =
    stage === "supervisor"
      ? body.decision === "approved"
        ? "under_ireb_review"
        : "supervisor_rejected"
      : body.decision === "approved"
        ? "approved"
        : "rejected";

  let decisionCommentForDb: string | null;
  if (body.decision === "rejected") {
    const codes = normalizeRejectionReasonIds(body.rejectionReasonCodes);
    const elaborate = body.comment?.trim() ?? "";
    decisionCommentForDb = formatRejectionDecisionComment(codes, elaborate);
  } else {
    decisionCommentForDb = body.comment?.trim() ?? null;
  }

  const finalComment = [decisionCommentForDb, auditNote].filter(Boolean).join("\n\n") || null;

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
        stage,
        body.decision,
        finalComment,
        decidedBySapId,
        decidedByName,
      ],
    );

    await client.query(
      `
        UPDATE submissions
        SET current_status = $2,
            updated_at = NOW(),
            last_updated_at = NOW(),
            last_updated_by_sap_id = $3
        WHERE id = $1
      `,
      [submissionId, nextStatus, decidedBySapId],
    );

    await client.query("COMMIT");

    if (body.decision === "rejected" && stage === "supervisor") {
      scheduleSupervisorRejectionEmail({
        to: submission.applicant_email,
        applicantName: submission.applicant_name,
        facultyName: submission.applicant_faculty,
        supervisorName: effectiveAdmin.name,
        comment: finalComment,
      });
    } else if (body.decision === "rejected" && stage === "ireb") {
      scheduleIrebRejectionEmail({
        to: submission.applicant_email,
        applicantName: submission.applicant_name,
        comment: finalComment,
      });
    } else if (body.decision === "approved" && stage === "ireb") {
      scheduleIrebApprovalEmail({
        to: submission.applicant_email,
        applicantName: submission.applicant_name,
        title: submission.title,
        applicationId: submission.application_id,
        approvedAt: new Date(),
      });
    }

    const onBehalfId =
      actor.role === "administrator" && !recorderContext.isViewAs
        ? effectiveAdmin.id
        : undefined;

    void logApplicationDecisionActivity({
      request,
      actor,
      submissionId,
      applicationId: submission.application_id,
      applicantFaculty: submission.applicant_faculty,
      decision: body.decision,
      stage,
      onBehalfOfAdminId: onBehalfId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to record submission decision", error);
    return NextResponse.json({ ok: false, error: "Failed to save decision." }, { status: 500 });
  } finally {
    client.release();
  }
}
