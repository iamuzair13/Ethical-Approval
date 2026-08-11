import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/admin-rbac";
import { inferFacultyFromDepartment } from "@/lib/faculty-by-department";
import { resolveOrgFromDepartmentUncached } from "@/lib/org-mapping";
import type { NormalizedFacultyMember } from "@/lib/sap/faculty-filter";

// ─── Types ───
// These types were previously in faculty-rbac.ts. Since faculty-rbac.ts
// has been removed (roles now come from admin_users), the types are
// defined here in the repository module.

export type FacultyMemberStatus = "active" | "inactive";

export type FacultyMemberRecord = {
  id: string;
  userId: string | null;
  sapId: string;
  employeeId: string | null;
  employeeCode: string | null;
  name: string;
  email: string;
  faculty: string | null;
  department: string;
  program: string | null;
  designation: string | null;
  employeeType: string | null;
  employeeStatus: string | null;
  facultyId: number | null;
  departmentId: number | null;
  programId: number | null;
  status: FacultyMemberStatus;
  isActive: boolean;
  isGoogleSsoEnabled: boolean;
  lastLoginAt: Date | null;
  lastSyncedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type FacultyMemberRow = {
  id: string;
  user_id: string | null;
  sap_id: string;
  employee_id: string | null;
  employee_code: string | null;
  name: string;
  email: string;
  faculty: string | null;
  department: string;
  program: string | null;
  designation: string | null;
  employee_type: string | null;
  employee_status: string | null;
  faculty_id: number | null;
  department_id: number | null;
  program_id: number | null;
  status: FacultyMemberStatus;
  is_active: boolean;
  is_google_sso_enabled: boolean;
  last_login_at: Date | null;
  last_synced_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapFacultyMemberRow(row: FacultyMemberRow): FacultyMemberRecord {
  return {
    id: row.id,
    userId: row.user_id,
    sapId: row.sap_id,
    employeeId: row.employee_id,
    employeeCode: row.employee_code,
    name: row.name,
    email: row.email,
    faculty: row.faculty,
    department: row.department,
    program: row.program,
    designation: row.designation,
    employeeType: row.employee_type,
    employeeStatus: row.employee_status,
    facultyId: row.faculty_id,
    departmentId: row.department_id,
    programId: row.program_id,
    status: row.status,
    isActive: row.is_active,
    isGoogleSsoEnabled: row.is_google_sso_enabled,
    lastLoginAt: row.last_login_at,
    lastSyncedAt: row.last_synced_at,
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

/**
 * Finds an existing active faculty member by normalized email prefix (the
 * part before @). SAP often has multiple employee records for the same
 * person with different email domains (e.g. muhammad.usman@cs.uol.edu.pk
 * and muhammad.usman@math.uol.edu.pk). This function detects those
 * duplicates so the sync can skip them instead of creating new records.
 *
 * Returns the existing record, or null if no match is found.
 */
export async function getFacultyMemberByEmailPrefix(
  email: string,
): Promise<FacultyMemberRecord | null> {
  const normalized = email.trim().toLowerCase();
  const atIdx = normalized.indexOf("@");
  if (atIdx <= 0) return null;
  const prefix = normalized.slice(0, atIdx);

  const result = await db.query<FacultyMemberRow>(
    `
      SELECT *
      FROM faculty_members
      WHERE LOWER(SPLIT_PART(LOWER(TRIM(email)), '@', 1)) = $1
        AND deleted_at IS NULL
      ORDER BY last_synced_at DESC NULLS LAST, created_at ASC
      LIMIT 1
    `,
    [prefix],
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
 * Returns a faculty member by their linked admin_users ID.
 */
export async function getFacultyMemberByUserId(
  userId: string,
): Promise<FacultyMemberRecord | null> {
  const result = await db.query<FacultyMemberRow>(
    `
      SELECT *
      FROM faculty_members
      WHERE user_id = $1
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [userId],
  );

  return result.rows[0] ? mapFacultyMemberRow(result.rows[0]) : null;
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
 * Upserts a faculty member from a single SAP verification (login flow).
 * Resolves faculty_id and department_id from the existing DB hierarchy using
 * the reusable org-mapping service. Falls back to text inference only if the
 * department cannot be matched (existing record keeps its org IDs).
 */
export async function upsertFacultyMemberFromSap(
  input: FacultyMemberSapInput,
): Promise<FacultyMemberRecord> {
  const email = normalizeEmail(input.email);
  const sapId = input.sapId.trim();
  const department = input.department.trim() || "Unknown Department";

  // Resolve org IDs from the DB hierarchy (departments → faculties)
  const orgResult = await resolveOrgFromDepartmentUncached(department);
  const facultyId = orgResult.ok ? orgResult.facultyId : null;
  const departmentId = orgResult.ok ? orgResult.departmentId : null;
  const faculty = orgResult.ok
    ? (orgResult.facultyName ?? inferFacultyFromDepartment(department) ?? "Unknown Faculty")
    : (inferFacultyFromDepartment(department) ?? "Unknown Faculty");

  const existing = await getFacultyMemberBySapId(sapId);

  // Also check by email prefix — SAP may have multiple employee records
  // for the same person with different email domains (e.g. @cs vs @math).
  // If we find an existing record by email prefix but not by SAP ID, it
  // means this is a duplicate SAP record for the same person. We update
  // the existing record's SAP ID instead of creating a new row.
  const existingByEmailPrefix = !existing
    ? await getFacultyMemberByEmailPrefix(email)
    : null;

  if (existingByEmailPrefix && !existing) {
    const result = await db.query<FacultyMemberRow>(
      `
        UPDATE faculty_members
        SET
          sap_id = $2,
          employee_id = COALESCE($3, employee_id),
          name = $4,
          email = $5,
          faculty = COALESCE(NULLIF($6, ''), faculty),
          department = $7,
          designation = COALESCE($8, designation),
          employee_type = COALESCE($9, employee_type),
          faculty_id = COALESCE($10, faculty_id),
          department_id = COALESCE($11, department_id),
          status = 'active',
          is_active = TRUE,
          last_synced_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
          AND deleted_at IS NULL
        RETURNING *
      `,
      [
        existingByEmailPrefix.id,
        sapId,
        input.employeeId ?? null,
        input.name.trim() || existingByEmailPrefix.name,
        email,
        faculty,
        department,
        input.designation?.trim() ?? null,
        input.employeeType?.trim() ?? null,
        facultyId,
        departmentId,
      ],
    );
    return mapFacultyMemberRow(result.rows[0]);
  }

  if (existing) {
    const result = await db.query<FacultyMemberRow>(
      `
        UPDATE faculty_members
        SET
          employee_id = COALESCE($2, employee_id),
          name = $3,
          email = $4,
          faculty = COALESCE(NULLIF($5, ''), faculty),
          department = $6,
          designation = COALESCE($7, designation),
          employee_type = COALESCE($8, employee_type),
          faculty_id = COALESCE($9, faculty_id),
          department_id = COALESCE($10, department_id),
          status = 'active',
          is_active = TRUE,
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
        facultyId,
        departmentId,
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
        faculty_id,
        department_id,
        status,
        is_active,
        last_synced_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', TRUE, NOW(), NOW(), NOW())
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
      facultyId,
      departmentId,
    ],
  );

  return mapFacultyMemberRow(result.rows[0]);
}

/**
 * Upserts a faculty member from the bulk SAP sync pipeline.
 * This path includes resolved organization FK IDs (faculty_id, department_id),
 * employee_code, employee_status, and is_active flag.
 *
 * SAP may have multiple employee records (different SAP IDs) sharing the same
 * email address. Since email is the login key and has a case-insensitive unique
 * constraint, we use ON CONFLICT on the email index to atomically handle all
 * cases in a single query:
 *   - New email → INSERT
 *   - Existing email (same or different sap_id) → UPDATE (including sap_id)
 *
 * Additionally, SAP may have multiple employee records for the same person
 * with DIFFERENT email domains (e.g. muhammad.usman@cs.uol.edu.pk and
 * muhammad.usman@math.uol.edu.pk). Before inserting, we check if a faculty
 * member with the same email prefix (part before @) already exists. If so,
 * we skip the insert and return the existing record to prevent duplicates.
 *
 * The unique index is: uq_faculty_members_email_lower ON (LOWER(email)) WHERE deleted_at IS NULL
 */
export async function upsertFacultyMemberFromSync(
  normalized: NormalizedFacultyMember,
): Promise<FacultyMemberRecord> {
  const email = normalized.email.toLowerCase();
  const sapId = normalized.sapId.trim();
  const department = normalized.departmentText || "Unknown Department";
  const faculty = normalized.facultyText || "Unknown Faculty";

  // Check if a faculty member with the same email prefix already exists
  // (different email domain but same person). If so, skip this record to
  // prevent duplicates. The ON CONFLICT below only catches exact email
  // matches, not email-prefix matches.
  const existingByEmailPrefix = await getFacultyMemberByEmailPrefix(email);
  if (existingByEmailPrefix) {
    // Update the existing record's last_synced_at to keep it fresh,
    // but don't overwrite its SAP ID or department — the first record
    // wins (first-write-wins policy).
    await db.query(
      `UPDATE faculty_members
       SET last_synced_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL`,
      [existingByEmailPrefix.id],
    );
    return existingByEmailPrefix;
  }

  const result = await db.query<FacultyMemberRow>(
    `
      INSERT INTO faculty_members (
        sap_id,
        employee_code,
        name,
        email,
        faculty,
        department,
        designation,
        employee_status,
        employee_type,
        faculty_id,
        department_id,
        status,
        is_active,
        last_synced_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', $12, NOW(), NOW(), NOW())
      ON CONFLICT (LOWER(email)) WHERE deleted_at IS NULL DO UPDATE SET
        sap_id = EXCLUDED.sap_id,
        employee_code = COALESCE(EXCLUDED.employee_code, faculty_members.employee_code),
        name = EXCLUDED.name,
        faculty = EXCLUDED.faculty,
        department = EXCLUDED.department,
        designation = COALESCE(EXCLUDED.designation, faculty_members.designation),
        employee_status = COALESCE(EXCLUDED.employee_status, faculty_members.employee_status),
        employee_type = COALESCE(EXCLUDED.employee_type, faculty_members.employee_type),
        faculty_id = EXCLUDED.faculty_id,
        department_id = EXCLUDED.department_id,
        is_active = EXCLUDED.is_active,
        status = 'active',
        last_synced_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `,
    [
      sapId,
      normalized.employeeCode,
      normalized.name || "Unknown Faculty Member",
      email,
      faculty,
      department,
      normalized.designation,
      normalized.employeeStatus,
      normalized.employeeType,
      normalized.facultyId,
      normalized.departmentId,
      normalized.isActive,
    ],
  );

  return mapFacultyMemberRow(result.rows[0]);
}

/**
 * Links a faculty_members record to its corresponding admin_users record.
 */
export async function linkFacultyMemberToUser(
  facultyMemberId: string,
  userId: string,
): Promise<void> {
  await db.query(
    `
      UPDATE faculty_members
      SET user_id = $2, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `,
    [facultyMemberId, userId],
  );
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
