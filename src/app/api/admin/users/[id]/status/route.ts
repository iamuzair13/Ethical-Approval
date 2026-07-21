import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { getAdminUserById, setAdminStatus } from "@/lib/admin-repository";
import { logActivityFromRequest } from "@/lib/activity-log";

type StatusBody = {
  status?: "active" | "inactive";
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
  let body: StatusBody;
  try {
    body = (await request.json()) as StatusBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (body.status !== "active" && body.status !== "inactive") {
    return NextResponse.json(
      { ok: false, error: "status must be active or inactive." },
      { status: 400 },
    );
  }

  const previous = await getAdminUserById(id);
  const updated = await setAdminStatus(id, body.status);
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Admin user not found." }, { status: 404 });
  }

  const targetType =
    updated.role === "supervisor"
      ? "supervisor"
      : updated.role === "ireb"
        ? "ireb_member"
        : "administrator";

  void logActivityFromRequest(request, {
    actionCode:
      body.status === "active" ? "admin.user.activate" : "admin.user.deactivate",
    targetType,
    targetId: updated.id,
    targetLabel: updated.name,
    effective: {
      adminId: updated.id,
      name: updated.name,
      role: updated.role,
    },
    metadata: { previousStatus: previous?.status },
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: updated.id,
      status: updated.status,
    },
  });
}
