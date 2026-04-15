import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { isAdminRole } from "@/lib/admin-rbac";
import {
  getAdminUserByEmailExcludingId,
  updateAdminUser,
} from "@/lib/admin-repository";
import { hashPassword } from "@/lib/password";

type UpdateAdminBody = {
  name?: string;
  email?: string;
  role?: string;
  sapId?: string | null;
  password?: string;
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
