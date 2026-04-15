import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { listAdminUsersForManagement } from "@/lib/admin-repository";

export async function GET(request: NextRequest) {
  const actor = await assertActiveAdmin(request);
  if (!actor || !isAdministrator(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const users = await listAdminUsersForManagement();
  return NextResponse.json({ ok: true, users });
}
