import type { JWT } from "next-auth/jwt";
import type { AdminUserRecord } from "@/lib/admin-rbac";
import {
  buildAdminClaims,
  getAdminUserById,
} from "@/lib/admin-repository";
import { getFacultyMemberByEmail } from "@/lib/faculty-members";
import { verifyStudentBySapId } from "@/lib/sap-student";
import type { AuthenticatedAdmin } from "@/lib/admin-auth";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";
import type { NextRequest } from "next/server";

export type ViewAsSessionUpdate = {
  action?: "startViewAs" | "stopViewAs" | "startViewAsStudent";
  targetAdminId?: string;
  viewAsRole?: "hod" | "ireb";
  /** SAP ID of the student, when starting a student view-as session. */
  targetSapId?: string;
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
  if (!token?.viewAsActive || !token.actingAdminId) return false;
  // Admin view-as keeps the target's adminId (≠ actingAdminId). Student
  // view-as clears adminId entirely — still counts as an active session.
  if (token.viewAsTargetType === "student") return true;
  return token.adminId !== token.actingAdminId;
}

export async function buildViewAsTokenFields(
  target: AdminUserRecord,
): Promise<Partial<JWT> | null> {
  const claims = await buildAdminClaims(target);
  if (!claims) return null;
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
    viewAsTargetType: "admin",
  };
}

export type StudentViewAsTarget = {
  sapId: string;
  name: string;
  email: string;
  studentRecord?: Record<string, unknown>;
};

/**
 * Token fields for a student view-as session. The effective identity becomes
 * a real student session (same shape as a student login): sapId is the user
 * id, admin/faculty claims are cleared, and the acting administrator's
 * claims (actingAdminId/actingAdminRole/actingAdminTokenVersion) are kept
 * untouched so the session can be restored and audited.
 */
export function buildViewAsStudentTokenFields(
  student: StudentViewAsTarget,
): Partial<JWT> {
  return {
    sub: student.sapId,
    sapId: student.sapId,
    studentRecord: student.studentRecord,
    name: student.name,
    email: student.email,
    userType: "student",
    applicantRole: "student",
    adminId: undefined,
    adminRole: undefined,
    adminStatus: undefined,
    adminScopeMode: undefined,
    adminFacultyIds: undefined,
    adminTokenVersion: undefined,
    facultyMemberId: undefined,
    facultyId: undefined,
    departmentId: undefined,
    facultyDepartment: undefined,
    facultyDesignation: undefined,
    viewAsActive: true,
    viewAsUserName: student.name,
    viewAsTargetType: "student",
  };
}

/**
 * Rebuilds the administrator's own token identity after a view-as session.
 * Mirrors the claims produced by the credentials authorize() callback —
 * including the faculty/applicant fields that a student view-as clears —
 * so the restored session looks exactly like a fresh administrator login.
 */
export async function buildAdministratorRestoreTokenFields(
  actingAdminId: string,
): Promise<Partial<JWT> | null> {
  const admin = await getAdminUserById(actingAdminId);
  if (!admin || admin.role !== "administrator" || admin.status !== "active") {
    return null;
  }
  const claims = await buildAdminClaims(admin);
  if (!claims) return null;

  const faculty = admin.email
    ? await getFacultyMemberByEmail(admin.email, { includeInactive: true })
    : null;
  const activeFaculty =
    faculty && faculty.status === "active" && faculty.isActive ? faculty : null;

  return {
    sub: admin.id,
    adminId: claims.adminId,
    adminRole: claims.role,
    adminStatus: claims.status,
    adminScopeMode: claims.scopeMode,
    adminFacultyIds: claims.facultyIds,
    adminTokenVersion: claims.tokenVersion,
    name: admin.name,
    email: admin.email,
    sapId: activeFaculty?.sapId ?? admin.sapId ?? undefined,
    studentRecord: undefined,
    userType: activeFaculty ? "faculty" : undefined,
    applicantRole: activeFaculty ? "faculty" : undefined,
    facultyMemberId: activeFaculty?.id,
    facultyId: activeFaculty?.facultyId ?? undefined,
    departmentId: activeFaculty?.departmentId ?? undefined,
    facultyDepartment: activeFaculty?.department ?? undefined,
    facultyDesignation: activeFaculty?.designation ?? undefined,
    viewAsActive: false,
    viewAsUserName: undefined,
    viewAsTargetType: undefined,
  };
}

export async function validateViewAsTarget(
  actingAdminId: string,
  targetAdminId: string,
  expectedRole: "hod" | "ireb",
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
    return { ok: false, error: `Selected user is not an ${expectedRole === "hod" ? "HOD" : "IREB member"}.` };
  }

  return { ok: true, target };
}

export async function validateViewAsStudentTarget(
  actingAdminId: string,
  sapId: string,
): Promise<{ ok: true; student: StudentViewAsTarget } | { ok: false; error: string }> {
  const acting = await getAdminUserById(actingAdminId);
  if (!acting || acting.status !== "active" || acting.role !== "administrator") {
    return { ok: false, error: "Forbidden." };
  }

  const normalized = sapId.trim();
  if (!normalized) {
    return { ok: false, error: "Enter the student's SAP ID." };
  }

  const result = await verifyStudentBySapId(normalized);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.errorCode === "NOT_FOUND"
          ? "No student found for that SAP ID."
          : "Could not verify the student right now. Try again later.",
    };
  }

  return {
    ok: true,
    student: {
      sapId: result.sapId,
      name: result.studentName ?? result.sapId,
      email: result.email,
      studentRecord: result.studentRecord,
    },
  };
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
