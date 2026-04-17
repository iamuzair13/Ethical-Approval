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
  type: "thesis" | "publication";
  domain: "medical" | "non_medical";
  applicant_role: "student" | "faculty";
  current_status:
    | "submitted"
    | "under_dean_review"
    | "dean_approved"
    | "dean_rejected"
    | "under_ireb_review"
    | "approved"
    | "rejected";
  submitted_at: Date;
  faculty: string;
  department: string;
  applicant_name: string;
  applicant_email: string;
};

export function canAccessSubmissionStage(
  admin: AuthenticatedAdmin,
  expectedStage: "dean" | "ireb",
): boolean {
  if (admin.role === "administrator") return true;
  if (expectedStage === "dean") return admin.role === "dean";
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

export async function getScopedSubmissions(admin: AuthenticatedAdmin) {
  const result = await db.query<SubmissionRow>(
    `
      SELECT
        s.id,
        s.type,
        s.domain,
        s.applicant_role,
        s.current_status,
        s.submitted_at,
        sas.faculty,
        sas.department,
        sas.name AS applicant_name,
        sas.email AS applicant_email
      FROM submissions s
      INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
      ORDER BY s.submitted_at DESC
    `,
  );

  if (admin.role === "administrator" || admin.scopeMode === "all") {
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
