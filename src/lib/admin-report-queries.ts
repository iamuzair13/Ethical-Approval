import { db } from "@/lib/db";
import type { AuthenticatedAdmin } from "@/lib/admin-auth";
import { canAccessFacultySnapshot } from "@/lib/authorization";

export type ReportSubmissionRow = {
  application_id: string;
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
  dean_decision_at: Date | null;
  ireb_decision_at: Date | null;
};

/**
 * Loads non-draft submissions with optional submitted_at window (inclusive start, inclusive end).
 */
export async function fetchReportSubmissionRows(
  dateStart: Date | null,
  dateEnd: Date | null,
): Promise<ReportSubmissionRow[]> {
  const hasStart = dateStart != null && !Number.isNaN(dateStart.getTime());
  const hasEnd = dateEnd != null && !Number.isNaN(dateEnd.getTime());

  const whereParts = [`s.current_status <> 'draft'`];
  const params: Date[] = [];
  let i = 1;
  if (hasStart) {
    whereParts.push(`s.submitted_at >= $${i}`);
    params.push(dateStart!);
    i += 1;
  }
  if (hasEnd) {
    whereParts.push(`s.submitted_at <= $${i}`);
    params.push(dateEnd!);
    i += 1;
  }

  const result = await db.query<ReportSubmissionRow>(
    `
      SELECT
        s.application_id,
        s.type,
        s.domain,
        s.applicant_role,
        s.current_status,
        s.submitted_at,
        sas.faculty,
        (
          SELECT MAX(ad.decided_at)
          FROM approval_decisions ad
          WHERE ad.submission_id = s.id
            AND ad.stage = 'dean'
        ) AS dean_decision_at,
        (
          SELECT MAX(ad.decided_at)
          FROM approval_decisions ad
          WHERE ad.submission_id = s.id
            AND ad.stage = 'ireb'
        ) AS ireb_decision_at
      FROM submissions s
      INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
      WHERE ${whereParts.join(" AND ")}
      ORDER BY s.submitted_at ASC
    `,
    params,
  );

  return result.rows;
}

/**
 * Administrator institution-wide reports (types 2–5) skip per-faculty checks.
 * Otherwise rows are filtered like the dashboard using faculty snapshot resolution.
 */
export async function filterReportRowsByScope(
  scopeActor: AuthenticatedAdmin,
  skipFacultyFilter: boolean,
  rows: ReportSubmissionRow[],
): Promise<ReportSubmissionRow[]> {
  if (skipFacultyFilter) {
    return rows;
  }
  const out: ReportSubmissionRow[] = [];
  for (const row of rows) {
    if (await canAccessFacultySnapshot(scopeActor, row.faculty)) {
      out.push(row);
    }
  }
  return out;
}
