import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isActingAdministrator } from "@/lib/admin-auth";
import { validateViewAsTarget } from "@/lib/view-as";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";
import { logActivityFromRequest } from "@/lib/activity-log";
import { actorFromAdminUser } from "@/lib/activity-log/descriptions";

type StartBody = {
  targetAdminId?: string;
  role?: "supervisor" | "ireb";
};

export async function POST(request: NextRequest) {
  const actor = await assertActiveAdmin(request);
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const token = await getToken({ req: request, secret: getAuthSecret() });
  if (!isActingAdministrator(token)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as StartBody;
  const targetAdminId = body.targetAdminId?.trim();
  const role = body.role;

  if (!targetAdminId) {
    return NextResponse.json(
      { ok: false, error: "Select a user to view as." },
      { status: 400 },
    );
  }
  if (role !== "supervisor" && role !== "ireb") {
    return NextResponse.json(
      { ok: false, error: "Invalid role. Use supervisor or ireb." },
      { status: 400 },
    );
  }

  const actingAdminId = String(token?.actingAdminId ?? token?.adminId ?? "");
  const validation = await validateViewAsTarget(actingAdminId, targetAdminId, role);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  void logActivityFromRequest(request, {
    actionCode: "admin.view_as.start",
    targetType: validation.target.role === "supervisor" ? "supervisor" : "ireb_member",
    targetId: validation.target.id,
    targetLabel: validation.target.name,
    effective: actorFromAdminUser(validation.target),
    description: `Administrator started viewing as ${validation.target.name}.`,
  });

  return NextResponse.json({
    ok: true,
    target: {
      id: validation.target.id,
      name: validation.target.name,
      email: validation.target.email,
      role: validation.target.role,
    },
  });
}
