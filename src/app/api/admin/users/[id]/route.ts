import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { isAdminRole } from "@/lib/admin-rbac";
import {
  applyIrebScope,
  assignSupervisorFaculty,
  clearAdminScopeAssignments,
  deleteAdminUser,
  getAdminUserByEmailExcludingId,
  getAdminUserById,
  updateAdminUser,
} from "@/lib/admin-repository";
import { hashPassword } from "@/lib/password";
import { logActivityFromRequest } from "@/lib/activity-log";

type UpdateAdminBody = {
  name?: string;
  email?: string;
  role?: string;
  sapId?: string | null;
  password?: string;
  facultyId?: number | null;
  departmentId?: number | null;
  facultyIds?: number[];
  departmentIds?: number[];
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await assertActiveAdmin(request);
  if (!actor || !isAdministrator(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const { id } = await context.params;
  let body: UpdateAdminBody;
  try {
    body = (await request.json()) as UpdateAdminBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!body.name?.trim() || !body.email?.trim() || !body.role) {
    return NextResponse.json(
      { ok: false, error: "name, email and role are required." },
      { status: 400 },
    );
  }
  if (!isAdminRole(body.role)) {
    return NextResponse.json({ ok: false, error: "Invalid role." }, { status: 400 });
  }

  const previous = await getAdminUserById(id);
  if (!previous) {
    return NextResponse.json({ ok: false, error: "Admin user not found." }, { status: 404 });
  }

  if (body.role === "supervisor") {
    if (typeof body.facultyId !== "number" || typeof body.departmentId !== "number") {
      return NextResponse.json(
        { ok: false, error: "Supervisor requires faculty and department selection." },
        { status: 400 },
      );
    }
  }

  const existing = await getAdminUserByEmailExcludingId({
    email: body.email,
    excludeAdminId: id,
  });
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "Another admin already uses this email." },
      { status: 409 },
    );
  }

  const passwordHash =
    body.password && body.password.trim().length > 0
      ? await hashPassword(body.password)
      : undefined;

  const updated = await updateAdminUser({
    id,
    name: body.name,
    email: body.email,
    role: body.role,
    sapId: body.sapId ?? null,
    passwordHash,
  });

  if (!updated) {
    return NextResponse.json({ ok: false, error: "Admin user not found." }, { status: 404 });
  }

  const roleChanged = previous.role !== updated.role;

  if (roleChanged) {
    await clearAdminScopeAssignments(id);
  }

  if (updated.role === "supervisor") {
    await assignSupervisorFaculty({
      adminUserId: id,
      facultyId: body.facultyId!,
      departmentId: body.departmentId!,
      assignedBy: actor.adminId,
    });
  } else if (updated.role === "ireb") {
    const facultyIds = Array.isArray(body.facultyIds) ? body.facultyIds : [];
    await applyIrebScope({
      adminUserId: id,
      facultyIds,
      assignedBy: actor.adminId,
    });
  }

  const targetType =
    updated.role === "supervisor"
      ? "supervisor"
      : updated.role === "ireb"
        ? "ireb_member"
        : "administrator";

  void logActivityFromRequest(request, {
    actionCode: passwordHash ? "admin.user.password_reset" : "admin.user.update",
    targetType,
    targetId: updated.id,
    targetLabel: updated.name,
    effective: {
      adminId: updated.id,
      name: updated.name,
      role: updated.role,
    },
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      sapId: updated.sapId,
    },
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await assertActiveAdmin(request);
  if (!actor || !isAdministrator(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const { id } = await context.params;

  if (id === actor.adminId) {
    return NextResponse.json(
      { ok: false, error: "You cannot delete your own account." },
      { status: 400 },
    );
  }

  const existing = await getAdminUserById(id);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Admin user not found." }, { status: 404 });
  }

  const deleted = await deleteAdminUser(id);
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "Admin user not found." }, { status: 404 });
  }

  const targetType =
    existing.role === "supervisor"
      ? "supervisor"
      : existing.role === "ireb"
        ? "ireb_member"
        : "administrator";

  void logActivityFromRequest(request, {
    actionCode: "admin.user.delete",
    targetType,
    targetId: existing.id,
    targetLabel: existing.name,
    effective: {
      adminId: existing.id,
      name: existing.name,
      role: existing.role,
    },
  });

  return NextResponse.json({ ok: true });
}
