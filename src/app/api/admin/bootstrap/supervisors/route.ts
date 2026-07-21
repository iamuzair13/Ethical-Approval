import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { assignSupervisorFaculty, createAdminUser, getAdminUserByEmail } from "@/lib/admin-repository";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

type SupervisorSeedInput = {
  name: string;
  email: string;
  password: string;
  facultyId: number;
  departmentId?: number;
  sapId?: string | null;
};

type BootstrapSupervisorsBody = {
  supervisors?: SupervisorSeedInput[];
};

export async function POST(request: NextRequest) {
  const admin = await assertActiveAdmin(request);
  if (!admin || !isAdministrator(admin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let body: BootstrapSupervisorsBody;
  try {
    body = (await request.json()) as BootstrapSupervisorsBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const supervisors = Array.isArray(body.supervisors) ? body.supervisors : [];
  if (supervisors.length === 0) {
    return NextResponse.json({ ok: false, error: "supervisors list is required." }, { status: 400 });
  }

  const created: string[] = [];
  const skipped: string[] = [];
  for (const supervisor of supervisors) {
    const existing = await getAdminUserByEmail(supervisor.email);
    if (existing) {
      skipped.push(supervisor.email);
      continue;
    }

    const resolvedDepartmentId =
      typeof supervisor.departmentId === "number" && Number.isInteger(supervisor.departmentId) && supervisor.departmentId > 0
        ? supervisor.departmentId
        : await (async () => {
            const deptResult = await db.query<{ id: number }>(
              `
                SELECT id
                FROM departments
                WHERE faculty_id = $1
                  AND deleted_at IS NULL
                ORDER BY id ASC
                LIMIT 1
              `,
              [supervisor.facultyId],
            );
            return deptResult.rows[0]?.id ?? null;
          })();

    if (resolvedDepartmentId == null) {
      skipped.push(`${supervisor.email} (no department found for faculty ${supervisor.facultyId})`);
      continue;
    }

    const user = await createAdminUser({
      name: supervisor.name,
      email: supervisor.email,
      passwordHash: await hashPassword(supervisor.password),
      role: "supervisor",
      sapId: supervisor.sapId ?? null,
      facultyId: supervisor.facultyId,
      createdBy: admin.adminId,
    });

    await assignSupervisorFaculty({
      adminUserId: user.id,
      facultyId: supervisor.facultyId,
      departmentId: resolvedDepartmentId,
      assignedBy: admin.adminId,
    });
    created.push(supervisor.email);
  }

  return NextResponse.json({ ok: true, created, skipped });
}
