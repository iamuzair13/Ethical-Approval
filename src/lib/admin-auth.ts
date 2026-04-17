import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import { getAdminUserById } from "@/lib/admin-repository";

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

function parseAdminFromToken(token: JWT | null): AuthenticatedAdmin | null {
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

export async function getAdminFromRequest(
  request: NextRequest | Request,
): Promise<AuthenticatedAdmin | null> {
  const token = await getToken({
    req: request as NextRequest,
    secret: getAuthSecret(),
  });
  return parseAdminFromToken(token);
}

export async function assertActiveAdmin(request: NextRequest | Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin || admin.status !== "active") {
    return null;
  }

  const latest = await getAdminUserById(admin.adminId);
  if (!latest || latest.status !== "active" || latest.tokenVersion !== admin.tokenVersion) {
    return null;
  }
  return admin;
}

export function isAdministrator(admin: AuthenticatedAdmin) {
  return admin.role === "administrator";
}
