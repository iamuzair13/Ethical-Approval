import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { assignDeanFaculty, createAdminUser, getAdminUserByEmail } from "@/lib/admin-repository";
import { hashPassword } from "@/lib/password";

type DeanSeedInput = {
  name: string;
  email: string;
  password: string;
  facultyId: number;
  sapId?: string | null;
};

type BootstrapDeansBody = {
  deans?: DeanSeedInput[];
};

export async function POST(request: NextRequest) {
  const admin = await assertActiveAdmin(request);
  if (!admin || !isAdministrator(admin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let body: BootstrapDeansBody;
  try {
    body = (await request.json()) as BootstrapDeansBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const deans = Array.isArray(body.deans) ? body.deans : [];
  if (deans.length === 0) {
    return NextResponse.json({ ok: false, error: "deans list is required." }, { status: 400 });
  }

  const created: string[] = [];
  const skipped: string[] = [];
  for (const dean of deans) {
    const existing = await getAdminUserByEmail(dean.email);
    if (existing) {
      skipped.push(dean.email);
      continue;
    }

    const user = await createAdminUser({
      name: dean.name,
      email: dean.email,
      passwordHash: await hashPassword(dean.password),
      role: "dean",
      sapId: dean.sapId ?? null,
      facultyId: dean.facultyId,
      createdBy: admin.adminId,
    });

    await assignDeanFaculty({
      adminUserId: user.id,
      facultyId: dean.facultyId,
      assignedBy: admin.adminId,
    });
    created.push(dean.email);
  }

  return NextResponse.json({ ok: true, created, skipped });
}
