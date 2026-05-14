import { db } from "@/lib/db";

/**
 * Count of all non-draft submissions (institution-wide), same date window semantics as catalog reports.
 */
export async function fetchInstitutionNonDraftSubmissionCount(
  dateStart: Date | null,
  dateEnd: Date | null,
): Promise<number> {
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
  const result = await db.query<{ c: string }>(
    `
      SELECT COUNT(*)::text AS c
      FROM submissions s
      WHERE ${whereParts.join(" AND ")}
    `,
    params,
  );
  const n = Number.parseInt(result.rows[0]?.c ?? "0", 10);
  return Number.isFinite(n) ? n : 0;
}

/** Comma-separated faculty names for active faculties in scope. */
export async function fetchFacultyNamesForIds(facultyIds: number[]): Promise<string> {
  if (facultyIds.length === 0) return "—";
  const result = await db.query<{ name: string }>(
    `
      SELECT f.name
      FROM faculties f
      WHERE f.is_active = TRUE
        AND f.id = ANY($1::int[])
      ORDER BY LOWER(f.name) ASC
    `,
    [facultyIds],
  );
  const names = result.rows.map((r) => r.name.trim()).filter(Boolean);
  return names.length > 0 ? names.join(", ") : "—";
}

/**
 * For dean-rejected applications: "Yes" only if every row has a non-empty comment
 * on the latest dean-stage rejection decision; "No" if any is missing; "N/A" if none.
 */
export async function classifyDeanRejectionReasonStated(
  applicationIds: string[],
): Promise<"Yes" | "No" | "N/A"> {
  if (applicationIds.length === 0) return "N/A";
  const result = await db.query<{ application_id: string; comment: string | null }>(
    `
      SELECT
        s.application_id,
        TRIM(COALESCE(
          (
            SELECT ad.comment
            FROM approval_decisions ad
            WHERE ad.submission_id = s.id
              AND ad.stage = 'dean'
              AND ad.decision = 'rejected'
            ORDER BY ad.decided_at DESC
            LIMIT 1
          ),
          ''
        )) AS comment
      FROM submissions s
      WHERE s.application_id = ANY($1::varchar(6)[])
        AND s.current_status = 'dean_rejected'
    `,
    [applicationIds],
  );
  if (result.rows.length === 0) return "N/A";
  const allStated = result.rows.every((r) => (r.comment ?? "").trim().length > 0);
  return allStated ? "Yes" : "No";
}
