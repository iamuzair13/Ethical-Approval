import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isActingAdministrator } from "@/lib/admin-auth";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";
import { logActivityFromRequest } from "@/lib/activity-log";

export async function POST(request: NextRequest) {
  const actor = await assertActiveAdmin(request);
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const token = await getToken({ req: request, secret: getAuthSecret() });
  if (!isActingAdministrator(token)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  void logActivityFromRequest(request, {
    actionCode: "admin.view_as.stop",
    targetType: "system",
    description: "Administrator stopped view-as session.",
  });

  return NextResponse.json({ ok: true });
}
