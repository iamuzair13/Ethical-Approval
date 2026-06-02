import { db } from "@/lib/db";
import type {
  AdminAuthClaims,
  AdminRole,
  AdminScope,
  AdminUserRecord,
} from "@/lib/admin-rbac";
import { normalizeEmail, normalizeSapFacultyValue } from "@/lib/admin-rbac";

type AdminRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: AdminRole;
  status: "active" | "inactive";
  sap_id: string | null;
  faculty_id: number | null;
  created_by: string | null;
  token_version: number;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapAdminRow(row: AdminRow): AdminUserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    status: row.status,
    sapId: row.sap_id,
    facultyId: row.faculty_id,
    createdBy: row.created_by,
    tokenVersion: row.token_version,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAdminUserByEmail(
  email: string,
): Promise<AdminUserRecord | null> {
  const result = await db.query<AdminRow>(
    `
      SELECT *
      FROM admin_users
      WHERE email = $1
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [normalizeEmail(email)],
  );

  return result.rows[0] ? mapAdminRow(result.rows[0]) : null;
}

export async function getAdminUserById(
  adminId: string,
): Promise<AdminUserRecord | null> {
  const result = await db.query<AdminRow>(
    `
      SELECT *
      FROM admin_users
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [adminId],
  );
  return result.rows[0] ? mapAdminRow(result.rows[0]) : null;
}

export async function getAdminScope(admin: AdminUserRecord): Promise<AdminScope> {
  if (admin.role === "administrator") {
    return { scopeMode: "all", facultyIds: [] };
  }

  if (admin.role === "dean") {
    const deptScoped = await db.query<{ faculty_id: number }>(
      `
        SELECT ada.faculty_id
        FROM admin_department_assignments ada
        WHERE ada.admin_user_id = $1
          AND ada.assignment_type = 'dean_primary'
          AND ada.deleted_at IS NULL
        ORDER BY ada.id DESC
        LIMIT 1
      `,
      [admin.id],
    );
    const result = await db.query<{ faculty_id: number }>(
      `
        SELECT afa.faculty_id
        FROM admin_faculty_assignments afa
        WHERE afa.admin_user_id = $1
          AND afa.assignment_type = 'dean_primary'
          AND afa.deleted_at IS NULL
        ORDER BY afa.id DESC
        LIMIT 1
      `,
      [admin.id],
    );
    const facultyId =
      deptScoped.rows[0]?.faculty_id ?? result.rows[0]?.faculty_id ?? admin.facultyId;
    return {
      scopeMode: "restricted",
      facultyIds: facultyId ? [facultyId] : [],
    };
  }

  const assigned = await db.query<{ faculty_id: number }>(
    `
      SELECT DISTINCT afa.faculty_id
      FROM admin_faculty_assignments afa
      WHERE afa.admin_user_id = $1
        AND afa.assignment_type = 'ireb_scope'
        AND afa.deleted_at IS NULL
      ORDER BY afa.faculty_id
    `,
    [admin.id],
  );
  const facultyIds = assigned.rows.map((row: { faculty_id: number }) => row.faculty_id);
  if (facultyIds.length === 0) {
    return { scopeMode: "all", facultyIds: [] };
  }
  return { scopeMode: "restricted", facultyIds };
}

