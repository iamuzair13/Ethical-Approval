export const ADMIN_ROLES = ["administrator", "dean", "ireb"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_STATUSES = ["active", "inactive"] as const;
export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export type ScopeMode = "all" | "restricted";

export type AdminScope = {
  scopeMode: ScopeMode;
  facultyIds: number[];
};

export type AdminAuthClaims = {
  adminId: string;
  role: AdminRole;
  status: AdminStatus;
  scopeMode: ScopeMode;
  facultyIds: number[];
  tokenVersion: number;
};

export type AdminUserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  status: AdminStatus;
  sapId: string | null;
  facultyId: number | null;
  createdBy: string | null;
  tokenVersion: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeSapFacultyValue(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(value);
}
