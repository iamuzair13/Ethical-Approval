import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { listHodDepartments } from "@/lib/hod-selection";

/**
 * GET /api/profile/hod-departments
 *
 * Returns all active departments from the centralized `departments` table.
 * Used by the student thesis forms to populate the Department dropdown (the
 * first step of the Department -> HOD selection flow).
 *
 * Available to authenticated students and administrators.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const isStudent = Boolean(session?.user?.sapId);
  const admin = await assertActiveAdmin(request);
  const isAdmin = Boolean(admin && isAdministrator(admin));

  if (!isStudent && !isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const departments = await listHodDepartments();
  return NextResponse.json({ ok: true, departments });
}