export async function resolveFacultyIdsFromSnapshotValue(
  sapFacultyValue: string,
): Promise<number[]> {
  const normalized = normalizeSapFacultyValue(sapFacultyValue);
  const aliasResult = await db.query<{ faculty_id: number }>(
    `
      SELECT faculty_id
      FROM faculty_sap_aliases
      WHERE sap_value_normalized = $1
    `,
    [normalized],
  );
  if (aliasResult.rowCount && aliasResult.rowCount > 0) {
    return aliasResult.rows.map((row: { faculty_id: number }) => row.faculty_id);
  }

  // Fallback: match snapshot faculty text against master faculties table even when
  // alias rows are not seeded (e.g., "Faculty of Pharmacy" vs "Pharmacy").
  const faculties = await db.query<{ id: number; name: string; code: string }>(
    `
      SELECT f.id, f.name, f.code
      FROM faculties f
      WHERE f.is_active = TRUE
    `,
  );

  const normalizeLoose = (value: string) =>
    normalizeSapFacultyValue(value)
      .replace(/^FACULTY OF\s+/i, "")
      .replace(/^FACULTY\s+/i, "")
      .trim();

  const snapshotValue = normalizeLoose(normalized);
  const matchedIds = new Set<number>();

  for (const row of faculties.rows) {
    const byName = normalizeLoose(row.name);
    const byCode = normalizeLoose(row.code);
    const variants = [byName, byCode].filter(Boolean);

    const isMatch = variants.some(
      (candidate) =>
        candidate === snapshotValue ||
        candidate.includes(snapshotValue) ||
        snapshotValue.includes(candidate),
    );

    if (isMatch) matchedIds.add(row.id);
  }

  return Array.from(matchedIds);
}

export async function createAdminUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  sapId?: string | null;
  facultyId?: number | null;
  createdBy: string;
}) {
  const result = await db.query<AdminRow>(
    `
      INSERT INTO admin_users (
        name,
        email,
        password_hash,
        role,
        status,
        sap_id,
        faculty_id,
        created_by
      )
      VALUES ($1, $2, $3, $4, 'active', $5, $6, $7)
      RETURNING *
    `,
    [
      input.name.trim(),
      normalizeEmail(input.email),
      input.passwordHash,
      input.role,
      input.sapId ?? null,
      input.facultyId ?? null,
      input.createdBy,
    ],
  );

  return mapAdminRow(result.rows[0]);
}

export async function setAdminStatus(adminId: string, status: "active" | "inactive") {
  const result = await db.query<AdminRow>(
    `
      UPDATE admin_users
      SET status = $2,
          updated_at = NOW(),
          token_version = token_version + 1
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING *
    `,
    [adminId, status],
  );
  return result.rows[0] ? mapAdminRow(result.rows[0]) : null;
}

