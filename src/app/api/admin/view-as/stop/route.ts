import { NextRequest, NextResponse } from "next/server";
import { assertActingAdministrator } from "@/lib/admin-auth";
import { logActivityFromRequest } from "@/lib/activity-log";

export async function POST(request: NextRequest) {
  // Auth check targets the *acting* administrator, not the effective
  // identity — the effective user can be a student during view-as.
  const actor = await assertActingAdministrator(request);
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  void logActivityFromRequest(request, {
    actionCode: "admin.view_as.stop",
    targetType: "system",
    description: "Administrator stopped view-as session.",
  });

  return NextResponse.json({ ok: true });
}
