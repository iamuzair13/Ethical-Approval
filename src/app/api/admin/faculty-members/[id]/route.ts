import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
  applyIrebScope,
  assignSupervisorFaculty,
  clearAdminScopeAssignments,
  findOrCreateUserForFaculty,
  getAdminUserByEmailExcludingId,
  updateAdminUser,
} from "@/lib/admin-repository";
import { hashPassword } from "@/lib/password";
import { logActivityFromRequest } from "@/lib/activity-log";
import { linkFacultyMemberToUser } from "@/lib/faculty-members";

type FacultyMemberDetailRow = {
  id: string;
  sap_id: string;
  employee_id: string | null;
  employee_code: string | null;
  name: string;
  email: string;
  designation: string | null;
  faculty: string | null;
  department: string;
  program: string | null;
  faculty_id: number | null;
  department_id: number | null;
  program_id: number | null;
  employee_type: string | null;
  employee_status: string | null;
  status: string;
  is_active: boolean;
  is_google_sso_enabled: boolean;
  last_login_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  user_role: string | null;
  user_status: string | null;
  user_token_version: number | null;
};

type FacultyNameRow = { name: string };
type DepartmentNameRow = { name: string };
type ProgramNameRow = { name: string };

type ScopeRow = {
  supervisor_faculty_id: number | null;
  supervisor_department_id: number | null;
  supervisor_program_id: number | null;
  ireb_faculty_ids: number[];
};