export async function assignDeanFaculty(input: {
  adminUserId: string;
  facultyId: number;
  departmentId: number;
  assignedBy: string;
}) {
  await db.query("BEGIN");
  try {
    await db.query(
      `
        UPDATE admin_faculty_assignments
        SET deleted_at = NOW()
        WHERE admin_user_id = $1
          AND assignment_type = 'dean_primary'
          AND deleted_at IS NULL
      `,
      [input.adminUserId],
    );

    await db.query(
      `
        UPDATE admin_department_assignments
        SET deleted_at = NOW()
        WHERE admin_user_id = $1
          AND assignment_type = 'dean_primary'
          AND deleted_at IS NULL
      `,
      [input.adminUserId],
    );

    await db.query(
      `
        INSERT INTO admin_faculty_assignments (
          admin_user_id,
          faculty_id,
          assignment_type,
          assigned_by
        ) VALUES ($1, $2, 'dean_primary', $3)
      `,
      [input.adminUserId, input.facultyId, input.assignedBy],
    );

    await db.query(
      `
        INSERT INTO admin_department_assignments (
          admin_user_id,
          faculty_id,
          department_id,
          assignment_type,
          assigned_by
        ) VALUES ($1, $2, $3, 'dean_primary', $4)
      `,
      [input.adminUserId, input.facultyId, input.departmentId, input.assignedBy],
    );

    await db.query(
      `
        UPDATE admin_users
        SET faculty_id = $2,
            updated_at = NOW(),
            token_version = token_version + 1
        WHERE id = $1
      `,
      [input.adminUserId, input.facultyId],
    );

    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}

export async function assignIrebFaculties(input: {
  adminUserId: string;
  facultyIds: number[];
  assignedBy: string;
}) {
  await db.query("BEGIN");
  try {
    await db.query(
      `
        UPDATE admin_department_assignments
        SET deleted_at = NOW()
        WHERE admin_user_id = $1
          AND assignment_type = 'ireb_scope'
          AND deleted_at IS NULL
      `,
      [input.adminUserId],
    );

    await db.query(
      `
        UPDATE admin_faculty_assignments
        SET deleted_at = NOW()
        WHERE admin_user_id = $1
          AND assignment_type = 'ireb_scope'
          AND deleted_at IS NULL
      `,
      [input.adminUserId],
    );

    const uniqueFacultyIds = Array.from(new Set(input.facultyIds));
    for (const facultyId of uniqueFacultyIds) {
      await db.query(
        `
          INSERT INTO admin_faculty_assignments (
            admin_user_id,
            faculty_id,
            assignment_type,
            assigned_by
          ) VALUES ($1, $2, 'ireb_scope', $3)
        `,
        [input.adminUserId, facultyId, input.assignedBy],
      );
    }

    await db.query(
      `
        UPDATE admin_users
        SET updated_at = NOW(),
            token_version = token_version + 1
        WHERE id = $1
      `,
      [input.adminUserId],
    );

    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}

export async function applyIrebScope(input: {
  adminUserId: string;
  facultyIds: number[];
  assignedBy: string;
}) {
  await assignIrebFaculties({
    adminUserId: input.adminUserId,
    facultyIds: input.facultyIds,
    assignedBy: input.assignedBy,
  });
}

/** Removes all faculty/department scope rows for an admin (e.g. role → administrator). */
export async function clearAdminScopeAssignments(adminUserId: string) {
  await db.query("BEGIN");
  try {
    await db.query(
      `
        UPDATE admin_faculty_assignments
        SET deleted_at = NOW()
        WHERE admin_user_id = $1
          AND deleted_at IS NULL
      `,
      [adminUserId],
    );
    await db.query(
      `
        UPDATE admin_department_assignments
        SET deleted_at = NOW()
        WHERE admin_user_id = $1
          AND deleted_at IS NULL
      `,
      [adminUserId],
    );
    await db.query(
      `
        UPDATE admin_users
        SET faculty_id = NULL,
            updated_at = NOW(),
            token_version = token_version + 1
        WHERE id = $1
      `,
      [adminUserId],
    );
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}

export async function buildAdminClaims(
  admin: AdminUserRecord,
): Promise<AdminAuthClaims> {
  const scope = await getAdminScope(admin);
  return {
    adminId: admin.id,
    role: admin.role,
    status: admin.status,
    scopeMode: scope.scopeMode,
    facultyIds: scope.facultyIds,
    tokenVersion: admin.tokenVersion,
  };
}

export type AdminManagementUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: "active" | "inactive";
  sapId: string | null;
  facultyScope: string;
  facultyIds: number[];
  departmentIds: number[];
};

type FacultyRow = {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
};

type DepartmentRow = {
  id: number;
  faculty_id: number;
  name: string;
  is_active: boolean;
};

export async function listFaculties(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false;
  const result = await db.query<FacultyRow>(
    includeInactive
      ? `
      SELECT id, code, name, is_active
      FROM faculties
      ORDER BY name ASC
    `
      : `
      SELECT id, code, name, is_active
      FROM faculties
      WHERE is_active = TRUE
      ORDER BY name ASC
    `,
  );
  return result.rows;
}

export async function createFaculty(input: { code: string; name: string }) {
  const result = await db.query<FacultyRow>(
    `
      INSERT INTO faculties (code, name, is_active)
      VALUES ($1, $2, TRUE)
      RETURNING id, code, name, is_active
    `,
    [input.code.trim().toUpperCase(), input.name.trim()],
  );
  return result.rows[0];
}

export async function listDepartments(options?: {
  includeInactive?: boolean;
  facultyId?: number;
  facultyIds?: number[];
}) {
  const includeInactive = options?.includeInactive ?? false;
  const facultyId = options?.facultyId;
  const facultyIds = options?.facultyIds;
  const bySingle = typeof facultyId === "number";
  const byMany = Array.isArray(facultyIds) && facultyIds.length > 0;

  const result = await db.query<DepartmentRow & { faculty_name: string }>(
    `
      SELECT d.id, d.faculty_id, d.name, d.is_active, f.name AS faculty_name
      FROM departments d
      INNER JOIN faculties f ON f.id = d.faculty_id
      WHERE ($1::boolean OR d.is_active = TRUE)
        AND (NOT $2::boolean OR d.faculty_id = $3::bigint)
        AND (NOT $4::boolean OR d.faculty_id = ANY($5::bigint[]))
      ORDER BY f.name ASC, d.name ASC
    `,
    [includeInactive, bySingle, facultyId ?? null, byMany, byMany ? facultyIds : []],
  );
  return result.rows;
}

export async function createDepartment(input: {
  facultyId: number;
  name: string;
}) {
  const result = await db.query<DepartmentRow>(
    `
      INSERT INTO departments (faculty_id, name, is_active)
      VALUES ($1, $2, TRUE)
      RETURNING id, faculty_id, name, is_active
    `,
    [input.facultyId, input.name.trim()],
  );
  return result.rows[0];
}

export async function updateDepartment(input: {
  id: number;
  facultyId: number;
  name: string;
  isActive: boolean;
}) {
  const result = await db.query<DepartmentRow>(
    `
      UPDATE departments
      SET faculty_id = $2,
          name = $3,
          is_active = $4,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, faculty_id, name, is_active
    `,
    [input.id, input.facultyId, input.name.trim(), input.isActive],
  );
  return result.rows[0] ?? null;
}

export async function deleteDepartment(id: number) {
  const result = await db.query<{ id: number }>(
    `
      DELETE FROM departments
      WHERE id = $1
      RETURNING id
    `,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function updateFaculty(input: {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}) {
  const result = await db.query<FacultyRow & { is_active: boolean }>(
    `
      UPDATE faculties
      SET code = $2,
          name = $3,
          is_active = $4,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, code, name, is_active
    `,
    [input.id, input.code.trim().toUpperCase(), input.name.trim(), input.isActive],
  );
  return result.rows[0] ?? null;
}

export async function deleteFaculty(id: number) {
  const result = await db.query<{ id: number }>(
    `
      DELETE FROM faculties
      WHERE id = $1
      RETURNING id
    `,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listAdminUsersForManagement(): Promise<AdminManagementUser[]> {
  const admins = await db.query<
    Pick<AdminRow, "id" | "name" | "email" | "role" | "status" | "sap_id">
  >(
    `
      SELECT id, name, email, role, status, sap_id
      FROM admin_users
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `,
  );

  const scopes = await db.query<{
    admin_user_id: string;
    assignment_type: "dean_primary" | "ireb_scope";
    faculty_id: number;
    faculty_name: string;
  }>(
    `
      SELECT
        afa.admin_user_id,
        afa.assignment_type,
        afa.faculty_id,
        f.name AS faculty_name
      FROM admin_faculty_assignments afa
      INNER JOIN faculties f ON f.id = afa.faculty_id
      WHERE afa.deleted_at IS NULL
      ORDER BY afa.admin_user_id, f.name ASC
    `,
  );

  const departmentScopes = await db.query<{
    admin_user_id: string;
    department_id: number;
    assignment_type: "dean_primary" | "ireb_scope";
    department_name: string;
  }>(
    `
      SELECT
        ada.admin_user_id,
        ada.department_id,
        ada.assignment_type,
        d.name AS department_name
      FROM admin_department_assignments ada
      INNER JOIN departments d ON d.id = ada.department_id
      WHERE ada.deleted_at IS NULL
      ORDER BY ada.admin_user_id, d.name ASC
    `,
  );

  const scopeMap = new Map<
    string,
    {
      deanFaculty?: string;
      deanFacultyId?: number;
      irebFaculties: string[];
      irebFacultyIds: number[];
      departmentIds: number[];
      departmentNames: string[];
    }
  >();

  for (const row of scopes.rows) {
    const current = scopeMap.get(row.admin_user_id) ?? {
      deanFaculty: undefined,
      deanFacultyId: undefined,
      irebFaculties: [],
      irebFacultyIds: [],
      departmentIds: [],
      departmentNames: [],
    };
    if (row.assignment_type === "dean_primary") {
      current.deanFaculty = row.faculty_name;
      current.deanFacultyId = row.faculty_id;
    } else if (!current.irebFacultyIds.includes(row.faculty_id)) {
      current.irebFacultyIds.push(row.faculty_id);
      current.irebFaculties.push(row.faculty_name);
    }
    scopeMap.set(row.admin_user_id, current);
  }

  for (const row of departmentScopes.rows) {
    if (row.assignment_type !== "dean_primary") continue;
    const current = scopeMap.get(row.admin_user_id) ?? {
      deanFaculty: undefined,
      deanFacultyId: undefined,
      irebFaculties: [],
      irebFacultyIds: [],
      departmentIds: [],
      departmentNames: [],
    };
    if (!current.departmentIds.includes(row.department_id)) {
      current.departmentIds.push(row.department_id);
    }
    if (!current.departmentNames.includes(row.department_name)) {
      current.departmentNames.push(row.department_name);
    }
    scopeMap.set(row.admin_user_id, current);
  }

  return admins.rows.map(
    (admin: Pick<AdminRow, "id" | "name" | "email" | "role" | "status" | "sap_id">) => {
    const scope = scopeMap.get(admin.id);
    let facultyScope = "All Faculties";
    if (admin.role === "dean") {
      if (scope?.deanFaculty && scope.departmentNames.length > 0) {
        facultyScope = `${scope.deanFaculty} — ${scope.departmentNames.join(", ")}`;
      } else {
        facultyScope = scope?.deanFaculty ?? "Unassigned";
      }
    } else if (admin.role === "ireb") {
      facultyScope =
        scope?.irebFaculties && scope.irebFaculties.length > 0
          ? scope.irebFaculties.join(", ")
          : "All Faculties";
    }

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status,
      sapId: admin.sap_id,
      facultyScope,
      facultyIds:
        admin.role === "ireb"
          ? (scope?.irebFacultyIds ?? [])
          : admin.role === "dean" && scope?.deanFacultyId != null
            ? [scope.deanFacultyId]
            : [],
      departmentIds: admin.role === "dean" ? (scope?.departmentIds ?? []) : [],
    };
    },
  );
}

export async function getAdminUserByEmailExcludingId(input: {
  email: string;
  excludeAdminId: string;
}) {
  const result = await db.query<AdminRow>(
    `
      SELECT *
      FROM admin_users
      WHERE email = $1
        AND id <> $2
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [normalizeEmail(input.email), input.excludeAdminId],
  );
  return result.rows[0] ? mapAdminRow(result.rows[0]) : null;
}

export async function updateAdminUser(input: {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  sapId: string | null;
  passwordHash?: string;
}) {
  const result = await db.query<AdminRow>(
    `
      UPDATE admin_users
      SET name = $2,
          email = $3,
          role = $4,
          sap_id = $5,
          password_hash = COALESCE($6, password_hash),
          updated_at = NOW(),
          token_version = token_version + 1
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING *
    `,
    [
      input.id,
      input.name.trim(),
      normalizeEmail(input.email),
      input.role,
      input.sapId,
      input.passwordHash ?? null,
    ],
  );
  return result.rows[0] ? mapAdminRow(result.rows[0]) : null;
}

export type DeanPickerRow = {
  id: string;
  name: string;
  email: string;
};

/** Active dean accounts for administrator-only report picker. */
export async function listActiveDeansForReportPicker(): Promise<DeanPickerRow[]> {
  const result = await db.query<DeanPickerRow>(
    `
      SELECT id, name, email
      FROM admin_users
      WHERE deleted_at IS NULL
        AND status = 'active'
        AND role = 'dean'
      ORDER BY LOWER(name) ASC, LOWER(email) ASC
    `,
  );
  return result.rows;
}

/** Active IREB accounts for administrator View As picker. */
export async function listActiveIrebForViewAs(): Promise<DeanPickerRow[]> {
  const result = await db.query<DeanPickerRow>(
    `
      SELECT id, name, email
      FROM admin_users
      WHERE deleted_at IS NULL
        AND status = 'active'
        AND role = 'ireb'
      ORDER BY LOWER(name) ASC, LOWER(email) ASC
    `,
  );
  return result.rows;
}
