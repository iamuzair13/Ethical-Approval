import type { NextRequest } from "next/server";
import { getAdminUserById } from "@/lib/admin-repository";
import { actorFromAdminUser } from "./descriptions";
import { resolveActivityContext } from "./context";
import { recordActivityEventFireAndForget, buildContextInput } from "./record";
import type { ActivityEventInput } from "./types";

export async function logActivityFromRequest(
  request: NextRequest | Request,
  input: Omit<ActivityEventInput, "context"> & {
    onBehalfOfAdminId?: string;
    actorAdminId?: string;
  },
): Promise<void> {
  const ctx = await resolveActivityContext({
    request,
    onBehalfOfAdminId: input.onBehalfOfAdminId,
  });
  if (!ctx) return;

  let effective = input.effective;
  if (!effective && input.actorAdminId) {
    const user = await getAdminUserById(input.actorAdminId);
    if (user) effective = actorFromAdminUser(user);
  }

  recordActivityEventFireAndForget({
    ...buildContextInput(ctx, input),
    effective: effective ?? input.effective,
  });
}

export async function logActivityForAdminIds(
  actorAdminId: string,
  input: Omit<ActivityEventInput, "context" | "actor">,
): Promise<void> {
  const actorUser = await getAdminUserById(actorAdminId);
  if (!actorUser) return;

  const actor = actorFromAdminUser(actorUser);
  let effective = input.effective;
  if (!effective && input.targetId) {
    const target = await getAdminUserById(input.targetId);
    if (target) effective = actorFromAdminUser(target);
  }

  recordActivityEventFireAndForget({
    ...input,
    actor,
    effective: effective ?? actor,
    actorTimezone: "UTC",
  });
}
