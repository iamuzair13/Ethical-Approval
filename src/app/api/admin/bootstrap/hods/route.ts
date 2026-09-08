import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { assignHodFaculty, createAdminUser, getAdminUserByEmail } from "@/lib/admin-repository";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

type HodSeedInput = {
  name: string;
  email: string;
  password: string;
  facultyId: number;
  departmentId?: number;
  sapId?: string | null;
};

type BootstrapHodsBody = {
  hods?: HodSeedInput[];
};

export async function POST(request: NextRequest) {
  const admin = await assertActiveAdmin(request);
  if (!admin || !isAdministrator(admin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let body: BootstrapHodsBody;
  try {
    body = (await request.json()) as BootstrapHodsBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const hods = Array.isArray(body.hods) ? body.hods : [];
  if (hods.length === 0) {
    return NextResponse.json({ ok: false, error: "hods list is required." }, { status: 400 });
  }

  const created: string[] = [];
  const skipped: string[] = [];
  for (const hod of hods) {
    const existing = await getAdminUserByEmail(hod.email);
    if (existing) {
      skipped.push(hod.email);
      continue;
    }

    const resolvedDepartmentId =
      typeof hod.departmentId === "number" && Number.isInteger(hod.departmentId) && hod.departmentId > 0
        ? hod.departmentId
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
              [hod.facultyId],
            );
            return deptResult.rows[0]?.id ?? null;
          })();

    if (resolvedDepartmentId == null) {
      skipped.push(`${hod.email} (no department found for faculty ${hod.facultyId})`);
      continue;
    }

    const user = await createAdminUser({
      name: hod.name,
      email: hod.email,
      passwordHash: hod.password ? await hashPassword(hod.password) : null,
      role: "hod",
      sapId: hod.sapId ?? null,
      facultyId: hod.facultyId,
      createdBy: admin.adminId,
    });

    await assignHodFaculty({
      adminUserId: user.id,
      facultyId: hod.facultyId,
      departmentId: resolvedDepartmentId,
      assignedBy: admin.adminId,
    });
    created.push(hod.email);
  }

  return NextResponse.json({ ok: true, created, skipped });
}
