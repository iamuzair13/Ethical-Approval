import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin } from "@/lib/admin-auth";
import { getScopedSubmissions } from "@/lib/authorization";

export async function GET(request: NextRequest) {
  const admin = await assertActiveAdmin(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const submissions = await getScopedSubmissions(admin);
  return NextResponse.json({ ok: true, submissions });
}
