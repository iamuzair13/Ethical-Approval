import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import { getAdminUserById } from "@/lib/admin-repository";
import { isViewAsActive } from "@/lib/view-as";

export type AuthenticatedAdmin = {
  adminId: string;
  role: "administrator" | "dean" | "ireb";
  status: "active" | "inactive";
  scopeMode: "all" | "restricted";
  facultyIds: number[];
  tokenVersion: number;
};

export function normalizeFacultyIds(rawFacultyIds: unknown): number[] {
  if (!Array.isArray(rawFacultyIds)) return [];

  const normalized = rawFacultyIds
    .map((id) => {
      if (typeof id === "number" && Number.isInteger(id)) return id;
      if (typeof id === "string" && id.trim()) {
        const parsed = Number.parseInt(id.trim(), 10);
        return Number.isInteger(parsed) ? parsed : null;
      }
      return null;
    })
    .filter((id): id is number => id !== null);

  return Array.from(new Set(normalized));
}

export function parseEffectiveAdmin(token: JWT | null): AuthenticatedAdmin | null {
  if (!token?.adminId || !token.adminRole || !token.adminStatus) {
    return null;
  }

  if (
    token.adminRole !== "administrator" &&
    token.adminRole !== "dean" &&
    token.adminRole !== "ireb"
  ) {
    return null;
  }

  return {
    adminId: String(token.adminId),
    role: token.adminRole,
    status: token.adminStatus === "inactive" ? "inactive" : "active",
    scopeMode: token.adminScopeMode === "restricted" ? "restricted" : "all",
    facultyIds: normalizeFacultyIds(token.adminFacultyIds),
    tokenVersion:
      typeof token.adminTokenVersion === "number" ? token.adminTokenVersion : 0,
  };
}

export function parseActingAdmin(token: JWT | null): AuthenticatedAdmin | null {
  if (!token?.adminId || !token.adminRole) {
    return null;
  }

  const actingAdminId = String(token.actingAdminId ?? token.adminId);
  const actingRole = token.actingAdminRole ?? token.adminRole;
  const actingTokenVersion =
    typeof token.actingAdminTokenVersion === "number"
      ? token.actingAdminTokenVersion
      : typeof token.adminTokenVersion === "number"
        ? token.adminTokenVersion
        : 0;

  if (
    actingRole !== "administrator" &&
    actingRole !== "dean" &&
    actingRole !== "ireb"
  ) {
    return null;
  }

  return {
    adminId: actingAdminId,
    role: actingRole,
    status: token.adminStatus === "inactive" ? "inactive" : "active",
    scopeMode: "all",
    facultyIds: [],
    tokenVersion: actingTokenVersion,
  };
}

export function adminFromSession(session: Session | null): AuthenticatedAdmin | null {
  if (!session?.user?.adminId || !session.user.adminRole || !session.user.adminStatus) {
    return null;
  }

  return {
    adminId: session.user.adminId,
    role: session.user.adminRole,
    status: session.user.adminStatus === "inactive" ? "inactive" : "active",
    scopeMode: session.user.adminScopeMode === "restricted" ? "restricted" : "all",
    facultyIds: normalizeFacultyIds(session.user.adminFacultyIds),
    tokenVersion: 0,
  };
}

export function isActingAdministrator(token: JWT | null): boolean {
  if (!token?.adminId) return false;
  const actingRole = token.actingAdminRole ?? token.adminRole;
  return actingRole === "administrator";
}

async function getTokenFromRequest(request: NextRequest | Request) {
  return getToken({
    req: request as NextRequest,
    secret: getAuthSecret(),
  });
}

export async function getAdminFromRequest(
  request: NextRequest | Request,
): Promise<AuthenticatedAdmin | null> {
  const token = await getTokenFromRequest(request);
  return parseEffectiveAdmin(token);
}

export async function getActingAdminFromRequest(
  request: NextRequest | Request,
): Promise<AuthenticatedAdmin | null> {
  const token = await getTokenFromRequest(request);
  return parseActingAdmin(token);
}

export async function assertActiveAdmin(request: NextRequest | Request) {
  const token = await getTokenFromRequest(request);
  const effective = parseEffectiveAdmin(token);
  if (!effective || effective.status !== "active") {
    return null;
  }

  const actingAdminId = String(token?.actingAdminId ?? token?.adminId ?? "");
  if (!actingAdminId) return null;

  const actingLatest = await getAdminUserById(actingAdminId);
  const actingTokenVersion =
    typeof token?.actingAdminTokenVersion === "number"
      ? token.actingAdminTokenVersion
      : typeof token?.adminTokenVersion === "number"
        ? token.adminTokenVersion
        : 0;

  if (
    !actingLatest ||
    actingLatest.status !== "active" ||
    actingLatest.tokenVersion !== actingTokenVersion
  ) {
    return null;
  }

  if (isViewAsActive(token)) {
    const effectiveLatest = await getAdminUserById(effective.adminId);
    if (!effectiveLatest || effectiveLatest.status !== "active") {
      return null;
    }
  } else {
    const latest = await getAdminUserById(effective.adminId);
    if (!latest || latest.status !== "active" || latest.tokenVersion !== effective.tokenVersion) {
      return null;
    }
  }

  return effective;
}

export function isAdministrator(admin: AuthenticatedAdmin) {
  return admin.role === "administrator";
}
