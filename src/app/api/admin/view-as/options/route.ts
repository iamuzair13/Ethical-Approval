import { NextRequest, NextResponse } from "next/server";
import {
  assertActiveAdmin,
  isActingAdministrator,
} from "@/lib/admin-auth";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";
import {
  listActiveDeansForReportPicker,
  listActiveIrebForViewAs,
} from "@/lib/admin-repository";

export async function GET(request: NextRequest) {
  const actor = await assertActiveAdmin(request);
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const token = await getToken({ req: request, secret: getAuthSecret() });
  if (!isActingAdministrator(token)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const role = request.nextUrl.searchParams.get("role");
  if (role !== "dean" && role !== "ireb") {
    return NextResponse.json(
      { ok: false, error: "Invalid role. Use dean or ireb." },
      { status: 400 },
    );
  }

  const users =
    role === "dean"
      ? await listActiveDeansForReportPicker()
      : await listActiveIrebForViewAs();

  return NextResponse.json({ ok: true, users, role });
}
