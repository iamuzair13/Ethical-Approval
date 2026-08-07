import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { db } from "@/lib/db";

type FacultyOptionRow = { id: number; name: string; count: number };
type DepartmentOptionRow = { id: number; name: string; faculty_id: number; count: number };
type ProgramOptionRow = { id: number; name: string; department_id: number; count: number };
type DesignationOptionRow = { designation: string; count: number };
type RoleOptionRow = { role: string | null; count: number };
type StatusOptionRow = { status: string; count: number };

/**
 * GET /api/admin/faculty-members/filters
 *
 * Returns data-driven filter options for the faculty members management UI.
 * Every option is populated from distinct values that actually exist in the
 * database, along with the number of matching records.
 *
 * Only values with at least one record are returned (no NULL / empty / zero-count).
 */
export async function GET(request: NextRequest) {
  const admin = await assertActiveAdmin(request);
  if (!admin || !isAdministrator(admin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  try {
    const [
      facultiesRes,
      departmentsRes,
      programsRes,
      designationsRes,
      rolesRes,
      statusesRes,
    ] = await Promise.all([
      // Faculties — only those with ≥1 faculty member, with counts
      db.query<FacultyOptionRow>(`
        SELECT f.id, f.name, COUNT(fm.id)::int AS count
        FROM faculties f
        INNER JOIN faculty_members fm
          ON fm.faculty_id = f.id AND fm.deleted_at IS NULL
        WHERE f.is_active = TRUE
        GROUP BY f.id, f.name
        ORDER BY f.name
      `),

      // Departments — only those with ≥1 faculty member, with counts
      db.query<DepartmentOptionRow>(`
        SELECT d.id, d.name, d.faculty_id, COUNT(fm.id)::int AS count
        FROM departments d
        INNER JOIN faculty_members fm
          ON fm.department_id = d.id AND fm.deleted_at IS NULL
        WHERE d.is_active = TRUE
        GROUP BY d.id, d.name, d.faculty_id
        ORDER BY d.name
      `),

      // Programs — only those with ≥1 faculty member, with counts
      db.query<ProgramOptionRow>(`
        SELECT p.id, p.name, p.department_id, COUNT(fm.id)::int AS count
        FROM programs p
        INNER JOIN faculty_members fm
          ON fm.program_id = p.id AND fm.deleted_at IS NULL
        WHERE p.is_active = TRUE
        GROUP BY p.id, p.name, p.department_id
        ORDER BY p.name
      `),

      // Designations — non-empty, with counts
      db.query<DesignationOptionRow>(`
        SELECT TRIM(fm.designation) AS designation, COUNT(*)::int AS count
        FROM faculty_members fm
        WHERE fm.deleted_at IS NULL
          AND fm.designation IS NOT NULL
          AND TRIM(fm.designation) != ''
        GROUP BY TRIM(fm.designation)
        ORDER BY designation
      `),

      // Roles — from admin_users joined to faculty_members, including "none"
      db.query<RoleOptionRow>(`
        SELECT au.role, COUNT(fm.id)::int AS count
        FROM faculty_members fm
        LEFT JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
        WHERE fm.deleted_at IS NULL
        GROUP BY au.role
        ORDER BY au.role NULLS LAST
      `),

      // Statuses — based on COALESCE(au.status, fm.status) to match display
      db.query<StatusOptionRow>(`
        SELECT COALESCE(au.status::text, fm.status::text) AS status, COUNT(*)::int AS count
        FROM faculty_members fm
        LEFT JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
        WHERE fm.deleted_at IS NULL
        GROUP BY COALESCE(au.status::text, fm.status::text)
        ORDER BY status
      `),
    ]);

    // Build role options with labels
    const roleLabels: Record<string, string> = {
      administrator: "Super Admin",
      supervisor: "Supervisor",
      ireb: "IREB",
    };
    const roles = rolesRes.rows.map((r) => ({
      value: r.role ?? "none",
      label: r.role ? (roleLabels[r.role] ?? r.role) : "Faculty only",
      count: r.count,
    }));

    // Build status options with labels
    const statusLabels: Record<string, string> = {
      active: "Active",
      inactive: "Inactive",
    };
    const statuses = statusesRes.rows.map((r) => ({
      value: r.status,
      label: statusLabels[r.status] ?? r.status,
      count: r.count,
    }));

    return NextResponse.json({
      ok: true,
      faculties: facultiesRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        count: r.count,
      })),
      departments: departmentsRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        faculty_id: r.faculty_id,
        count: r.count,
      })),
      programs: programsRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        department_id: r.department_id,
        count: r.count,
      })),
      designations: designationsRes.rows.map((r) => ({
        value: r.designation,
        count: r.count,
      })),
      roles,
      statuses,
    });
  } catch (error) {
    console.error("[faculty-members] filters failed:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to load filter options." },
      { status: 500 },
    );
  }
}
