/**
 * SAP → faculty_members bulk synchronization service.
 *
 * Complete pipeline (runs every time the Sync button is pressed):
 *   1. Create a faculty_sync_history row (status = 'running').
 *   2. Load the department cache for org mapping.
 *   3. Fetch all employees from SAP EmployeeSet.
 *   4. Filter for active academic faculty.
 *   5. Upsert faculty_members (insert or update by email).
 *   6. Resolve department → faculty_id + department_id from DB hierarchy.
 *   7. Update faculty_id & department_id on every faculty member.
 *   8. Log mapping failures to faculty_sync_errors.
 *   9. Update the sync_history row with final counts and status.
 *
 * Organization mapping runs on EVERY sync, for both new and existing
 * faculty members. This ensures that if department mappings are corrected,
 * new departments are added, or faculty hierarchy changes, all faculty
 * members automatically receive the correct faculty on the next sync.
 *
 * If a department cannot be mapped, the faculty member is still
 * inserted/updated but without faculty_id/department_id. The failure is
 * recorded in the sync report and error log.
 *
 * Report counts:
 *   - totalRecords:         Total employees fetched from SAP
 *   - academicEmployees:    Passed active + academic checks
 *   - inserted:             New faculty_members rows created
 *   - updated:              Existing faculty_members rows updated
 *   - facultyMapped:        Successfully mapped to department + faculty
 *   - facultyMappingFailed: Organization mapping failed (dept not found)
 *   - departmentNotFound:   Department text didn't match any DB department
 *   - skipped:              Filtered out (email, status, sector, designation)
 *   - failed:               Upsert errors
 */

import { db } from "@/lib/db";
import { fetchAllEmployees } from "@/lib/sap-employee";
import { filterFacultyMember } from "@/lib/sap/faculty-filter";
import {
  getFacultyMemberByEmail,
  upsertFacultyMemberFromSync,
  linkFacultyMemberToUser,
} from "@/lib/faculty-members";
import { findOrCreateUserForFaculty } from "@/lib/admin-repository";
import {
  loadDepartmentCache,
  clearDepartmentCache,
} from "@/lib/org-mapping";
import type { NormalizedFacultyMember } from "@/lib/sap/faculty-filter";

export type SyncReport = {
  totalRecords: number;
  academicEmployees: number;
  inserted: number;
  updated: number;
  facultyMapped: number;
  facultyMappingFailed: number;
  departmentNotFound: number;
  skipped: number;
  failed: number;
};

export type SyncFacultyMembersResult =
  | {
      ok: true;
      syncHistoryId: number;
      report: SyncReport;
    }
  | { ok: false; errorCode: string; syncHistoryId: number | null };

type SyncHistoryRow = { id: number };

async function createSyncHistory(): Promise<number> {
  const result = await db.query<SyncHistoryRow>(
    `
      INSERT INTO faculty_sync_history (started_at, status)
      VALUES (NOW(), 'running')
      RETURNING id
    `,
  );
  return result.rows[0].id;
}

async function completeSyncHistory(
  syncHistoryId: number,
  status: "completed" | "failed",
  report: SyncReport,
): Promise<void> {
  await db.query(
    `
      UPDATE faculty_sync_history
      SET
        completed_at = NOW(),
        total_records = $2,
        inserted_count = $3,
        updated_count = $4,
        skipped_count = $5,
        failed_count = $6,
        status = $7
      WHERE id = $1
    `,
    [
      syncHistoryId,
      report.totalRecords,
      report.inserted,
      report.updated,
      report.skipped,
      report.failed,
      status,
    ],
  );
}

async function logSyncError(
  syncHistoryId: number,
  sapId: string | null,
  reason: string,
  rawData: Record<string, unknown>,
): Promise<void> {
  try {
    await db.query(
      `
        INSERT INTO faculty_sync_errors (sync_history_id, sap_id, reason, raw_data, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `,
      [syncHistoryId, sapId, reason, JSON.stringify(rawData)],
    );
  } catch (err) {
    console.error("[sync-faculty-members] Failed to log sync error:", err);
  }
}

export async function syncFacultyMembersFromSap(): Promise<SyncFacultyMembersResult> {
  const syncHistoryId = await createSyncHistory();

  // Pre-load the department cache for org mapping during this sync run.
  // This cache is used by resolveOrgFromDepartment() inside filterFacultyMember().
  await loadDepartmentCache();

  const report: SyncReport = {
    totalRecords: 0,
    academicEmployees: 0,
    inserted: 0,
    updated: 0,
    facultyMapped: 0,
    facultyMappingFailed: 0,
    departmentNotFound: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    const list = await fetchAllEmployees();
    if (!list.ok) {
      await completeSyncHistory(syncHistoryId, "failed", report);
      return { ok: false, errorCode: list.errorCode, syncHistoryId };
    }

    report.totalRecords = list.employees.length;

    for (const emp of list.employees) {
      // Filter the record through the eligibility pipeline.
      // filterFacultyMember() also resolves org mapping. If the department
      // can't be matched, the employee is still returned (ok: true) but with
      // orgMappingFailed = true and null facultyId/departmentId.
      const filterResult = await filterFacultyMember(emp);

      if (!filterResult.ok) {
        // Employee was filtered out entirely (not active, not academic,
        // invalid email, student email, designation not allowed, etc.)
        report.skipped++;

        await logSyncError(
          syncHistoryId,
          filterResult.rejection.sapId,
          filterResult.rejection.reason,
          filterResult.rejection.rawData,
        );
        continue;
      }

      // Employee passed all filters — count as academic
      report.academicEmployees++;

      const normalized: NormalizedFacultyMember = filterResult.normalized;

      // Track org mapping results
      if (normalized.orgMappingFailed) {
        report.facultyMappingFailed++;
        if (normalized.orgMappingReason === "DEPARTMENT_NOT_FOUND") {
          report.departmentNotFound++;
        }

        // Log the mapping failure for future correction
        await logSyncError(
          syncHistoryId,
          normalized.sapId,
          normalized.orgMappingReason ?? "ORG_MAPPING_FAILED",
          {
            email: normalized.email,
            department: normalized.departmentText,
            sapId: normalized.sapId,
          },
        );
      } else {
        report.facultyMapped++;
      }

      // Upsert the faculty member (with or without org IDs).
      // The ON CONFLICT on email handles insert vs update atomically.
      try {
        const existing = await getFacultyMemberByEmail(normalized.email, {
          includeInactive: true,
        });
        const facultyMember = await upsertFacultyMemberFromSync(normalized);

        // Ensure a unified admin_users record exists for this faculty member
        const user = await findOrCreateUserForFaculty({
          name: normalized.name || facultyMember.name,
          email: normalized.email,
          sapId: normalized.sapId,
        });

        // Link faculty_members.user_id to admin_users.id
        await linkFacultyMemberToUser(facultyMember.id, user.id);

        if (existing) {
          report.updated++;
        } else {
          report.inserted++;
        }
      } catch (error) {
        report.failed++;
        console.error(
          "[sync-faculty-members] Failed to upsert faculty member:",
          normalized.sapId,
          error,
        );
        await logSyncError(
          syncHistoryId,
          normalized.sapId,
          "UPSERT_ERROR",
          { ...normalized, error: String(error) },
        );
      }
    }

    await completeSyncHistory(syncHistoryId, "completed", report);

    return {
      ok: true,
      syncHistoryId,
      report,
    };
  } finally {
    clearDepartmentCache();
  }
}
