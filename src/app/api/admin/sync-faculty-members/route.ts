import { NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { syncFacultyMembersFromSap } from "@/lib/sap/sync-faculty-members";
import { logActivityFromRequest } from "@/lib/activity-log";

// Allow up to 5 minutes for the sync to complete (SAP may return 24k+ records)
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/sync-faculty-members
 *
 * Triggers the complete synchronization pipeline:
 *   1. Fetch all employees from SAP EmployeeSet
 *   2. Filter for active academic faculty
 *   3. Upsert faculty_members (insert or update by email)
 *   4. Resolve department → faculty_id + department_id from DB hierarchy
 *   5. Update faculty_id & department_id on every faculty member
 *   6. Produce synchronization summary
 *
 * Organization mapping runs on every sync for both new and existing members.
 * If a department cannot be mapped, the member is still saved but without
 * faculty_id/department_id, and the failure is logged.
 *
 * Restricted to active administrators.
 */
export async function POST(request: Request) {
  const admin = await assertActiveAdmin(request);
  if (!admin || !isAdministrator(admin)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let result;
  try {
    result = await syncFacultyMembersFromSap();
  } catch (err) {
    console.error("[sync-faculty-members] Unhandled error:", err);
    return NextResponse.json(
      { ok: false, error: "SYNC_INTERNAL_ERROR", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.errorCode }, { status: 502 });
  }

  void logActivityFromRequest(request, {
    actionCode: "admin.faculty.sync",
    targetType: "system",
    targetId: "sap-faculty-sync",
    targetLabel: "SAP faculty sync",
    metadata: {
      syncHistoryId: result.syncHistoryId,
      ...result.report,
    },
  });

  return NextResponse.json({
    ok: true,
    syncHistoryId: result.syncHistoryId,
    ...result.report,
  });
}
