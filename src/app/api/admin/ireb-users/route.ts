import { NextResponse } from "next/server";
import { assertActiveAdmin } from "@/lib/admin-auth";
import { listActiveIrebForViewAs } from "@/lib/admin-repository";

export async function GET(request: Request) {
  const admin = await assertActiveAdmin(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (admin.role !== "administrator") {
    return NextResponse.json(
      { ok: false, error: "Only administrators can list IREB users." },
      { status: 403 },
    );
  }

  const users = await listActiveIrebForViewAs();
  return NextResponse.json({
    ok: true,
    users: users.map((u) => ({ id: u.id, name: u.name, email: u.email })),
  });
}
