import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { parseActingAdmin, parseEffectiveAdmin } from "@/lib/admin-auth";
import { getAuthSecret } from "@/lib/auth-secret";
import { getAdminUserById } from "@/lib/admin-repository";
import { isViewAsActive } from "@/lib/view-as";
import { db } from "@/lib/db";
import type { ActivityContext, ActivityActorSnapshot, ImpersonationMode } from "./types";
import { actorFromAdminUser } from "./descriptions";

async function resolveTimezone(sapId: string | null | undefined): Promise<string> {
  if (!sapId?.trim()) return "UTC";
  try {
    const result = await db.query<{ locale: string | null }>(
      `SELECT locale FROM user_profiles WHERE sap_id = $1`,
      [sapId.trim()],
    );
    const locale = result.rows[0]?.locale?.trim();
    if (locale) return locale;
  } catch {
    /* ignore */
  }
  return "UTC";
}

export type ResolveActivityContextOptions = {
  request?: NextRequest | Request;
  /** When admin acts on behalf of dean/ireb without view-as session */
  onBehalfOfAdminId?: string;
  actorTimezone?: string;
};

export async function resolveActivityContext(
  options: ResolveActivityContextOptions = {},
): Promise<ActivityContext | null> {
  const { request, onBehalfOfAdminId, actorTimezone: tzOverride } = options;

  let token = null;
  if (request) {
    token = await getToken({
      req: request as NextRequest,
      secret: getAuthSecret(),
    });
  }

  if (!token?.adminId) return null;

  const acting = parseActingAdmin(token);
  const effectiveParsed = parseEffectiveAdmin(token);
  if (!acting || !effectiveParsed) return null;

  const actingUser = await getAdminUserById(acting.adminId);
  if (!actingUser) return null;

  const actor: ActivityActorSnapshot = actorFromAdminUser({
    id: actingUser.id,
    name: actingUser.name,
    role: actingUser.role,
  });

  let effective: ActivityActorSnapshot = actor;
  let impersonationMode: ImpersonationMode | null = null;

  if (onBehalfOfAdminId) {
    const onBehalf = await getAdminUserById(onBehalfOfAdminId);
    if (onBehalf) {
      effective = actorFromAdminUser(onBehalf);
      if (effective.adminId !== actor.adminId) {
        impersonationMode = "on_behalf";
      }
    }
  } else if (isViewAsActive(token)) {
    const effectiveUser = await getAdminUserById(effectiveParsed.adminId);
    if (effectiveUser) {
      effective = actorFromAdminUser(effectiveUser);
      if (effective.adminId !== actor.adminId) {
        impersonationMode = "view_as";
      }
    }
  } else {
    const effectiveUser = await getAdminUserById(effectiveParsed.adminId);
    if (effectiveUser) {
      effective = actorFromAdminUser(effectiveUser);
    }
  }

  const actorTimezone =
    tzOverride ??
    (await resolveTimezone(actingUser.sapId));

  return { actor, effective, impersonationMode, actorTimezone };
}

export function contextFromActors(
  actor: ActivityActorSnapshot,
  effective?: ActivityActorSnapshot,
  impersonationMode?: ImpersonationMode | null,
  actorTimezone = "UTC",
): ActivityContext {
  const eff = effective ?? actor;
  return {
    actor,
    effective: eff,
    impersonationMode:
      impersonationMode ??
      (actor.adminId !== eff.adminId ? "on_behalf" : null),
    actorTimezone,
  };
}
