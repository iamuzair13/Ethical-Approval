import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import {
  applyIrebScope,
  assignDeanFaculty,
  createAdminUser,
  getAdminUserByEmail,
} from "@/lib/admin-repository";
import { hashPassword } from "@/lib/password";
import { isAdminRole } from "@/lib/admin-rbac";
import { logActivityFromRequest } from "@/lib/activity-log";

type CreateAdminBody = {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  sapId?: string | null;
  facultyId?: number | null;
  facultyIds?: number[];
  departmentId?: number | null;
  departmentIds?: number[];
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
  if (body.role === "dean" && (typeof body.facultyId !== "number" || typeof body.departmentId !== "number")) {
    return NextResponse.json(
      { ok: false, error: "Dean requires faculty and department selection." },
      { status: 400 },
    );
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

  if (created.role === "dean" && body.facultyId && body.departmentId) {
    await assignDeanFaculty({
      adminUserId: created.id,
      facultyId: body.facultyId,
      departmentId: body.departmentId,
      assignedBy: actor.adminId,
    });
  }

  if (created.role === "ireb") {
    const facultyIds = Array.isArray(body.facultyIds) ? body.facultyIds : [];
    await applyIrebScope({
      adminUserId: created.id,
      facultyIds,
      assignedBy: actor.adminId,
    });
  }

  const targetType =
    created.role === "dean"
      ? "dean"
      : created.role === "ireb"
        ? "ireb_member"
        : "administrator";

  void logActivityFromRequest(request, {
    actionCode: "admin.user.create",
    targetType,
    targetId: created.id,
    targetLabel: created.name,
    effective: {
      adminId: created.id,
      name: created.name,
      role: created.role,
    },
  });

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
