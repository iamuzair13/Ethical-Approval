import { fetchAllEmployees } from "@/lib/sap-employee";
import {
  getFacultyMemberBySapId,
  upsertFacultyMemberFromSap,
} from "@/lib/faculty-members";

export type SyncFacultyMembersResult =
  | { ok: true; total: number; inserted: number; updated: number; skipped: number; errors: number }
  | { ok: false; errorCode: "SAP_ERROR" | string };

/**
 * Bulk-synchronizes faculty members from SAP empinfoSet into the local
 * faculty_members table. Existing rows are updated by sap_id; missing rows
 * are inserted. Records without a usable email or SAP ID are skipped.
 *
 * This service does not delete or inactivate employees that are absent from SAP;
 * that is a separate future concern.
 */
export async function syncFacultyMembersFromSap(): Promise<SyncFacultyMembersResult> {
  const list = await fetchAllEmployees();
  if (!list.ok) {
    return { ok: false, errorCode: list.errorCode };
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const emp of list.employees) {
    if (!emp.sapId || !emp.email) {
      skipped++;
      continue;
    }

    try {
      const existing = await getFacultyMemberBySapId(emp.sapId);
      await upsertFacultyMemberFromSap({
        sapId: emp.sapId,
        employeeId: emp.employeeId,
        name: emp.employeeName ?? emp.email,
        email: emp.email,
        department: emp.department ?? "Unknown Department",
        designation: emp.designation,
        employeeType: null,
      });

      if (existing) {
        updated++;
      } else {
        inserted++;
      }
    } catch (error) {
      console.error("[sync-faculty-members] Failed to upsert employee:", emp.sapId, error);
      errors++;
    }
  }

  return {
    ok: true,
    total: list.employees.length,
    inserted,
    updated,
    skipped,
    errors,
  };
}
