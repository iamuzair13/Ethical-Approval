import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import {
  assignDeanFaculty,
  assignIrebFaculties,
  createAdminUser,
  getAdminUserByEmail,
} from "@/lib/admin-repository";
import { hashPassword } from "@/lib/password";
import { isAdminRole } from "@/lib/admin-rbac";

type CreateAdminBody = {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  sapId?: string | null;
  facultyId?: number | null;
  facultyIds?: number[];
};

export async function POST(request: NextRequest) {
  const actor = await assertActiveAdmin(request);
  if (!actor || !isAdministrator(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let body: CreateAdminBody;
  try {
    body = (await request.json()) as CreateAdminBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!body.name?.trim() || !body.email?.trim() || !body.password || !body.role) {
    return NextResponse.json(
      { ok: false, error: "name, email, password and role are required." },
      { status: 400 },
    );
  }
  if (!isAdminRole(body.role)) {
    return NextResponse.json({ ok: false, error: "Invalid role." }, { status: 400 });
  }

  const existing = await getAdminUserByEmail(body.email);
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "An admin with this email already exists." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(body.password);
  const created = await createAdminUser({
    name: body.name,
    email: body.email,
    passwordHash,
    role: body.role,
    sapId: body.sapId ?? null,
    facultyId: body.facultyId ?? null,
    createdBy: actor.adminId,
  });

  if (created.role === "dean" && body.facultyId) {
    await assignDeanFaculty({
      adminUserId: created.id,
      facultyId: body.facultyId,
      assignedBy: actor.adminId,
    });
  }

  if (created.role === "ireb" && Array.isArray(body.facultyIds)) {
    await assignIrebFaculties({
      adminUserId: created.id,
      facultyIds: body.facultyIds,
      assignedBy: actor.adminId,
    });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      status: created.status,
      sapId: created.sapId,
    },
  });
}
