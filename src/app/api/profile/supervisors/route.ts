import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import {
  listSupervisorsForDepartment,
  getSupervisorForSelection,
} from "@/lib/supervisor-selection";

/**
 * GET /api/profile/supervisors?departmentId=<id>
 * GET /api/profile/supervisors?supervisorUserId=<uuid>
 *
 * Two modes:
 *   1. `departmentId` query param — returns the list of active supervisors in
 *      that department (used to populate the Supervisor dropdown after the
 *      student selects a Department).
 *   2. `supervisorUserId` query param — returns a single supervisor's full
 *      details (used to auto-fill the read-only supervisor fields after the
 *      student selects a Supervisor, and to rehydrate a saved draft).
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

  const { searchParams } = new URL(request.url);
  const departmentIdRaw = searchParams.get("departmentId")?.trim() ?? "";
  const supervisorUserId = searchParams.get("supervisorUserId")?.trim() ?? "";

  if (supervisorUserId) {
    const supervisor = await getSupervisorForSelection(supervisorUserId);
    if (!supervisor) {
      return NextResponse.json(
        { ok: false, error: "Supervisor not found or not eligible." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, supervisor });
  }

  const departmentId = Number(departmentIdRaw);
  if (!departmentIdRaw || !Number.isInteger(departmentId) || departmentId <= 0) {
    return NextResponse.json(
      { ok: false, error: "departmentId query parameter is required." },
      { status: 400 },
    );
  }

  const supervisors = await listSupervisorsForDepartment(departmentId);
  return NextResponse.json({ ok: true, supervisors });
}
