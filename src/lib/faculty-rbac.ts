/**
 * Faculty member RBAC model.
 *
 * Faculty members are internal system entities sourced from SAP/ERP.
 * They are distinct from admin_users (administrators, supervisors, IREB officers).
 * A faculty member can hold one or more internal roles (e.g., supervisor).
 *
 * This file intentionally avoids UI/assignment logic; it only declares the
 * domain types and guards needed by authentication, sync, and future
 * supervisor assignment.
 */

export const FACULTY_MEMBER_STATUSES = ["active", "inactive"] as const;
export type FacultyMemberStatus = (typeof FACULTY_MEMBER_STATUSES)[number];

export const FACULTY_MEMBER_ROLES = ["supervisor"] as const;
export type FacultyMemberRole = (typeof FACULTY_MEMBER_ROLES)[number];

export const FACULTY_MEMBER_ROLE_STATUSES = ["active", "inactive"] as const;
export type FacultyMemberRoleStatus = (typeof FACULTY_MEMBER_ROLE_STATUSES)[number];

export type FacultyMemberRecord = {
  id: string;
  sapId: string;
  employeeId: string | null;
  name: string;
  email: string;
  faculty: string | null;
  department: string;
  program: string | null;
  designation: string | null;
  employeeType: string | null;
  status: FacultyMemberStatus;
  isGoogleSsoEnabled: boolean;
  lastLoginAt: Date | null;
  lastSyncedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FacultyMemberRoleRecord = {
  id: number;
  facultyMemberId: string;
  role: FacultyMemberRole;
  assignedBy: string | null;
  assignedAt: Date;
  status: FacultyMemberRoleStatus;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FacultyMemberWithRoles = FacultyMemberRecord & {
  roles: FacultyMemberRoleRecord[];
};

export function isFacultyMemberRole(value: string): value is FacultyMemberRole {
  return (FACULTY_MEMBER_ROLES as readonly string[]).includes(value);
}

export function isFacultyMemberStatus(value: string): value is FacultyMemberStatus {
  return (FACULTY_MEMBER_STATUSES as readonly string[]).includes(value);
}

export function isFacultyMemberRoleStatus(value: string): value is FacultyMemberRoleStatus {
  return (FACULTY_MEMBER_ROLE_STATUSES as readonly string[]).includes(value);
}
