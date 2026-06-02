import type { Session } from "next-auth";
import { getAdminUserById } from "@/lib/admin-repository";
import { actorFromAdminUser } from "./descriptions";
import { recordActivityEventFireAndForget } from "./record";

export async function logProfileActivityFromSession(
  session: Session | null,
  input: {
    actionCode: "profile.update" | "profile.avatar.update" | "profile.avatar.remove";
    targetId: string;
    metadata?: Record<string, unknown>;
    detail?: string;
  },
): Promise<void> {
  const adminId =
    session?.user?.actingAdminId?.trim() || session?.user?.adminId?.trim();
  const role = session?.user?.actingAdminRole ?? session?.user?.adminRole;
  if (!adminId || !role) return;

  const user = await getAdminUserById(adminId);
  if (!user) return;

  const actor = actorFromAdminUser(user);

  recordActivityEventFireAndForget({
    actionCode: input.actionCode,
    targetType: "profile",
    targetId: input.targetId,
    targetLabel: user.name,
    actor,
    effective: actor,
    impersonationMode: null,
    actorTimezone: "UTC",
    metadata: input.metadata,
    description: input.detail
      ? undefined
      : undefined,
  });
}
