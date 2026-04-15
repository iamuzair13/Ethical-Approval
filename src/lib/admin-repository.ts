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
    const facultyId = result.rows[0]?.faculty_id ?? admin.facultyId;
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
  const facultyIds = assigned.rows.map((row) => row.faculty_id);
  if (facultyIds.length === 0) {
    return { scopeMode: "all", facultyIds: [] };
  }
  return { scopeMode: "restricted", facultyIds };
}

export async function resolveFacultyIdsFromSnapshotValue(
  sapFacultyValue: string,
): Promise<number[]> {
  const normalized = normalizeSapFacultyValue(sapFacultyValue);
  const result = await db.query<{ faculty_id: number }>(
    `
      SELECT faculty_id
      FROM faculty_sap_aliases
      WHERE sap_value_normalized = $1
    `,
    [normalized],
  );
  return result.rows.map((row) => row.faculty_id);
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
        UPDATE admin_faculty_assignments
        SET deleted_at = NOW()
        WHERE admin_user_id = $1
          AND assignment_type = 'ireb_scope'
          AND deleted_at IS NULL
      `,
      [input.adminUserId],
    );

    for (const facultyId of input.facultyIds) {
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
};

type FacultyRow = {
  id: number;
  code: string;
  name: string;
};

export async function listFaculties() {
  const result = await db.query<FacultyRow>(
    `
      SELECT id, code, name
      FROM faculties
      WHERE is_active = TRUE
      ORDER BY name ASC
    `,
  );
  return result.rows;
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

  const scopeMap = new Map<
    string,
    { deanFaculty?: string; irebFaculties: string[]; facultyIds: number[] }
  >();

  for (const row of scopes.rows) {
    const current = scopeMap.get(row.admin_user_id) ?? {
      deanFaculty: undefined,
      irebFaculties: [],
      facultyIds: [],
    };
    if (!current.facultyIds.includes(row.faculty_id)) {
      current.facultyIds.push(row.faculty_id);
    }
    if (row.assignment_type === "dean_primary") {
      current.deanFaculty = row.faculty_name;
    } else {
      current.irebFaculties.push(row.faculty_name);
    }
    scopeMap.set(row.admin_user_id, current);
  }

  return admins.rows.map((admin) => {
    const scope = scopeMap.get(admin.id);
    let facultyScope = "All Faculties";
    if (admin.role === "dean") {
      facultyScope = scope?.deanFaculty ?? "Unassigned";
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
      facultyIds: scope?.facultyIds ?? [],
    };
  });
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
