import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin } from "@/lib/admin-auth";
import { getAdminUserById, resolveFacultyIdsFromSnapshotValue } from "@/lib/admin-repository";
import { canAccessFacultySnapshot } from "@/lib/authorization";
import {
  scheduleDeanRejectionEmail,
  scheduleIrebApprovalEmail,
  scheduleIrebRejectionEmail,
} from "@/lib/email";
import { db } from "@/lib/db";
import { getSubmissionDetailById } from "@/lib/submission-details";
import {
  formatRejectionDecisionComment,
  normalizeRejectionReasonIds,
} from "@/lib/rejection-reasons";

type DecisionBody = {
  decision?: "approved" | "rejected";
  comment?: string;
  /** Required when rejecting: predefined reason ids (see `REJECTION_REASON_OPTIONS`). */
  rejectionReasonCodes?: string[];
  onBehalfOfAdminId?: string;
};

function getStageFromStatus(status: string): "dean" | "ireb" | "completed" {
  if (status === "submitted" || status === "under_dean_review") return "dean";
  if (status === "dean_approved" || status === "under_ireb_review") return "ireb";
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

  const actingAdmin = await getAdminUserById(actor.adminId);
  if (!actingAdmin) {
    return NextResponse.json({ ok: false, error: "Acting admin not found." }, { status: 404 });
  }
  let effectiveAdmin = actingAdmin;

  if (actor.role === "administrator") {
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
    if ((stage === "dean" && selectedAdmin.role !== "dean") || (stage === "ireb" && selectedAdmin.role !== "ireb")) {
      return NextResponse.json(
        { ok: false, error: "Selected admin cannot act for this stage." },
        { status: 400 },
      );
    }
    effectiveAdmin = selectedAdmin;
  } else if (actor.role !== stage) {
    return NextResponse.json({ ok: false, error: "Forbidden for this stage." }, { status: 403 });
  }

  const nextStatus =
    stage === "dean"
      ? body.decision === "approved"
        ? "under_ireb_review"
        : "dean_rejected"
      : body.decision === "approved"
        ? "approved"
        : "rejected";

  const auditNote =
    actor.role === "administrator" && actor.adminId !== effectiveAdmin.id
      ? `Action performed by administrator ${actingAdmin.name} on behalf of ${effectiveAdmin.name}.`
      : null;

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
        effectiveAdmin.sapId ?? effectiveAdmin.id,
        effectiveAdmin.name,
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
      [submissionId, nextStatus, effectiveAdmin.sapId ?? effectiveAdmin.id],
    );

    await client.query("COMMIT");

    if (body.decision === "rejected" && stage === "dean") {
      scheduleDeanRejectionEmail({
        to: submission.applicant_email,
        applicantName: submission.applicant_name,
        facultyName: submission.applicant_faculty,
        deanName: effectiveAdmin.name,
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to record submission decision", error);
    return NextResponse.json({ ok: false, error: "Failed to save decision." }, { status: 500 });
  } finally {
    client.release();
  }
}