/**
 * GET /api/admin/faculty-members/[id]
 * Returns a single faculty member with their linked user account data and scope.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await assertActiveAdmin(request);
  if (!admin || !isAdministrator(admin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing faculty member ID." }, { status: 400 });
  }

  try {
    const memberResult = await db.query<FacultyMemberDetailRow>(
      `
        SELECT fm.*, au.id AS user_id, au.role AS user_role,
               au.status AS user_status, au.token_version AS user_token_version
        FROM faculty_members fm
        LEFT JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
        WHERE fm.id = $1 AND fm.deleted_at IS NULL
        LIMIT 1
      `,
      [id],
    );

    if (!memberResult.rows[0]) {
      return NextResponse.json({ ok: false, error: "Faculty member not found." }, { status: 404 });
    }

    const row = memberResult.rows[0];

    const [facultyResult, departmentResult, programResult, scopeResult] = await Promise.all([
      row.faculty_id
        ? db.query<FacultyNameRow>(`SELECT name FROM faculties WHERE id = $1`, [row.faculty_id])
        : Promise.resolve({ rows: [] as FacultyNameRow[] }),
      row.department_id
        ? db.query<DepartmentNameRow>(`SELECT name FROM departments WHERE id = $1`, [row.department_id])
        : Promise.resolve({ rows: [] as DepartmentNameRow[] }),
      row.program_id
        ? db.query<ProgramNameRow>(`SELECT name FROM programs WHERE id = $1`, [row.program_id])
        : Promise.resolve({ rows: [] as ProgramNameRow[] }),
      row.user_id
        ? db.query<ScopeRow>(
            `
              SELECT
                (SELECT faculty_id FROM admin_faculty_assignments WHERE admin_user_id = $1 AND assignment_type = 'supervisor_primary' AND deleted_at IS NULL ORDER BY id DESC LIMIT 1) AS supervisor_faculty_id,
                (SELECT department_id FROM admin_department_assignments WHERE admin_user_id = $1 AND assignment_type = 'supervisor_primary' AND deleted_at IS NULL ORDER BY id DESC LIMIT 1) AS supervisor_department_id,
                (SELECT program_id FROM admin_program_assignments WHERE admin_user_id = $1 AND assignment_type = 'supervisor_primary' AND deleted_at IS NULL ORDER BY id DESC LIMIT 1) AS supervisor_program_id,
                COALESCE(
                  (SELECT array_agg(faculty_id) FROM admin_faculty_assignments WHERE admin_user_id = $1 AND assignment_type = 'ireb_scope' AND deleted_at IS NULL),
                  ARRAY[]::bigint[]
                ) AS ireb_faculty_ids
            `,
            [row.user_id],
          )
        : Promise.resolve({ rows: [] as ScopeRow[] }),
    ]);

    const scope = scopeResult.rows[0];

    return NextResponse.json({
      ok: true,
      member: {
        id: row.id,
        sapId: row.sap_id,
        employeeId: row.employee_id,
        employeeCode: row.employee_code,
        name: row.name,
        email: row.email,
        designation: row.designation,
        faculty: facultyResult.rows[0]?.name ?? row.faculty,
        department: departmentResult.rows[0]?.name ?? row.department,
        program: programResult.rows[0]?.name ?? row.program,
        facultyId: row.faculty_id,
        departmentId: row.department_id,
        programId: row.program_id,
        employeeType: row.employee_type,
        employeeStatus: row.employee_status,
        status: row.status,
        isActive: row.is_active,
        isGoogleSsoEnabled: row.is_google_sso_enabled,
        lastLoginAt: row.last_login_at,
        lastSyncedAt: row.last_synced_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      user: row.user_id
        ? {
            id: row.user_id,
            role: row.user_role,
            status: row.user_status,
            tokenVersion: row.user_token_version,
          }
        : null,
      scope: scope
        ? {
            supervisorFacultyId: scope.supervisor_faculty_id,
            supervisorDepartmentId: scope.supervisor_department_id,
            supervisorProgramId: scope.supervisor_program_id,
            irebFacultyIds: scope.ireb_faculty_ids ?? [],
          }
        : null,
    });
  } catch (error) {
    console.error("[faculty-members] detail failed:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to load faculty member." },
      { status: 500 },
    );
  }
}

// ─── PATCH: Update Faculty Member + User Account ───

type UpdateFacultyBody = {
  name?: string;
  email?: string;
  designation?: string | null;
  facultyId?: number | null;
  departmentId?: number | null;
  programId?: number | null;
  role?: string | null;
  password?: string;
  status?: string;
  // Supervisor scope
  supervisorFacultyId?: number | null;
  supervisorDepartmentId?: number | null;
  supervisorProgramId?: number | null;
  // IREB scope
  irebFacultyIds?: number[];
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await assertActiveAdmin(request);
  if (!actor || !isAdministrator(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing faculty member ID." }, { status: 400 });
  }

  let body: UpdateFacultyBody;
  try {
    body = (await request.json()) as UpdateFacultyBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  try {
    // Fetch current faculty member
    const currentResult = await db.query<FacultyMemberDetailRow>(
      `SELECT fm.*, au.id AS user_id, au.role AS user_role, au.status AS user_status, au.token_version AS user_token_version
       FROM faculty_members fm
       LEFT JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
       WHERE fm.id = $1 AND fm.deleted_at IS NULL
       LIMIT 1`,
      [id],
    );

    if (!currentResult.rows[0]) {
      return NextResponse.json({ ok: false, error: "Faculty member not found." }, { status: 404 });
    }

    const current = currentResult.rows[0];
    const userId = current.user_id;

    // Check email uniqueness if changing
    if (body.email && body.email.trim().toLowerCase() !== current.email) {
      if (userId) {
        const emailConflict = await getAdminUserByEmailExcludingId({
          email: body.email.trim(),
          excludeAdminId: userId,
        });
        if (emailConflict) {
          return NextResponse.json(
            { ok: false, error: "Another user already uses this email." },
            { status: 409 },
          );
        }
      }
    }

    // 1. Update faculty_members record
    // NOTE: `department` column is NOT NULL — fall back to current value
    // when no new department is selected. `faculty` and `program` are nullable.
    const facultyName = body.facultyId
      ? (await db.query<FacultyNameRow>(`SELECT name FROM faculties WHERE id = $1`, [body.facultyId])).rows[0]?.name ?? null
      : null;

    const deptName = body.departmentId
      ? (await db.query<DepartmentNameRow>(`SELECT name FROM departments WHERE id = $1`, [body.departmentId])).rows[0]?.name ?? current.department
      : current.department;

    const progName = body.programId
      ? (await db.query<ProgramNameRow>(`SELECT name FROM programs WHERE id = $1`, [body.programId])).rows[0]?.name ?? null
      : null;

    await db.query(
      `
        UPDATE faculty_members SET
          name = COALESCE($2, name),
          email = COALESCE($3, email),
          designation = $4,
          faculty = $5,
          department = $6,
          program = $7,
          faculty_id = $8,
          department_id = $9,
          program_id = $10,
          updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
      `,
      [
        id,
        body.name?.trim() ?? null,
        body.email?.trim().toLowerCase() ?? null,
        body.designation ?? null,
        facultyName,
        deptName,
        progName,
        body.facultyId ?? null,
        body.departmentId ?? null,
        body.programId !== undefined ? body.programId : current.program_id,
      ],
    );

    // 2. Update admin_users record (if linked)
    // If a role is being assigned but no admin_users record exists yet,
    // create one and link it to the faculty member.
    let effectiveUserId = userId;
    const roleValue = body.role !== undefined ? body.role : current.user_role;

    if (!effectiveUserId && roleValue) {
      // Create admin_users record for this faculty member
      effectiveUserId = (
        await findOrCreateUserForFaculty({
          name: body.name?.trim() ?? current.name,
          email: body.email?.trim() ?? current.email,
          sapId: current.sap_id,
        })
      ).id;
      await linkFacultyMemberToUser(id, effectiveUserId);
    }

    if (effectiveUserId) {
      const passwordHash = body.password?.trim()
        ? await hashPassword(body.password)
        : undefined;

      await updateAdminUser({
        id: effectiveUserId,
        name: body.name?.trim() ?? current.name,
        email: body.email?.trim() ?? current.email,
        role: roleValue as "administrator" | "supervisor" | "ireb" | null,
        sapId: current.sap_id,
        passwordHash,
      });

      // Update status if provided
      if (body.status === "active" || body.status === "inactive") {
        await db.query(
          `UPDATE admin_users SET status = $2, updated_at = NOW() WHERE id = $1`,
          [effectiveUserId, body.status],
        );
      }

      // 3. Update role scope
      const newRole = roleValue;
      const oldRole = current.user_role;

      if (newRole !== oldRole) {
        // Clear old scope assignments
        await clearAdminScopeAssignments(effectiveUserId);
      }

      if (newRole === "supervisor" && body.supervisorFacultyId && body.supervisorDepartmentId) {
        await assignSupervisorFaculty({
          adminUserId: effectiveUserId,
          facultyId: body.supervisorFacultyId,
          departmentId: body.supervisorDepartmentId,
          programId: typeof body.supervisorProgramId === "number" ? body.supervisorProgramId : undefined,
          assignedBy: actor.adminId,
        });
      }

      if (newRole === "ireb") {
        const irebFacultyIds = Array.isArray(body.irebFacultyIds) ? body.irebFacultyIds : [];
        await applyIrebScope({
          adminUserId: effectiveUserId,
          facultyIds: irebFacultyIds,
          assignedBy: actor.adminId,
        });
      }
    }

    // 4. Audit log — only use admin_users ID for effective_admin_id, never
    // the faculty_members ID (which would violate the FK constraint).
    if (effectiveUserId) {
      void logActivityFromRequest(request, {
        actionCode: body.password ? "admin.user.password_reset" : "admin.faculty.update",
        targetType: current.user_role === "supervisor" ? "supervisor" : current.user_role === "ireb" ? "ireb_member" : "administrator",
        targetId: effectiveUserId,
        targetLabel: body.name?.trim() ?? current.name,
        effective: {
          adminId: effectiveUserId,
          name: body.name?.trim() ?? current.name,
          role: (current.user_role ?? "faculty") as "administrator" | "supervisor" | "ireb" | "faculty",
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[faculty-members] update failed:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to update faculty member." },
      { status: 500 },
    );
  }
}

// ─── DELETE: Delete Faculty Member + User Account ───

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await assertActiveAdmin(request);
  if (!actor || !isAdministrator(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing faculty member ID." }, { status: 400 });
  }

  try {
    const currentResult = await db.query<FacultyMemberDetailRow>(
      `SELECT fm.*, au.id AS user_id, au.role AS user_role
       FROM faculty_members fm
       LEFT JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
       WHERE fm.id = $1 AND fm.deleted_at IS NULL
       LIMIT 1`,
      [id],
    );

    if (!currentResult.rows[0]) {
      return NextResponse.json({ ok: false, error: "Faculty member not found." }, { status: 404 });
    }

    const current = currentResult.rows[0];

    // Soft-delete the faculty member
    await db.query(
      `UPDATE faculty_members SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id],
    );

    // Soft-delete the linked admin_users record
    if (current.user_id) {
      await db.query(
        `UPDATE admin_users SET deleted_at = NOW(), updated_at = NOW(), token_version = token_version + 1 WHERE id = $1`,
        [current.user_id],
      );

      // Clear all scope assignments so they don't block future assignments
      await db.query(
        `UPDATE admin_faculty_assignments SET deleted_at = NOW() WHERE admin_user_id = $1 AND deleted_at IS NULL`,
        [current.user_id],
      );
      await db.query(
        `UPDATE admin_department_assignments SET deleted_at = NOW() WHERE admin_user_id = $1 AND deleted_at IS NULL`,
        [current.user_id],
      );
      await db.query(
        `UPDATE admin_program_assignments SET deleted_at = NOW() WHERE admin_user_id = $1 AND deleted_at IS NULL`,
        [current.user_id],
      );
    }

    // Only log if there's a linked admin_users record (FK constraint)
    if (current.user_id) {
      void logActivityFromRequest(request, {
        actionCode: "admin.user.delete",
        targetType: current.user_role === "supervisor" ? "supervisor" : current.user_role === "ireb" ? "ireb_member" : "administrator",
        targetId: current.user_id,
        targetLabel: current.name,
        effective: {
          adminId: current.user_id,
          name: current.name,
          role: (current.user_role ?? "faculty") as "administrator" | "supervisor" | "ireb" | "faculty",
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[faculty-members] delete failed:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to delete faculty member." },
      { status: 500 },
    );
  }
}
