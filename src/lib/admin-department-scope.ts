import { db } from "@/lib/db";
import type { AuthenticatedAdmin } from "@/lib/admin-auth";

/**
 * Resolves the department IDs that an admin user is allowed to see.
 *
 * - Administrator (superadmin): returns null (meaning "all departments")
 * - IREB: returns null if scopeMode is "all", otherwise returns the
 *   department IDs derived from their faculty scope (via
 *   admin_department_assignments with assignment_type = 'ireb_scope'
 *   if present, or all departments under their assigned faculties)
 * - Supervisor: returns their assigned department IDs from
 *   admin_department_assignments with assignment_type = 'supervisor_primary'
 */
export async function resolveDepartmentIdsForAdmin(
  admin: AuthenticatedAdmin,
): Promise<number[] | null> {
  // Superadmin sees everything
  if (admin.role === "administrator") {
    return null;
  }

  // IREB with no faculty restriction sees everything
  if (admin.role === "ireb" && admin.scopeMode === "all") {
    return null;
  }

  // IREB restricted to specific faculties: get all departments under
  // those faculties via admin_department_assignments
  if (admin.role === "ireb" && admin.scopeMode === "restricted") {
    if (admin.facultyIds.length === 0) return null;
    const result = await db.query<{ department_id: number }>(
      `
        SELECT DISTINCT ada.department_id
        FROM admin_department_assignments ada
        WHERE ada.faculty_id = ANY($1::bigint[])
          AND ada.department_id IS NOT NULL
          AND ada.deleted_at IS NULL
        ORDER BY ada.department_id
      `,
      [admin.facultyIds],
    );
    const deptIds = result.rows
      .map((r) => r.department_id)
      .filter((id): id is number => id != null);
    return deptIds.length > 0 ? deptIds : null;
  }

  // Supervisor: get their primary department assignment
  if (admin.role === "supervisor") {
    const result = await db.query<{ department_id: number }>(
      `
        SELECT ada.department_id
        FROM admin_department_assignments ada
        WHERE ada.admin_user_id = $1
          AND ada.assignment_type = 'supervisor_primary'
          AND ada.deleted_at IS NULL
          AND ada.department_id IS NOT NULL
        ORDER BY ada.id DESC
      `,
      [admin.adminId],
    );
    const deptIds = result.rows
      .map((r) => r.department_id)
      .filter((id): id is number => id != null);
    return deptIds.length > 0 ? deptIds : null;
  }

  return null;
}

/**
 * Resolves the department IDs from a snapshot department text value.
 * The submission_applicant_snapshot.department is a text field that may
 * contain the department name or ID. We resolve it to department IDs
 * by matching against the departments table.
 */
export async function resolveDepartmentIdsFromSnapshot(
  departmentText: string,
): Promise<number[]> {
  const trimmed = departmentText.trim();
  if (!trimmed) return [];

  // Try exact name match
  const result = await db.query<{ id: number }>(
    `
      SELECT id FROM departments
      WHERE name = $1 AND is_active = TRUE
    `,
    [trimmed],
  );
  if (result.rows.length > 0) {
    return result.rows.map((r) => r.id);
  }

  // Try case-insensitive match
  const result2 = await db.query<{ id: number }>(
    `
      SELECT id FROM departments
      WHERE LOWER(name) = LOWER($1) AND is_active = TRUE
    `,
    [trimmed],
  );
  if (result2.rows.length > 0) {
    return result2.rows.map((r) => r.id);
  }

  return [];
}
