import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
  applyIrebScope,
  assignSupervisorFaculty,
  createAdminUser,
  getAdminUserByEmail,
  findOrCreateUserForFaculty,
} from "@/lib/admin-repository";
import { hashPassword } from "@/lib/password";
import { isAdminRole } from "@/lib/admin-rbac";
import { logActivityFromRequest } from "@/lib/activity-log";
import { linkFacultyMemberToUser } from "@/lib/faculty-members";

type FacultyMemberListRow = {
  id: string;
  sap_id: string;
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
  status: string;
  is_active: boolean;
  last_synced_at: string | null;
  user_id: string | null;
  user_role: string | null;
  user_status: string | null;
};

type FacultyNameRow = { id: number; name: string };
type DepartmentNameRow = { id: number; name: string; faculty_id: number };
type ProgramNameRow = { id: number; name: string; department_id: number };
type CountRow = { total: number; active: number; inactive: number; last_synced: string | null };

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

export async function GET(request: NextRequest) {
  const admin = await assertActiveAdmin(request);
  if (!admin || !isAdministrator(admin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const url = new URL(request.url);
  const params = url.searchParams;

  const query = params.get("q")?.trim() ?? "";
  const facultyId = params.get("facultyId")?.trim() ?? "";
  const departmentId = params.get("departmentId")?.trim() ?? "";
  const programId = params.get("programId")?.trim() ?? "";
  const status = params.get("status")?.trim() ?? "";
  const role = params.get("role")?.trim() ?? "";
  const designation = params.get("designation")?.trim() ?? "";
  const sort = params.get("sort")?.trim() ?? "name-asc";
  const page = parsePositiveInt(params.get("page"), 1);
  const pageSize = parsePositiveInt(params.get("pageSize"), 20);
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ["fm.deleted_at IS NULL"];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (query) {
    conditions.push(
      `(fm.name ILIKE $${paramIdx} OR fm.email ILIKE $${paramIdx} OR fm.sap_id ILIKE $${paramIdx} OR fm.employee_code ILIKE $${paramIdx})`,
    );
    values.push(`%${query}%`);
    paramIdx++;
  }

  if (facultyId) {
    conditions.push(`fm.faculty_id = $${paramIdx}::bigint`);
    values.push(Number(facultyId));
    paramIdx++;
  }

  if (departmentId) {
    conditions.push(`fm.department_id = $${paramIdx}::bigint`);
    values.push(Number(departmentId));
    paramIdx++;
  }

  if (programId) {
    conditions.push(`fm.program_id = $${paramIdx}::bigint`);
    values.push(Number(programId));
    paramIdx++;
  }

  if (status === "active" || status === "inactive") {
    // Use COALESCE to match the StatusBadge display which shows au.status,
    // falling back to fm.status for faculty members without a user account.
    conditions.push(`COALESCE(au.status::text, fm.status::text) = $${paramIdx}`);
    values.push(status);
    paramIdx++;
  }

  if (role === "administrator" || role === "supervisor" || role === "ireb") {
    // au.role is an admin_role enum; cast the parameter to admin_role so
    // PostgreSQL can compare them (admin_role = text has no operator).
    conditions.push(`au.role = $${paramIdx}::admin_role`);
    values.push(role);
    paramIdx++;
  } else if (role === "none") {
    conditions.push(`au.role IS NULL`);
  }

  if (designation) {
    conditions.push(`LOWER(fm.designation) = LOWER($${paramIdx})`);
    values.push(designation);
    paramIdx++;
  }

  const whereClause = conditions.join(" AND ");

  const sortMap: Record<string, string> = {
    "name-asc": "fm.name ASC",
    "name-desc": "fm.name DESC",
    "sap-id-asc": "fm.sap_id ASC",
    "sap-id-desc": "fm.sap_id DESC",
    "synced-desc": "fm.last_synced_at DESC NULLS LAST",
    "synced-asc": "fm.last_synced_at ASC NULLS LAST",
    "email-asc": "fm.email ASC",
    "email-desc": "fm.email DESC",
  };
  const orderBy = sortMap[sort] ?? "fm.name ASC";

  try {
    const listParams = [...values];
    const listSql = `
      SELECT
        fm.id, fm.sap_id, fm.employee_code, fm.name, fm.email,
        fm.designation, fm.faculty, fm.department, fm.program,
        fm.faculty_id, fm.department_id, fm.program_id,
        fm.status, fm.is_active, fm.last_synced_at,
        au.id AS user_id, au.role AS user_role, au.status AS user_status
      FROM faculty_members fm
      LEFT JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIdx}::int OFFSET $${paramIdx + 1}::int
    `;
    listParams.push(pageSize, offset);

    const countSql = `SELECT COUNT(*)::int AS total FROM faculty_members fm LEFT JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL WHERE ${whereClause}`;
    const statsSql = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'inactive')::int AS inactive,
        MAX(last_synced_at)::text AS last_synced
      FROM faculty_members
      WHERE deleted_at IS NULL
    `;

    const [listResult, countResult, statsResult] = await Promise.all([
      db.query<FacultyMemberListRow>(listSql, listParams),
      db.query<{ total: number }>(countSql, values),
      db.query<CountRow>(statsSql),
    ]);

    // Fetch org names for enrichment
    const facultyIds = [...new Set(listResult.rows.map((r) => r.faculty_id).filter((id): id is number => id != null))];
    const departmentIds = [...new Set(listResult.rows.map((r) => r.department_id).filter((id): id is number => id != null))];
    const programIds = [...new Set(listResult.rows.map((r) => r.program_id).filter((id): id is number => id != null))];

    const [facultiesResult, departmentsResult, programsResult] = await Promise.all([
      facultyIds.length
        ? db.query<FacultyNameRow>(`SELECT id, name FROM faculties WHERE id = ANY($1::bigint[])`, [facultyIds])
        : Promise.resolve({ rows: [] as FacultyNameRow[] }),
      departmentIds.length
        ? db.query<DepartmentNameRow>(`SELECT id, name, faculty_id FROM departments WHERE id = ANY($1::bigint[])`, [departmentIds])
        : Promise.resolve({ rows: [] as DepartmentNameRow[] }),
      programIds.length
        ? db.query<ProgramNameRow>(`SELECT id, name, department_id FROM programs WHERE id = ANY($1::bigint[])`, [programIds])
        : Promise.resolve({ rows: [] as ProgramNameRow[] }),
    ]);

    const facultyMap = new Map(facultiesResult.rows.map((f) => [f.id, f.name]));
    const departmentMap = new Map(departmentsResult.rows.map((d) => [d.id, d.name]));
    const programMap = new Map(programsResult.rows.map((p) => [p.id, p.name]));

    const members = listResult.rows.map((row) => ({
      id: row.id,
      sapId: row.sap_id,
      employeeCode: row.employee_code,
      name: row.name,
      email: row.email,
      designation: row.designation,
      faculty: row.faculty_id ? (facultyMap.get(row.faculty_id) ?? row.faculty) : row.faculty,
      department: row.department_id ? (departmentMap.get(row.department_id) ?? row.department) : row.department,
      program: row.program_id ? (programMap.get(row.program_id) ?? row.program) : row.program,
      facultyId: row.faculty_id,
      departmentId: row.department_id,
      programId: row.program_id,
      status: row.status,
      isActive: row.is_active,
      lastSyncedAt: row.last_synced_at,
      userId: row.user_id,
      userRole: row.user_role,
      userStatus: row.user_status,
    }));

    return NextResponse.json({
      ok: true,
      members,
      total: countResult.rows[0]?.total ?? 0,
      stats: {
        total: statsResult.rows[0]?.total ?? 0,
        active: statsResult.rows[0]?.active ?? 0,
        inactive: statsResult.rows[0]?.inactive ?? 0,
        lastSynced: statsResult.rows[0]?.last_synced ?? null,
      },
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[faculty-members] list failed:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to load faculty members." },
      { status: 500 },
    );
  }
}

// ─── POST: Create Faculty Member + User Account ───

type CreateFacultyBody = {
  name?: string;
  email?: string;
  sapId?: string;
  employeeCode?: string | null;
  designation?: string | null;
  department?: string;
  facultyId?: number | null;
  departmentId?: number | null;
  programId?: number | null;
  role?: string;
  password?: string;
  status?: string;
  // Supervisor scope
  supervisorFacultyId?: number | null;
  supervisorDepartmentId?: number | null;
  supervisorProgramId?: number | null;
  // IREB scope
  irebFacultyIds?: number[];
};

export async function POST(request: NextRequest) {
  const actor = await assertActiveAdmin(request);
  if (!actor || !isAdministrator(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let body: CreateFacultyBody;
  try {
    body = (await request.json()) as CreateFacultyBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!body.name?.trim() || !body.email?.trim() || !body.sapId?.trim()) {
    return NextResponse.json(
      { ok: false, error: "name, email and sapId are required." },
      { status: 400 },
    );
  }

  const role = body.role?.trim() || null;
  if (role && !isAdminRole(role)) {
    return NextResponse.json({ ok: false, error: "Invalid role." }, { status: 400 });
  }

  if (role === "supervisor") {
    if (typeof body.supervisorFacultyId !== "number" || typeof body.supervisorDepartmentId !== "number") {
      return NextResponse.json(
        { ok: false, error: "Supervisor requires faculty and department selection." },
        { status: 400 },
      );
    }
  }

  const email = body.email.trim().toLowerCase();
  const sapId = body.sapId.trim();

  // Check if faculty member already exists by SAP ID or email
  const existingFaculty = await db.query<{ id: string }>(
    `SELECT id FROM faculty_members WHERE (sap_id = $1 OR LOWER(email) = $2) AND deleted_at IS NULL LIMIT 1`,
    [sapId, email],
  );
  if (existingFaculty.rows[0]) {
    return NextResponse.json(
      { ok: false, error: "A faculty member with this SAP ID or email already exists." },
      { status: 409 },
    );
  }

  // Check if admin_users already exists by email
  const existingUser = await getAdminUserByEmail(email);

  try {
    // 1. Create or find the admin_users record
    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
      // Update role if provided and user doesn't have one
      if (role && existingUser.role !== role) {
        await db.query(
          `UPDATE admin_users SET role = $2, updated_at = NOW(), token_version = token_version + 1 WHERE id = $1`,
          [existingUser.id, role],
        );
      }
    } else {
      const passwordHash = body.password ? await hashPassword(body.password) : null;
      const created = await createAdminUser({
        name: body.name.trim(),
        email,
        passwordHash,
        role: role as "administrator" | "supervisor" | "ireb" | null,
        sapId,
        facultyId: body.facultyId ?? null,
        createdBy: actor.adminId,
      });
      userId = created.id;
    }

    // 2. Create the faculty_members record
    const department = body.department?.trim() || "Unknown Department";
    const facultyResult = await db.query<{ name: string }>(
      `SELECT name FROM faculties WHERE id = $1 AND deleted_at IS NULL`,
      [body.facultyId],
    );
    const facultyName = facultyResult.rows[0]?.name ?? null;

    const deptResult = await db.query<{ name: string }>(
      `SELECT name FROM departments WHERE id = $1 AND deleted_at IS NULL`,
      [body.departmentId],
    );
    const deptName = deptResult.rows[0]?.name ?? department;

    const progResult = await db.query<{ name: string }>(
      `SELECT name FROM programs WHERE id = $1 AND deleted_at IS NULL`,
      [body.programId],
    );
    const progName = progResult.rows[0]?.name ?? null;

    const fmResult = await db.query<{ id: string }>(
      `
        INSERT INTO faculty_members (
          user_id, sap_id, employee_code, name, email,
          faculty, department, program, designation,
          faculty_id, department_id, program_id,
          status, is_active, is_google_sso_enabled,
          last_synced_at, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', TRUE, TRUE, NOW(), NOW(), NOW())
        RETURNING id
      `,
      [
        userId,
        sapId,
        body.employeeCode?.trim() ?? null,
        body.name.trim(),
        email,
        facultyName,
        deptName,
        progName,
        body.designation?.trim() ?? null,
        body.facultyId ?? null,
        body.departmentId ?? null,
        body.programId ?? null,
      ],
    );
    const facultyMemberId = fmResult.rows[0].id;

    // 3. Link faculty_members.user_id (already set in INSERT, but ensure)
    await linkFacultyMemberToUser(facultyMemberId, userId);

    // 4. Assign role scope
    if (role === "supervisor" && body.supervisorFacultyId && body.supervisorDepartmentId) {
      await assignSupervisorFaculty({
        adminUserId: userId,
        facultyId: body.supervisorFacultyId,
        departmentId: body.supervisorDepartmentId,
        programId: typeof body.supervisorProgramId === "number" ? body.supervisorProgramId : undefined,
        assignedBy: actor.adminId,
      });
    }

    if (role === "ireb") {
      const irebFacultyIds = Array.isArray(body.irebFacultyIds) ? body.irebFacultyIds : [];
      await applyIrebScope({
        adminUserId: userId,
        facultyIds: irebFacultyIds,
        assignedBy: actor.adminId,
      });
    }

    // 5. Set account status if provided
    if (body.status === "inactive") {
      await db.query(
        `UPDATE admin_users SET status = 'inactive', updated_at = NOW() WHERE id = $1`,
        [userId],
      );
    }

    // 6. Audit log
    void logActivityFromRequest(request, {
      actionCode: "admin.faculty.create",
      targetType: role === "supervisor" ? "supervisor" : role === "ireb" ? "ireb_member" : "administrator",
      targetId: userId,
      targetLabel: body.name.trim(),
      effective: {
        adminId: userId,
        name: body.name.trim(),
        role: (role ?? "faculty") as "administrator" | "supervisor" | "ireb" | "faculty",
      },
    });

    return NextResponse.json({
      ok: true,
      facultyMemberId,
      userId,
    });
  } catch (error) {
    console.error("[faculty-members] create failed:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to create faculty member." },
      { status: 500 },
    );
  }
}
