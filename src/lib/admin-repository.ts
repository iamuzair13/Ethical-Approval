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
  password_hash: string | null;
  role: AdminRole | null;
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
      WHERE LOWER(email) = LOWER($1)
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
  if (!admin.role || admin.role === "administrator") {
    return { scopeMode: "all", facultyIds: [] };
  }

  if (admin.role === "supervisor") {
    const deptScoped = await db.query<{ faculty_id: number }>(
      `
        SELECT ada.faculty_id
        FROM admin_department_assignments ada
        WHERE ada.admin_user_id = $1
          AND ada.assignment_type = 'supervisor_primary'
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
          AND afa.assignment_type = 'supervisor_primary'
          AND afa.deleted_at IS NULL
        ORDER BY afa.id DESC
        LIMIT 1
      `,
      [admin.id],
    );
    const facultyId =
      deptScoped.rows[0]?.faculty_id ?? result.rows[0]?.faculty_id ?? admin.facultyId;

    const programResult = await db.query<{ program_id: number }>(
      `
        SELECT apa.program_id
        FROM admin_program_assignments apa
        WHERE apa.admin_user_id = $1
          AND apa.assignment_type = 'supervisor_primary'
          AND apa.deleted_at IS NULL
        ORDER BY apa.id DESC
      `,
      [admin.id],
    );
    const programIds = programResult.rows.map((row) => row.program_id);

    return {
      scopeMode: "restricted",
      facultyIds: facultyId ? [facultyId] : [],
      programIds,
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

/**
 * Returns the email addresses of all active IREB members assigned to the
 * given faculty ids. Used to notify IREB when a supervisor approves an
 * application and it moves to IREB review.
 */
export async function getIrebEmailsForFacultyIds(
  facultyIds: number[],
): Promise<string[]> {
  if (facultyIds.length === 0) return [];
  const result = await db.query<{ email: string }>(
    `
      SELECT DISTINCT au.email
      FROM admin_users au
      INNER JOIN admin_faculty_assignments afa
        ON afa.admin_user_id = au.id
        AND afa.assignment_type = 'ireb_scope'
        AND afa.deleted_at IS NULL
      WHERE au.role = 'ireb'
        AND au.status = 'active'
        AND au.deleted_at IS NULL
        AND afa.faculty_id = ANY($1::bigint[])
    `,
    [facultyIds],
  );
  return result.rows.map((row: { email: string }) => row.email.trim()).filter(Boolean);
}

export async function createAdminUser(input: {
  name: string;
  email: string;
  passwordHash?: string | null;
  role?: AdminRole | null;
  sapId?: string | null;
  facultyId?: number | null;
  createdBy?: string | null;
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
      input.passwordHash ?? null,
      input.role ?? null,
      input.sapId ?? null,
      input.facultyId ?? null,
      input.createdBy ?? null,
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

export async function assignSupervisorFaculty(input: {
  adminUserId: string;
  facultyId: number;
  departmentId: number;
  programId?: number;
  assignedBy: string;
}) {
  await db.query("BEGIN");
  try {
    await db.query(
      `
        UPDATE admin_faculty_assignments
        SET deleted_at = NOW()
        WHERE admin_user_id = $1
          AND assignment_type = 'supervisor_primary'
          AND deleted_at IS NULL
      `,
      [input.adminUserId],
    );

    await db.query(
      `
        UPDATE admin_department_assignments
        SET deleted_at = NOW()
        WHERE admin_user_id = $1
          AND assignment_type = 'supervisor_primary'
          AND deleted_at IS NULL
      `,
      [input.adminUserId],
    );

    await db.query(
      `
        UPDATE admin_program_assignments
        SET deleted_at = NOW()
        WHERE admin_user_id = $1
          AND assignment_type = 'supervisor_primary'
          AND deleted_at IS NULL
      `,
      [input.adminUserId],
    );

    // Clear any existing active supervisor assignment for this faculty
    // (the unique index uq_supervisor_faculty_single_active allows only one)
    await db.query(
      `
        UPDATE admin_faculty_assignments
        SET deleted_at = NOW()
        WHERE faculty_id = $1
          AND assignment_type = 'supervisor_primary'
          AND deleted_at IS NULL
      `,
      [input.facultyId],
    );

    await db.query(
      `
        INSERT INTO admin_faculty_assignments (
          admin_user_id,
          faculty_id,
          assignment_type,
          assigned_by
        ) VALUES ($1, $2, 'supervisor_primary', $3)
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
        ) VALUES ($1, $2, $3, 'supervisor_primary', $4)
      `,
      [input.adminUserId, input.facultyId, input.departmentId, input.assignedBy],
    );

    if (typeof input.programId === "number") {
      await db.query(
        `
          INSERT INTO admin_program_assignments (
            admin_user_id,
            faculty_id,
            department_id,
            program_id,
            assignment_type,
            assigned_by
          ) VALUES ($1, $2, $3, $4, 'supervisor_primary', $5)
        `,
        [input.adminUserId, input.facultyId, input.departmentId, input.programId, input.assignedBy],
      );
    }

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
        UPDATE admin_program_assignments
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
): Promise<AdminAuthClaims | null> {
  if (!admin.role) return null;
  const scope = await getAdminScope(admin);
  return {
    adminId: admin.id,
    role: admin.role,
    status: admin.status,
    scopeMode: scope.scopeMode,
    facultyIds: scope.facultyIds,
    programIds: scope.programIds,
    tokenVersion: admin.tokenVersion,
  };
}

export type AdminManagementUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole | null;
  status: "active" | "inactive";
  sapId: string | null;
  facultyScope: string;
  facultyIds: number[];
  departmentIds: number[];
  programIds: number[];
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

type ProgramRow = {
  id: number;
  department_id: number;
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

  const result = await db.query<DepartmentRow & { faculty_name: string | null }>(
    `
      SELECT d.id, d.faculty_id, d.name, d.is_active, f.name AS faculty_name
      FROM departments d
      LEFT JOIN faculties f ON f.id = d.faculty_id
      WHERE ($1::boolean OR d.is_active = TRUE)
        AND (NOT $2::boolean OR d.faculty_id = $3::bigint)
        AND (NOT $4::boolean OR d.faculty_id = ANY($5::bigint[]))
      ORDER BY d.name ASC
    `,
    [includeInactive, bySingle, facultyId ?? null, byMany, byMany ? facultyIds : []],
  );
  return result.rows;
}

export async function createDepartment(input: {
  facultyId?: number | null;
  name: string;
}) {
  const result = await db.query<DepartmentRow>(
    `
      INSERT INTO departments (faculty_id, name, is_active)
      VALUES ($1, $2, TRUE)
      RETURNING id, faculty_id, name, is_active
    `,
    [input.facultyId ?? null, input.name.trim()],
  );
  return result.rows[0];
}

export async function updateDepartment(input: {
  id: number;
  facultyId?: number | null;
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
    [input.id, input.facultyId ?? null, input.name.trim(), input.isActive],
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

export async function listPrograms(options?: {
  includeInactive?: boolean;
  departmentId?: number;
  departmentIds?: number[];
}) {
  const includeInactive = options?.includeInactive ?? false;
  const departmentId = options?.departmentId;
  const departmentIds = options?.departmentIds;
  const bySingle = typeof departmentId === "number";
  const byMany = Array.isArray(departmentIds) && departmentIds.length > 0;

  const result = await db.query<ProgramRow & { department_name: string; faculty_name: string }>(
    `
      SELECT p.id, p.department_id, p.name, p.is_active,
             d.name AS department_name, f.name AS faculty_name
      FROM programs p
      INNER JOIN departments d ON d.id = p.department_id
      INNER JOIN faculties f ON f.id = d.faculty_id
      WHERE ($1::boolean OR p.is_active = TRUE)
        AND (NOT $2::boolean OR p.department_id = $3::bigint)
        AND (NOT $4::boolean OR p.department_id = ANY($5::bigint[]))
      ORDER BY f.name ASC, d.name ASC, p.name ASC
    `,
    [includeInactive, bySingle, departmentId ?? null, byMany, byMany ? departmentIds : []],
  );
  return result.rows;
}

export async function createProgram(input: {
  departmentId: number;
  name: string;
}) {
  const result = await db.query<ProgramRow>(
    `
      INSERT INTO programs (department_id, name, is_active)
      VALUES ($1, $2, TRUE)
      RETURNING id, department_id, name, is_active
    `,
    [input.departmentId, input.name.trim()],
  );
  return result.rows[0];
}

export async function updateProgram(input: {
  id: number;
  departmentId: number;
  name: string;
  isActive: boolean;
}) {
  const result = await db.query<ProgramRow>(
    `
      UPDATE programs
      SET department_id = $2,
          name = $3,
          is_active = $4,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, department_id, name, is_active
    `,
    [input.id, input.departmentId, input.name.trim(), input.isActive],
  );
  return result.rows[0] ?? null;
}

export async function deleteProgram(id: number) {
  const result = await db.query<{ id: number }>(
    `
      DELETE FROM programs
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
    assignment_type: "supervisor_primary" | "ireb_scope";
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
    assignment_type: "supervisor_primary" | "ireb_scope";
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

  const programScopes = await db.query<{
    admin_user_id: string;
    program_id: number;
    assignment_type: "supervisor_primary" | "ireb_scope";
    program_name: string;
  }>(
    `
      SELECT
        apa.admin_user_id,
        apa.program_id,
        apa.assignment_type,
        p.name AS program_name
      FROM admin_program_assignments apa
      INNER JOIN programs p ON p.id = apa.program_id
      WHERE apa.deleted_at IS NULL
      ORDER BY apa.admin_user_id, p.name ASC
    `,
  );

  const scopeMap = new Map<
    string,
    {
      supervisorFaculty?: string;
      supervisorFacultyId?: number;
      irebFaculties: string[];
      irebFacultyIds: number[];
      departmentIds: number[];
      departmentNames: string[];
      programIds: number[];
      programNames: string[];
    }
  >();

  for (const row of scopes.rows) {
    const current = scopeMap.get(row.admin_user_id) ?? {
      supervisorFaculty: undefined,
      supervisorFacultyId: undefined,
      irebFaculties: [],
      irebFacultyIds: [],
      departmentIds: [],
      departmentNames: [],
      programIds: [],
      programNames: [],
    };
    if (row.assignment_type === "supervisor_primary") {
      current.supervisorFaculty = row.faculty_name;
      current.supervisorFacultyId = row.faculty_id;
    } else if (!current.irebFacultyIds.includes(row.faculty_id)) {
      current.irebFacultyIds.push(row.faculty_id);
      current.irebFaculties.push(row.faculty_name);
    }
    scopeMap.set(row.admin_user_id, current);
  }

  for (const row of departmentScopes.rows) {
    if (row.assignment_type !== "supervisor_primary") continue;
    const current = scopeMap.get(row.admin_user_id) ?? {
      supervisorFaculty: undefined,
      supervisorFacultyId: undefined,
      irebFaculties: [],
      irebFacultyIds: [],
      departmentIds: [],
      departmentNames: [],
      programIds: [],
      programNames: [],
    };
    if (!current.departmentIds.includes(row.department_id)) {
      current.departmentIds.push(row.department_id);
    }
    if (!current.departmentNames.includes(row.department_name)) {
      current.departmentNames.push(row.department_name);
    }
    scopeMap.set(row.admin_user_id, current);
  }

  for (const row of programScopes.rows) {
    if (row.assignment_type !== "supervisor_primary") continue;
    const current = scopeMap.get(row.admin_user_id) ?? {
      supervisorFaculty: undefined,
      supervisorFacultyId: undefined,
      irebFaculties: [],
      irebFacultyIds: [],
      departmentIds: [],
      departmentNames: [],
      programIds: [],
      programNames: [],
    };
    if (!current.programIds.includes(row.program_id)) {
      current.programIds.push(row.program_id);
    }
    if (!current.programNames.includes(row.program_name)) {
      current.programNames.push(row.program_name);
    }
    scopeMap.set(row.admin_user_id, current);
  }

  return admins.rows.map(
    (admin: Pick<AdminRow, "id" | "name" | "email" | "role" | "status" | "sap_id">) => {
    const scope = scopeMap.get(admin.id);
    let facultyScope = "All Faculties";
    if (admin.role === "supervisor") {
      if (scope?.supervisorFaculty && scope.programNames.length > 0) {
        facultyScope = `${scope.supervisorFaculty} — ${scope.departmentNames.join(", ")} — ${scope.programNames.join(", ")}`;
      } else if (scope?.supervisorFaculty && scope.departmentNames.length > 0) {
        facultyScope = `${scope.supervisorFaculty} — ${scope.departmentNames.join(", ")}`;
      } else {
        facultyScope = scope?.supervisorFaculty ?? "Unassigned";
      }
    } else if (admin.role === "ireb") {
      facultyScope =
        scope?.irebFaculties && scope.irebFaculties.length > 0
          ? scope.irebFaculties.join(", ")
          : "All Faculties";
    } else if (!admin.role) {
      facultyScope = "Faculty (no admin role)";
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
          : admin.role === "supervisor" && scope?.supervisorFacultyId != null
            ? [scope.supervisorFacultyId]
            : [],
      departmentIds: admin.role === "supervisor" ? (scope?.departmentIds ?? []) : [],
      programIds: admin.role === "supervisor" ? (scope?.programIds ?? []) : [],
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
      WHERE LOWER(email) = LOWER($1)
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
  role?: AdminRole | null;
  sapId: string | null;
  passwordHash?: string | null;
}) {
  const result = await db.query<AdminRow>(
    `
      UPDATE admin_users
      SET name = $2,
          email = $3,
          role = $4::admin_role,
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
      input.role ?? null,
      input.sapId,
      input.passwordHash ?? null,
    ],
  );
  return result.rows[0] ? mapAdminRow(result.rows[0]) : null;
}

export async function deleteAdminUser(adminId: string): Promise<boolean> {
  await db.query("BEGIN");
  try {
    await db.query(
      `UPDATE admin_audit_logs SET actor_admin_id = NULL WHERE actor_admin_id = $1`,
      [adminId],
    );
    await db.query(
      `UPDATE activity_events SET actor_admin_id = NULL WHERE actor_admin_id = $1`,
      [adminId],
    );
    await db.query(
      `UPDATE activity_events SET effective_admin_id = NULL WHERE effective_admin_id = $1`,
      [adminId],
    );
    const result = await db.query(
      `DELETE FROM admin_users WHERE id = $1 RETURNING id`,
      [adminId],
    );
    await db.query("COMMIT");
    return result.rows.length > 0;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}

export type SupervisorPickerRow = {
  id: string;
  name: string;
  email: string;
};

/**
 * Active accounts for the administrator-only supervisor report picker.
 * Includes users with role = 'supervisor' plus any admin (regardless of
 * current role) who is assigned as supervisor_user_id on at least one
 * submission — the assignment is authoritative even if the admin's role
 * has since changed (e.g. promoted from supervisor to administrator).
 */
export async function listActiveSupervisorsForReportPicker(): Promise<SupervisorPickerRow[]> {
  const result = await db.query<SupervisorPickerRow>(
    `
      SELECT au.id, au.name, au.email
      FROM admin_users au
      WHERE au.deleted_at IS NULL
        AND au.status = 'active'
        AND (
          au.role = 'supervisor'
          OR EXISTS (
            SELECT 1 FROM submissions s
            WHERE s.supervisor_user_id = au.id
          )
        )
      GROUP BY au.id, au.name, au.email
      ORDER BY LOWER(au.name) ASC, LOWER(au.email) ASC
    `,
  );
  return result.rows;
}

/** Active IREB accounts for administrator View As picker. */
export async function listActiveIrebForViewAs(): Promise<SupervisorPickerRow[]> {
  const result = await db.query<SupervisorPickerRow>(
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

/**
 * Find or create an admin_users record for a faculty member by email.
 * Used by SAP sync and login flow to ensure every faculty member has a
 * unified user account. Does NOT overwrite existing role or password_hash.
 */
export async function findOrCreateUserForFaculty(input: {
  name: string;
  email: string;
  sapId?: string | null;
}): Promise<AdminUserRecord> {
  const email = normalizeEmail(input.email);
  const existing = await getAdminUserByEmail(email);
  if (existing) {
    // Update name and sap_id if the existing record is missing them
    if (
      (existing.sapId === null && input.sapId) ||
      existing.name !== input.name
    ) {
      const updated = await db.query<AdminRow>(
        `
          UPDATE admin_users
          SET name = $2,
              sap_id = COALESCE(sap_id, $3),
              updated_at = NOW()
          WHERE id = $1 AND deleted_at IS NULL
          RETURNING *
        `,
        [existing.id, input.name.trim(), input.sapId?.trim() ?? null],
      );
      if (updated.rows[0]) return mapAdminRow(updated.rows[0]);
    }
    return existing;
  }

  // Check for a soft-deleted record with the same email. The email unique
  // constraint includes soft-deleted rows, so we must restore it instead of
  // inserting a new one (which would violate the constraint).
  const softDeleted = await db.query<AdminRow>(
    `
      SELECT * FROM admin_users
      WHERE LOWER(email) = LOWER($1) AND deleted_at IS NOT NULL
      ORDER BY deleted_at DESC
      LIMIT 1
    `,
    [email],
  );
  if (softDeleted.rows[0]) {
    const restored = await db.query<AdminRow>(
      `
        UPDATE admin_users
        SET name = $2,
            sap_id = COALESCE(sap_id, $3),
            status = 'active',
            deleted_at = NULL,
            token_version = token_version + 1,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [softDeleted.rows[0].id, input.name.trim(), input.sapId?.trim() ?? null],
    );
    if (restored.rows[0]) return mapAdminRow(restored.rows[0]);
  }

  // Create new user with no role and no password (SSO only)
  return createAdminUser({
    name: input.name.trim(),
    email,
    passwordHash: null,
    role: null,
    sapId: input.sapId ?? null,
  });
}
