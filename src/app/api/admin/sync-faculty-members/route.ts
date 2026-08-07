import { NextResponse } from "next/server";
import { assertActiveAdmin } from "@/lib/admin-auth";
import { isAdministrator } from "@/lib/admin-auth";
import { syncFacultyMembersFromSap } from "@/lib/sap/sync-faculty-members";
import { logActivityFromRequest } from "@/lib/activity-log";

/**
 * POST /api/admin/sync-faculty-members
 *
 * Triggers a one-way bulk synchronization of faculty/staff records from SAP
 * into the internal faculty_members table. Existing records are updated by
 * sap_id; new records are inserted. No records are deleted or inactivated.
 *
 * Restricted to active administrators.
 */
export async function POST(request: Request) {
  const admin = await assertActiveAdmin(request);
  if (!admin || !isAdministrator(admin)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const result = await syncFacultyMembersFromSap();

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.errorCode }, { status: 502 });
  }

  void logActivityFromRequest(request, {
    actionCode: "admin.faculty.sync",
    targetType: "system",
    targetId: "sap-faculty-sync",
    targetLabel: "SAP faculty sync",
    metadata: {
      total: result.total,
      inserted: result.inserted,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors,
    },
  });

  return NextResponse.json(result);
}
