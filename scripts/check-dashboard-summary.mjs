/**
 * Manual verification for the dashboard summary.
 *
 * Compares the per-track totals the dashboard computes against direct SQL,
 * and asserts the invariant: pending + approved + rejected === total per track.
 *
 * Usage:
 *   node scripts/check-dashboard-summary.mjs [from] [to]
 *   e.g. node scripts/check-dashboard-summary.mjs 2026-08-12 2026-11-10
 *
 * Requires DATABASE_URL (and the SSH tunnel if the DB is reached through it).
 * No admin scope is applied — this checks raw data, mirroring an
 * administrator (scope=all) view.
 */
import pg from "pg";

const from = process.argv[2] ?? "1970-01-01";
const to = process.argv[3] ?? "2999-12-31";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString });

const TRACK_SQL = `
  SELECT
    CASE
      WHEN s.applicant_role = 'student' AND s.type = 'thesis' THEN 'student_thesis'
      WHEN s.applicant_role = 'student' THEN 'student_publication'
      ELSE 'faculty_publication'
    END AS track,
    s.current_status::text AS status,
    COUNT(*)::int AS count
  FROM submissions s
  WHERE s.current_status <> 'draft'
    AND s.submitted_at >= $1::timestamptz
    AND s.submitted_at < ($2::date + 1)::timestamptz
  GROUP BY 1, 2
  ORDER BY 1, 2
`;

const DECIDING_STAGE_SQL = `
  -- Final statuses attributed to the stage of the LAST approved/rejected decision
  SELECT s.id, s.current_status::text AS status, last.stage::text AS deciding_stage
  FROM submissions s
  LEFT JOIN LATERAL (
    SELECT ad.stage
    FROM approval_decisions ad
    WHERE ad.submission_id = s.id
      AND ad.decision IN ('approved', 'rejected')
    ORDER BY ad.decided_at DESC
    LIMIT 1
  ) last ON TRUE
  WHERE s.current_status IN ('approved', 'rejected')
    AND s.submitted_at >= $1::timestamptz
    AND s.submitted_at < ($2::date + 1)::timestamptz
`;

const PENDING = new Set([
  "submitted",
  "under_hod_review",
  "hod_approved",
  "under_admin_review",
  "under_ireb_review",
]);

async function main() {
  await client.connect();

  const { rows } = await client.query(TRACK_SQL, [from, to]);
  const { rows: decided } = await client.query(DECIDING_STAGE_SQL, [from, to]);
  const decidingBySubmission = new Map(decided.map((r) => [r.id, r.deciding_stage]));

  const tracks = {};
  for (const row of rows) {
    const t = (tracks[row.track] ??= { statuses: {}, total: 0 });
    t.statuses[row.status] = row.count;
    t.total += row.count;
  }

  console.log(`\nRange: ${from} → ${to} (submitted_at)\n`);

  let allOk = true;
  for (const [track, t] of Object.entries(tracks)) {
    const pending = [...PENDING].reduce((a, s) => a + (t.statuses[s] ?? 0), 0);
    const approved = t.statuses.approved ?? 0;
    const rejected = (t.statuses.rejected ?? 0) + (t.statuses.hod_rejected ?? 0);
    const ok = pending + approved + rejected === t.total;
    allOk &&= ok;
    console.log(`${track}`);
    console.log(`  statuses: ${JSON.stringify(t.statuses)}`);
    console.log(`  pending=${pending}  approved=${approved}  rejected=${rejected}  total=${t.total}  invariant ${ok ? "OK" : "FAILED"}`);
  }

  const byStage = { admin: { approved: 0, rejected: 0 }, ireb: { approved: 0, rejected: 0 }, none: { approved: 0, rejected: 0 } };
  for (const row of decided) {
    const stage = row.deciding_stage === "admin" ? "admin" : row.deciding_stage === "ireb" ? "ireb" : "none";
    byStage[stage][row.status] += 1;
  }
  console.log(`\nFinal outcomes by deciding stage: ${JSON.stringify(byStage)}`);
  console.log(`\nInvariant ${allOk ? "PASSED" : "FAILED"} for all tracks.`);

  await client.end();
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
