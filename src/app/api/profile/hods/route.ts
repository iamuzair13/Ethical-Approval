import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import {
  listHodsForDepartment,
  getHodForSelection,
} from "@/lib/hod-selection";

/**
 * GET /api/profile/hods?departmentId=<id>
 * GET /api/profile/hods?hodUserId=<uuid>
 *
 * Two modes:
 *   1. `departmentId` query param — returns the list of active HODs in
 *      that department (used to populate the HOD dropdown after the
 *      student selects a Department).
 *   2. `hodUserId` query param — returns a single HOD's full
 *      details (used to auto-fill the read-only HOD fields after the
 *      student selects a HOD, and to rehydrate a saved draft).
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
  const hodUserId = searchParams.get("hodUserId")?.trim() ?? "";

  if (hodUserId) {
    const hod = await getHodForSelection(hodUserId);
    if (!hod) {
      return NextResponse.json(
        { ok: false, error: "HOD not found or not eligible." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, hod });
  }

  const departmentId = Number(departmentIdRaw);
  if (!departmentIdRaw || !Number.isInteger(departmentId) || departmentId <= 0) {
    return NextResponse.json(
      { ok: false, error: "departmentId query parameter is required." },
      { status: 400 },
    );
  }

  const hods = await listHodsForDepartment(departmentId);
  return NextResponse.json({ ok: true, hods });
}
