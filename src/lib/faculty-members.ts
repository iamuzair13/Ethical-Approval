import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/admin-rbac";
import { inferFacultyFromDepartment } from "@/lib/faculty-by-department";
import type {
  FacultyMemberRecord,
  FacultyMemberRoleRecord,
  FacultyMemberStatus,
  FacultyMemberWithRoles,
} from "@/lib/faculty-rbac";

type FacultyMemberRow = {
  id: string;
  sap_id: string;
  employee_id: string | null;
  name: string;
  email: string;
  faculty: string | null;
  department: string;
  program: string | null;
  designation: string | null;
  employee_type: string | null;
  status: FacultyMemberStatus;
  is_google_sso_enabled: boolean;
  last_login_at: Date | null;
  last_synced_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type FacultyMemberRoleRow = {
  id: number;
  faculty_member_id: string;
  role: "supervisor";
  assigned_by: string | null;
  assigned_at: Date;
  status: "active" | "inactive";
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapFacultyMemberRow(row: FacultyMemberRow): FacultyMemberRecord {
  return {
    id: row.id,
    sapId: row.sap_id,
    employeeId: row.employee_id,
    name: row.name,
    email: row.email,
    faculty: row.faculty,
    department: row.department,
    program: row.program,
    designation: row.designation,
    employeeType: row.employee_type,
    status: row.status,
    isGoogleSsoEnabled: row.is_google_sso_enabled,
    lastLoginAt: row.last_login_at,
    lastSyncedAt: row.last_synced_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFacultyMemberRoleRow(row: FacultyMemberRoleRow): FacultyMemberRoleRecord {
  return {
    id: row.id,
    facultyMemberId: row.faculty_member_id,
    role: row.role,
    assignedBy: row.assigned_by,
    assignedAt: row.assigned_at,
    status: row.status,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getFacultyMemberByEmail(
  email: string,
  opts?: { includeInactive?: boolean },
): Promise<FacultyMemberRecord | null> {
  const result = await db.query<FacultyMemberRow>(
    `
      SELECT *
      FROM faculty_members
      WHERE lower(email) = $1
        ${opts?.includeInactive ? "" : "AND status = 'active'"}
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [normalizeEmail(email)],
  );

  return result.rows[0] ? mapFacultyMemberRow(result.rows[0]) : null;
}

export async function getFacultyMemberBySapId(
  sapId: string,
): Promise<FacultyMemberRecord | null> {
  const result = await db.query<FacultyMemberRow>(
    `
      SELECT *
      FROM faculty_members
      WHERE sap_id = $1
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [sapId.trim()],
  );

  return result.rows[0] ? mapFacultyMemberRow(result.rows[0]) : null;
}

export async function getFacultyMemberById(
  id: string,
): Promise<FacultyMemberRecord | null> {
  const result = await db.query<FacultyMemberRow>(
    `
      SELECT *
      FROM faculty_members
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [id],
  );

  return result.rows[0] ? mapFacultyMemberRow(result.rows[0]) : null;
}

/**
 * Returns active faculty members with their current role assignments.
 * Used for future supervisor management and session building.
 */
export async function getFacultyMemberWithRoles(
  id: string,
): Promise<FacultyMemberWithRoles | null> {
  const member = await getFacultyMemberById(id);
  if (!member) return null;

  const rolesResult = await db.query<FacultyMemberRoleRow>(
    `
      SELECT *
      FROM faculty_member_roles
      WHERE faculty_member_id = $1
        AND deleted_at IS NULL
      ORDER BY created_at DESC
    `,
    [id],
  );

  return {
    ...member,
    roles: rolesResult.rows.map(mapFacultyMemberRoleRow),
  };
}

export type FacultyMemberSapInput = {
  sapId: string;
  employeeId?: string | null;
  name: string;
  email: string;
  department: string;
  designation?: string | null;
  employeeType?: string | null;
};

/**
 * Upserts a faculty member from SAP data.
 * Infers faculty from department when SAP does not provide it directly.
 * Does not delete or inactivate missing records.
 */
export async function upsertFacultyMemberFromSap(
  input: FacultyMemberSapInput,
): Promise<FacultyMemberRecord> {
  const email = normalizeEmail(input.email);
  const sapId = input.sapId.trim();
  const department = input.department.trim() || "Unknown Department";
  const faculty =
    inferFacultyFromDepartment(department) || "Unknown Faculty";

  const existing = await getFacultyMemberBySapId(sapId);

  if (existing) {
    const result = await db.query<FacultyMemberRow>(
      `
        UPDATE faculty_members
        SET
          employee_id = COALESCE($2, employee_id),
          name = $3,
          email = $4,
          faculty = COALESCE($5, faculty),
          department = $6,
          designation = COALESCE($7, designation),
          employee_type = COALESCE($8, employee_type),
          status = 'active',
          last_synced_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
          AND deleted_at IS NULL
        RETURNING *
      `,
      [
        existing.id,
        input.employeeId ?? null,
        input.name.trim() || existing.name,
        email,
        faculty,
        department,
        input.designation?.trim() ?? null,
        input.employeeType?.trim() ?? null,
      ],
    );
    return mapFacultyMemberRow(result.rows[0]);
  }

  const result = await db.query<FacultyMemberRow>(
    `
      INSERT INTO faculty_members (
        sap_id,
        employee_id,
        name,
        email,
        faculty,
        department,
        designation,
        employee_type,
        status,
        last_synced_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW(), NOW(), NOW())
      RETURNING *
    `,
    [
      sapId,
      input.employeeId ?? null,
      input.name.trim() || "Unknown Faculty Member",
      email,
      faculty,
      department,
      input.designation?.trim() ?? null,
      input.employeeType?.trim() ?? null,
    ],
  );

  return mapFacultyMemberRow(result.rows[0]);
}

/**
 * Legacy helper retained for existing call sites.
 * Returns an active faculty member by email.
 */
export async function getActiveFacultyMemberByEmail(
  email: string,
): Promise<FacultyMemberRecord | null> {
  return getFacultyMemberByEmail(email);
}
