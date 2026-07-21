import type { JWT } from "next-auth/jwt";
import type { AdminUserRecord } from "@/lib/admin-rbac";
import {
  buildAdminClaims,
  getAdminUserById,
} from "@/lib/admin-repository";
import type { AuthenticatedAdmin } from "@/lib/admin-auth";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";
import type { NextRequest } from "next/server";

export type ViewAsSessionUpdate = {
  action?: "startViewAs" | "stopViewAs";
  targetAdminId?: string;
  viewAsRole?: "supervisor" | "ireb";
};

export type ViewAsPickerRow = {
  id: string;
  name: string;
  email: string;
};

export function formatViewAsAuditNote(
  administratorName: string,
  viewedAsName: string,
): string {
  return `Action performed by administrator ${administratorName} while viewing as ${viewedAsName}.`;
}

export function stripViewAsAuditNote(comment: string | null): string | null {
  if (!comment) return null;
  const cleaned = comment
    .replace(
      /(?:^|\n)\s*Action performed by administrator .*? while viewing as .*?\.\s*(?=\n|$)/g,
      "",
    )
    .trim();
  return cleaned || null;
}

export function isViewAsActive(token: JWT | null): boolean {
  return Boolean(token?.viewAsActive && token.actingAdminId && token.adminId !== token.actingAdminId);
}

export async function buildViewAsTokenFields(
  target: AdminUserRecord,
): Promise<Partial<JWT>> {
  const claims = await buildAdminClaims(target);
  return {
    adminId: claims.adminId,
    adminRole: claims.role,
    adminStatus: claims.status,
    adminScopeMode: claims.scopeMode,
    adminFacultyIds: claims.facultyIds,
    adminTokenVersion: claims.tokenVersion,
    name: target.name,
    email: target.email,
    sapId: target.sapId ?? undefined,
    viewAsActive: true,
    viewAsUserName: target.name,
  };
}

export async function buildAdministratorRestoreTokenFields(
  actingAdminId: string,
): Promise<Partial<JWT> | null> {
  const admin = await getAdminUserById(actingAdminId);
  if (!admin || admin.role !== "administrator" || admin.status !== "active") {
    return null;
  }
  const claims = await buildAdminClaims(admin);
  return {
    adminId: claims.adminId,
    adminRole: claims.role,
    adminStatus: claims.status,
    adminScopeMode: claims.scopeMode,
    adminFacultyIds: claims.facultyIds,
    adminTokenVersion: claims.tokenVersion,
    name: admin.name,
    email: admin.email,
    sapId: admin.sapId ?? undefined,
    viewAsActive: false,
    viewAsUserName: undefined,
  };
}

export async function validateViewAsTarget(
  actingAdminId: string,
  targetAdminId: string,
  expectedRole: "supervisor" | "ireb",
): Promise<{ ok: true; target: AdminUserRecord } | { ok: false; error: string }> {
  if (actingAdminId === targetAdminId) {
    return { ok: false, error: "Cannot view as yourself." };
  }

  const acting = await getAdminUserById(actingAdminId);
  if (!acting || acting.status !== "active" || acting.role !== "administrator") {
    return { ok: false, error: "Forbidden." };
  }

  const target = await getAdminUserById(targetAdminId);
  if (!target || target.status !== "active") {
    return { ok: false, error: "Selected user is not available." };
  }
  if (target.role !== expectedRole) {
    return { ok: false, error: `Selected user is not an ${expectedRole === "supervisor" ? "Supervisor" : "IREB member"}.` };
  }

  return { ok: true, target };
}

export type DecisionRecorderContext = {
  isViewAs: boolean;
  recorderSapId: string;
  recorderName: string;
  auditNote: string | null;
  viewedAsName: string | null;
};

export async function resolveDecisionRecorder(
  request: NextRequest | Request,
  effectiveAdmin: AuthenticatedAdmin,
): Promise<DecisionRecorderContext | null> {
  const token = await getToken({
    req: request as NextRequest,
    secret: getAuthSecret(),
  });
  if (!token?.adminId) return null;

  const actingAdminId = String(token.actingAdminId ?? token.adminId);
  const viewAs = isViewAsActive(token);

  if (!viewAs) {
    const effectiveUser = await getAdminUserById(effectiveAdmin.adminId);
    if (!effectiveUser) return null;
    return {
      isViewAs: false,
      recorderSapId: effectiveUser.sapId ?? effectiveUser.id,
      recorderName: effectiveUser.name,
      auditNote: null,
      viewedAsName: null,
    };
  }

  const actingUser = await getAdminUserById(actingAdminId);
  const viewedAsUser = await getAdminUserById(effectiveAdmin.adminId);
  if (!actingUser || !viewedAsUser) return null;

  return {
    isViewAs: true,
    recorderSapId: actingUser.sapId ?? actingUser.id,
    recorderName: actingUser.name,
    auditNote: formatViewAsAuditNote(actingUser.name, viewedAsUser.name),
    viewedAsName: viewedAsUser.name,
  };
}
