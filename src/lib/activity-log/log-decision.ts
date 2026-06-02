import type { NextRequest } from "next/server";
import { getAdminUserById, resolveFacultyIdsFromSnapshotValue } from "@/lib/admin-repository";
import type { AuthenticatedAdmin } from "@/lib/admin-auth";
import { isViewAsActive } from "@/lib/view-as";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";
import { actorFromAdminUser } from "./descriptions";
import { resolveActivityContext } from "./context";
import { recordActivityEventFireAndForget, buildContextInput } from "./record";

export async function logApplicationDecisionActivity(input: {
  request: NextRequest;
  actor: AuthenticatedAdmin;
  submissionId: number;
  applicationId: string;
  applicantFaculty: string | null;
  decision: "approved" | "rejected";
  stage: "dean" | "ireb";
  onBehalfOfAdminId?: string;
}): Promise<void> {
  const token = await getToken({
    req: input.request,
    secret: getAuthSecret(),
  });

  let onBehalfId = input.onBehalfOfAdminId;
  if (!onBehalfId && token && !isViewAsActive(token) && input.actor.role === "administrator") {
    onBehalfId = undefined;
  }

  const ctx = await resolveActivityContext({
    request: input.request,
    onBehalfOfAdminId: onBehalfId,
  });
  if (!ctx) return;

  let facultyId: number | null = null;
  let facultyName: string | null = null;
  if (input.applicantFaculty) {
    const ids = await resolveFacultyIdsFromSnapshotValue(input.applicantFaculty);
    if (ids.length > 0) facultyId = ids[0];
  }

  const actionCode =
    input.decision === "approved"
      ? "application.review.approve"
      : "application.review.reject";

  let effective = ctx.effective;
  if (onBehalfId) {
    const onBehalf = await getAdminUserById(onBehalfId);
    if (onBehalf) effective = actorFromAdminUser(onBehalf);
  } else if (input.actor.role !== "administrator") {
    const eff = await getAdminUserById(input.actor.adminId);
    if (eff) effective = actorFromAdminUser(eff);
  }

  recordActivityEventFireAndForget({
    ...buildContextInput(
      {
        ...ctx,
        impersonationMode: onBehalfId
          ? "on_behalf"
          : ctx.impersonationMode,
        effective,
      },
      {
        actionCode,
        targetType: "application",
        targetId: input.applicationId,
        targetLabel: input.applicationId,
        submissionId: input.submissionId,
        facultyId,
        facultyName,
        metadata: { stage: input.stage, decision: input.decision },
      },
    ),
    effective,
  });
}
