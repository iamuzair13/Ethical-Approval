import { db } from "@/lib/db";
import type { AuthenticatedAdmin } from "@/lib/admin-auth";
import { resolveFacultyIdsFromSnapshotValue } from "@/lib/admin-repository";

function normalizeNumericIds(values: Array<number | string>): number[] {
  return values
    .map((value) => {
      if (typeof value === "number" && Number.isInteger(value)) return value;
      if (typeof value === "string" && value.trim()) {
        const parsed = Number.parseInt(value.trim(), 10);
        return Number.isInteger(parsed) ? parsed : null;
      }
      return null;
    })
    .filter((value): value is number => value !== null);
}

export type SubmissionRow = {
  id: number;
  application_id: string;
  type: "thesis" | "publication";
  domain: "medical" | "non_medical";
  applicant_role: "student" | "faculty";
  current_status:
    | "draft"
    | "submitted"
    | "under_hod_review"
    | "hod_approved"
    | "hod_rejected"
    | "under_admin_review"
    | "under_ireb_review"
    | "approved"
    | "rejected";
  is_sensitive: boolean;
  assigned_ireb_user_id: string | null;
  submitted_at: Date;
  faculty: string;
  department: string;
  applicant_name: string;
  applicant_email: string;
  applicant_avatar_url: string | null;
  research_title: string | null;
  hod_name_snapshot: string | null;
};

export function canAccessSubmissionStage(
  admin: AuthenticatedAdmin,
  expectedStage: "hod" | "admin" | "ireb",
): boolean {
  if (admin.role === "administrator") return true;
  if (expectedStage === "hod") return admin.role === "hod";
  if (expectedStage === "admin") return false; // only the administrator (IREB chairman) handles the admin stage
  return admin.role === "ireb";
}

export async function canAccessFacultySnapshot(
  admin: AuthenticatedAdmin,
  snapshotFaculty: string,
): Promise<boolean> {
  if (admin.role === "administrator") return true;
  if (admin.scopeMode === "all") return true;

  const snapshotFacultyIds = normalizeNumericIds(
    (await resolveFacultyIdsFromSnapshotValue(snapshotFaculty)) as Array<number | string>,
  );
  const adminFacultyIds = normalizeNumericIds(admin.facultyIds as Array<number | string>);
  if (snapshotFacultyIds.length === 0 || adminFacultyIds.length === 0) return false;
  return snapshotFacultyIds.some((id) => adminFacultyIds.includes(id));
}

const HOD_VISIBLE_STATUSES = [
  "submitted",
  "under_hod_review",
  "hod_rejected",
  "under_admin_review",
  "under_ireb_review",
  "approved",
  "rejected",
];

const IREB_VISIBLE_STATUSES = [
  "under_ireb_review",
  "approved",
  "rejected",
];

// The administrator (IREB chairman) sees every non-draft submission across
// all stages, including the admin review stage and sensitive cases.
const ADMIN_VISIBLE_STATUSES = [
  "submitted",
  "under_hod_review",
  "hod_approved",
  "hod_rejected",
  "under_admin_review",
  "under_ireb_review",
  "approved",
  "rejected",
];

export async function getScopedSubmissions(admin: AuthenticatedAdmin) {
  const roleStatuses =
    admin.role === "administrator"
      ? ADMIN_VISIBLE_STATUSES
      : admin.role === "hod"
        ? HOD_VISIBLE_STATUSES
        : admin.role === "ireb"
          ? IREB_VISIBLE_STATUSES
          : null;

  const statusFilter =
    roleStatuses && roleStatuses.length > 0
      ? `AND s.current_status::text = ANY($1::text[])`
      : "";

  const params: unknown[] = [];
  if (roleStatuses && roleStatuses.length > 0) {
    params.push(roleStatuses);
  }

  // Per-application hod routing: a hod only sees submissions
  // explicitly assigned to them via hod_user_id. Publications (which
  // have no hod_user_id) and legacy thesis submissions are excluded.
  const hodFilter =
    admin.role === "hod" ? `AND s.hod_user_id = $${params.length + 1}` : "";
  if (admin.role === "hod") {
    params.push(admin.adminId);
  }

  // Per-application IREB routing: when an application has been recommended
  // to a specific IREB member (assigned_ireb_user_id), only that IREB
  // member (and administrators) can see it. Other IREB members are
  // excluded. Applications without an assignment remain visible to all
  // faculty-scoped IREB members (legacy behaviour).
  const irebAssignmentFilter =
    admin.role === "ireb"
      ? `AND (s.assigned_ireb_user_id IS NULL OR s.assigned_ireb_user_id = $${params.length + 1})`
      : "";
  if (admin.role === "ireb") {
    params.push(admin.adminId);
  }

  const result = await db.query<SubmissionRow>(
    `
      SELECT
        s.id,
        s.application_id,
        s.type,
        s.domain,
        s.applicant_role,
        s.current_status,
        s.is_sensitive,
        s.assigned_ireb_user_id,
        s.submitted_at,
        sas.faculty,
        sas.department,
        sas.name AS applicant_name,
        sas.email AS applicant_email,
        up.avatar_url AS applicant_avatar_url,
        src.title AS research_title,
        s.hod_name_snapshot
      FROM submissions s
      INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
      LEFT JOIN submission_research_core src ON src.submission_id = s.id
      LEFT JOIN user_profiles up ON up.sap_id = sas.sap_id
      WHERE s.current_status::text <> 'draft'
      ${statusFilter}
      ${hodFilter}
      ${irebAssignmentFilter}
      ORDER BY s.submitted_at DESC
    `,
    params,
  );

  if (admin.role === "administrator" || admin.scopeMode === "all") {
    return result.rows;
  }

  // For hods, the SQL filter already restricted to assigned submissions.
  // For IREB and other restricted roles, apply the faculty-scope filter.
  if (admin.role === "hod") {
    return result.rows;
  }

  const scopedRows: SubmissionRow[] = [];
  for (const row of result.rows) {
    if (await canAccessFacultySnapshot(admin, row.faculty)) {
      scopedRows.push(row);
    }
  }
  return scopedRows;
}
