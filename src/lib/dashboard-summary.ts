import type { AuthenticatedAdmin } from "@/lib/admin-auth";
import { getScopedSubmissions, type SubmissionRow } from "@/lib/authorization";
import { resolveFacultyIdsFromSnapshotValue } from "@/lib/admin-repository";
import { db } from "@/lib/db";

/**
 * Dashboard summary — three workflow tracks.
 *
 * TRACK MAPPING (verified in src/app/api/profile/submissions/route.ts,
 * `requiresHod()` / `resolveInitialStatus()`):
 *   - type='thesis'      + applicant_role='student' → Student Thesis (Forms 1 & 3)
 *   - type='publication' + applicant_role='student' → Student Publication (Forms 2 & 4)
 *   - applicant_role='faculty' (any type)           → Faculty Publication (Forms 5 & 6)
 * A faculty member submitting type='thesis' also routes through the
 * Admin → IREB pipeline (no HOD stage), so it is counted in the faculty track.
 *
 * STAGE-OUTCOME RULE (verified in submissions/[id]/decision/route.ts
 * `getStageFromStatus` + submissions/[id]/admin-review/route.ts):
 *   status → stage:  submitted | under_hod_review        → hod
 *                    hod_approved | under_admin_review    → admin   (hod_approved = legacy transient)
 *                    under_ireb_review                   → ireb
 *                    approved | rejected | hod_rejected   → completed
 *   approval_decisions rows: stage ∈ (hod, admin, ireb);
 *   decision ∈ (approved, rejected) for final decisions and (recommended,
 *   marked_sensitive) for admin-stage forwarding actions.
 *   - HOD approve → under_admin_review;  HOD reject → hod_rejected (final).
 *   - Admin may FINALIZE (approved/rejected) at the admin stage, or forward
 *     to IREB via 'recommended'/'marked_sensitive' → under_ireb_review.
 *   - IREB approve/reject → approved / rejected (final).
 *   "Rejected by HOD" = current_status 'hod_rejected'. A final 'rejected'
 *   status is attributed to the stage of the submission's LAST
 *   approved/rejected decision ('admin' or 'ireb'); rows with no decision
 *   history are attributed to 'ireb' (legacy direct-to-IREB flow).
 *
 * INVARIANT (asserted in code): for every track,
 *   pending + approved + rejected === total
 * where pending = statuses (submitted, under_hod_review, hod_approved,
 * under_admin_review, under_ireb_review), approved = 'approved',
 * rejected = 'rejected' + 'hod_rejected'. Drafts are excluded everywhere.
 */

export const AGING_THRESHOLD_DAYS = 7;

export type TrackKey = "student_thesis" | "student_publication" | "faculty_publication";
export type StageKey = "hod" | "admin" | "ireb";

export type DashboardFilters = {
  /** ISO date (inclusive) for submitted_at range. */
  from: string;
  /** ISO date (inclusive, end-of-day applied) for submitted_at range. */
  to: string;
  facultyId?: number;
  departmentId?: number;
  programId?: number;
  track?: TrackKey;
};

export type StageStageCount = Partial<Record<StageKey, number>>;

export type DeciderOutcome = {
  key: StageKey;
  label: string;
  /** Items currently waiting for a decision by this body. */
  pending: number;
  /** Items this body approved (for HOD: moved past the HOD stage). */
  approved: number;
  /** Items finally rejected by this body. */
  rejected: number;
  /** Admin stage only: forwarded to IREB via recommend/mark_sensitive. */
  forwarded: number;
  /** approved + rejected — the denominator shown on hover. */
  decided: number;
  approvalRate: number | null;
  rejectionRate: number | null;
};

export type TrendPoint = {
  label: string;
  submitted: number;
  approved: number;
  rejected: number;
};

export type TrackSummary = {
  track: TrackKey;
  label: string;
  forms: string;
  /** Stages in pipeline order for this track. */
  stages: StageKey[];
  /** Non-draft submissions in range. */
  total: number;
  stageCounts: StageStageCount;
  /** Items that reached each stage (funnel). */
  funnel: { stage: StageKey; entered: number }[];
  deciders: DeciderOutcome[];
  outcomes: { pending: number; approved: number; rejected: number };
  trend: TrendPoint[];
  aging: {
    avgDays: number | null;
    medianDays: number | null;
    overThreshold: number;
    thresholdDays: number;
  };
  /** Per-stage wait stats for items currently sitting in that stage. */
  agingByStage: Partial<Record<
    StageKey,
    { count: number; avgDays: number | null; overThreshold: number }
  >>;
  /** Mean days from submitted_at to the final decision, for decided items. */
  avgDaysToDecision: number | null;
  sensitiveCount: number;
  /** Pending at IREB with no assigned IREB member. */
  unassignedIrebCount: number;
};

export type NeedsAttentionItem = {
  id: number;
  applicationId: string;
  title: string;
  applicantName: string;
  track: TrackKey;
  stage: StageKey;
  daysWaiting: number;
  assignedIrebName: string | null;
};

export type DashboardSummary = {
  range: { from: string; to: string; granularity: "day" | "week" | "month" };
  tracks: Record<TrackKey, TrackSummary>;
  needsAttention: NeedsAttentionItem[];
  /** Result of the pending+approved+rejected === total invariant check. */
  invariantOk: boolean;
  generatedAt: string;
};

type DecisionRow = {
  submission_id: number;
  stage: "hod" | "admin" | "ireb";
  decision: "approved" | "rejected" | "recommended" | "marked_sensitive";
  decided_at: Date;
};

const PENDING_STATUSES = new Set([
  "submitted",
  "under_hod_review",
  "hod_approved",
  "under_admin_review",
  "under_ireb_review",
]);
const HOD_PENDING_STATUSES = new Set(["submitted", "under_hod_review"]);
const ADMIN_PENDING_STATUSES = new Set(["hod_approved", "under_admin_review"]);
const IREB_PENDING_STATUSES = new Set(["under_ireb_review"]);
const PAST_HOD_STATUSES = new Set([
  "hod_approved",
  "under_admin_review",
  "under_ireb_review",
  "approved",
  "rejected",
]);

export function trackForSubmission(row: {
  type: "thesis" | "publication";
  applicant_role: "student" | "faculty";
}): TrackKey {
  if (row.applicant_role === "student" && row.type === "thesis") return "student_thesis";
  if (row.applicant_role === "student") return "student_publication";
  // Faculty submissions always follow the Admin → IREB pipeline
  // (resolveInitialStatus: "Faculty (any type) → under_admin_review").
  return "faculty_publication";
}

function stageFromStatus(status: SubmissionRow["current_status"]): StageKey | "completed" {
  if (HOD_PENDING_STATUSES.has(status)) return "hod";
  if (ADMIN_PENDING_STATUSES.has(status)) return "admin";
  if (IREB_PENDING_STATUSES.has(status)) return "ireb";
  return "completed";
}

function normName(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.floor((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function rate(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

type TrendGranularity = "day" | "week" | "month";

function pickGranularity(from: Date, to: Date): TrendGranularity {
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));
  if (days <= 35) return "day";
  if (days <= 400) return "week";
  return "month";
}

function bucketKey(d: Date, g: TrendGranularity): { key: string; label: string } {
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  if (g === "day") {
    return {
      key: `${y}-${m}-${day}`,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
  }
  if (g === "week") {
    // Week bucket = Monday of the week containing d.
    const dow = (d.getDay() + 6) % 7; // Mon=0
    const monday = new Date(y, m, day - dow);
    return {
      key: `${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`,
      label: `w/o ${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    };
  }
  return { key: `${y}-${m}`, label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }) };
}

function buildBuckets(from: Date, to: Date, g: TrendGranularity): Map<string, TrendPoint> {
  const buckets = new Map<string, TrendPoint>();
  const cursor = new Date(from);
  if (g === "week") {
    // Align to the Monday on/before `from`.
    const dow = (cursor.getDay() + 6) % 7;
    cursor.setDate(cursor.getDate() - dow);
  }
  if (g === "month") {
    cursor.setDate(1);
  }
  while (cursor.getTime() <= to.getTime()) {
    const { key, label } = bucketKey(cursor, g);
    if (!buckets.has(key)) buckets.set(key, { label, submitted: 0, approved: 0, rejected: 0 });
    if (g === "day") cursor.setDate(cursor.getDate() + 1);
    else if (g === "week") cursor.setDate(cursor.getDate() + 7);
    else cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

async function fetchDecisions(submissionIds: number[]): Promise<Map<number, DecisionRow[]>> {
  const map = new Map<number, DecisionRow[]>();
  if (submissionIds.length === 0) return map;
  const res = await db.query<DecisionRow>(
    `
      SELECT submission_id, stage::text AS stage, decision::text AS decision, decided_at
      FROM approval_decisions
      WHERE submission_id = ANY($1::bigint[])
      ORDER BY decided_at ASC
    `,
    [submissionIds],
  );
  for (const row of res.rows) {
    const list = map.get(row.submission_id);
    if (list) list.push(row);
    else map.set(row.submission_id, [row]);
  }
  return map;
}

async function fetchPrograms(submissionIds: number[]): Promise<Map<number, string | null>> {
  const map = new Map<number, string | null>();
  if (submissionIds.length === 0) return map;
  const res = await db.query<{ submission_id: number; program: string | null }>(
    `
      SELECT submission_id, program
      FROM submission_applicant_snapshot
      WHERE submission_id = ANY($1::bigint[])
    `,
    [submissionIds],
  );
  for (const row of res.rows) map.set(row.submission_id, row.program);
  return map;
}

/** Stage of the decision that produced a final status ('admin' | 'ireb'). */
function decidingStageForFinal(
  decisions: DecisionRow[] | undefined,
): "admin" | "ireb" {
  const finalDecisions = (decisions ?? []).filter(
    (d) => d.decision === "approved" || d.decision === "rejected",
  );
  const last = finalDecisions[finalDecisions.length - 1];
  if (last && (last.stage === "admin" || last.stage === "ireb")) return last.stage;
  // Legacy rows decided before the admin stage existed → treat as IREB.
  return "ireb";
}

/** Approximate the time the submission entered its current (pending) stage. */
function stageEntryAt(row: SubmissionRow, decisions: DecisionRow[] | undefined): Date {
  const status = row.current_status;
  if (HOD_PENDING_STATUSES.has(status)) return new Date(row.submitted_at);
  const last = decisions?.[decisions.length - 1];
  return last ? new Date(last.decided_at) : new Date(row.submitted_at);
}

export function assertSummaryInvariant(summary: DashboardSummary): boolean {
  return Object.values(summary.tracks).every(
    (t) => t.outcomes.pending + t.outcomes.approved + t.outcomes.rejected === t.total,
  );
}

export async function getDashboardSummary(
  admin: AuthenticatedAdmin,
  filters: DashboardFilters,
): Promise<DashboardSummary> {
  const from = startOfDay(new Date(filters.from));
  const to = new Date(new Date(filters.to).setHours(23, 59, 59, 999));
  const granularity = pickGranularity(from, to);
  const now = new Date();

  // Scope first (role visibility + hod/ireb assignment + faculty scope + view-as).
  let rows = await getScopedSubmissions(admin);

  // ── Filters ────────────────────────────────────────────────────────────
  rows = rows.filter((r) => {
    const t = new Date(r.submitted_at).getTime();
    return t >= from.getTime() && t <= to.getTime();
  });

  if (filters.track) {
    rows = rows.filter((r) => trackForSubmission(r) === filters.track);
  }

  if (typeof filters.facultyId === "number") {
    const cache = new Map<string, number[]>();
    const kept: SubmissionRow[] = [];
    for (const row of rows) {
      const key = row.faculty.trim();
      if (!cache.has(key)) {
        cache.set(key, await resolveFacultyIdsFromSnapshotValue(row.faculty));
      }
      if ((cache.get(key) ?? []).some((id) => Number(id) === filters.facultyId)) {
        kept.push(row);
      }
    }
    rows = kept;
  }

  if (typeof filters.departmentId === "number") {
    const dept = await db.query<{ id: number; faculty_id: number; name: string }>(
      `SELECT id, faculty_id, name FROM departments WHERE id = $1 LIMIT 1`,
      [filters.departmentId],
    );
    const deptRow = dept.rows[0];
    if (deptRow) {
      const target = normName(deptRow.name);
      const cache = new Map<string, number[]>();
      const kept: SubmissionRow[] = [];
      for (const row of rows) {
        const key = row.faculty.trim();
        if (!cache.has(key)) {
          cache.set(key, await resolveFacultyIdsFromSnapshotValue(row.faculty));
        }
        if (!(cache.get(key) ?? []).some((id) => Number(id) === Number(deptRow.faculty_id))) continue;
        if (normName(row.department) === target) kept.push(row);
      }
      rows = kept;
    } else {
      rows = [];
    }
  }

  if (typeof filters.programId === "number") {
    const prog = await db.query<{ id: number; department_id: number; name: string }>(
      `SELECT id, department_id, name FROM programs WHERE id = $1 LIMIT 1`,
      [filters.programId],
    );
    const progRow = prog.rows[0];
    if (progRow) {
      const programById = await fetchPrograms(rows.map((r) => r.id));
      const target = normName(progRow.name);
      rows = rows.filter((r) => normName(programById.get(r.id)) === target);
    } else {
      rows = [];
    }
  }

  const decisionsBySubmission = await fetchDecisions(rows.map((r) => r.id));

  // ── Per-track aggregation ──────────────────────────────────────────────
  const trackMeta: Record<TrackKey, { label: string; forms: string; stages: StageKey[] }> = {
    student_thesis: { label: "Student Thesis", forms: "Forms 1 & 3", stages: ["hod", "admin", "ireb"] },
    student_publication: { label: "Student Publication", forms: "Forms 2 & 4", stages: ["admin", "ireb"] },
    faculty_publication: { label: "Faculty Publication", forms: "Forms 5 & 6", stages: ["admin", "ireb"] },
  };
  const deciderLabels: Record<StageKey, string> = {
    hod: "HOD",
    admin: "Administrator",
    ireb: "IREB",
  };

  const tracks = {} as Record<TrackKey, TrackSummary>;
  const needsAttentionPool: NeedsAttentionItem[] = [];

  for (const key of Object.keys(trackMeta) as TrackKey[]) {
    const meta = trackMeta[key];
    const trackRows = rows.filter((r) => trackForSubmission(r) === key);

    let pendingHod = 0, pendingAdmin = 0, pendingIreb = 0;
    let hodRejected = 0, adminApproved = 0, adminRejected = 0;
    let irebApproved = 0, irebRejected = 0, hodApproved = 0, adminForwarded = 0;
    let reachedAdmin = 0, reachedIreb = 0;
    let sensitive = 0, unassignedIreb = 0;
    const waitDays: number[] = [];
    const waitDaysByStage = new Map<StageKey, number[]>();
    const daysToDecision: number[] = [];

    for (const row of trackRows) {
      const status = row.current_status;
      const decisions = decisionsBySubmission.get(row.id);
      const stage = stageFromStatus(status);
      const decidingStage =
        status === "approved" || status === "rejected"
          ? decidingStageForFinal(decisions)
          : null;

      if (status === "hod_rejected") hodRejected += 1;
      if (status === "approved" || status === "rejected") {
        if (decidingStage === "admin") {
          if (status === "approved") adminApproved += 1;
          else adminRejected += 1;
        } else {
          if (status === "approved") irebApproved += 1;
          else irebRejected += 1;
        }
        const last = decisions?.[decisions.length - 1];
        if (last) {
          daysToDecision.push(
            Math.max(0, (new Date(last.decided_at).getTime() - new Date(row.submitted_at).getTime()) / 86400000),
          );
        }
      }

      if (HOD_PENDING_STATUSES.has(status)) pendingHod += 1;
      else if (ADMIN_PENDING_STATUSES.has(status)) pendingAdmin += 1;
      else if (IREB_PENDING_STATUSES.has(status)) pendingIreb += 1;

      // Funnel: "reached" a stage = currently at/beyond it or decided there.
      if (PAST_HOD_STATUSES.has(status) || (decisions ?? []).some((d) => d.stage === "admin" || d.stage === "ireb")) {
        reachedAdmin += 1;
      }
      const hasIrebDecision = (decisions ?? []).some((d) => d.stage === "ireb");
      const decidedBeforeIreb = decidingStage === "admin";
      if (status === "under_ireb_review" || hasIrebDecision || ((status === "approved" || status === "rejected") && !decidedBeforeIreb)) {
        reachedIreb += 1;
      }

      if (PAST_HOD_STATUSES.has(status)) hodApproved += 1;
      if ((decisions ?? []).some((d) => d.stage === "admin" && (d.decision === "recommended" || d.decision === "marked_sensitive"))) {
        adminForwarded += 1;
      }
      if (row.is_sensitive) sensitive += 1;
      if (status === "under_ireb_review" && !row.assigned_ireb_user_id) unassignedIreb += 1;

      if (stage !== "completed") {
        const waited = daysBetween(stageEntryAt(row, decisions), now);
        waitDays.push(waited);
        const stageList = waitDaysByStage.get(stage);
        if (stageList) stageList.push(waited);
        else waitDaysByStage.set(stage, [waited]);
        needsAttentionPool.push({
          id: row.id,
          applicationId: row.application_id,
          title: row.research_title?.trim() || "—",
          applicantName: row.applicant_name,
          track: key,
          stage,
          daysWaiting: waited,
          assignedIrebName: row.assigned_ireb_name ?? null,
        });
      }
    }

    const total = trackRows.length;
    const pending = pendingHod + pendingAdmin + pendingIreb;
    const approved = adminApproved + irebApproved;
    const rejected = hodRejected + adminRejected + irebRejected;

    // Trend: submitted by submitted_at; decided events by decided_at.
    const buckets = buildBuckets(from, to, granularity);
    for (const row of trackRows) {
      const { key: bk } = bucketKey(new Date(row.submitted_at), granularity);
      const b = buckets.get(bk);
      if (b) b.submitted += 1;
    }
    for (const row of trackRows) {
      const status = row.current_status;
      if (status !== "approved" && status !== "rejected" && status !== "hod_rejected") continue;
      const decisions = decisionsBySubmission.get(row.id) ?? [];
      const finalDecisions = decisions.filter((d) => d.decision === "approved" || d.decision === "rejected");
      const last = finalDecisions[finalDecisions.length - 1];
      if (!last) continue;
      const { key: bk } = bucketKey(new Date(last.decided_at), granularity);
      const b = buckets.get(bk);
      if (!b) continue;
      if (status === "approved") b.approved += 1;
      else b.rejected += 1;
    }

    const stageCounts: StageStageCount = {};
    if (meta.stages.includes("hod")) stageCounts.hod = pendingHod;
    stageCounts.admin = pendingAdmin;
    stageCounts.ireb = pendingIreb;

    const funnel = meta.stages.map((stage) => ({
      stage,
      entered:
        stage === meta.stages[0]
          ? total
          : stage === "admin"
            ? reachedAdmin
            : reachedIreb,
    }));

    const deciders: DeciderOutcome[] = meta.stages.map((stage) => {
      const d: Omit<DeciderOutcome, "approvalRate" | "rejectionRate"> =
        stage === "hod"
          ? { key: "hod", label: deciderLabels.hod, pending: pendingHod, approved: hodApproved, rejected: hodRejected, forwarded: 0, decided: hodApproved + hodRejected }
          : stage === "admin"
            ? { key: "admin", label: deciderLabels.admin, pending: pendingAdmin, approved: adminApproved, rejected: adminRejected, forwarded: adminForwarded, decided: adminApproved + adminRejected }
            : { key: "ireb", label: deciderLabels.ireb, pending: pendingIreb, approved: irebApproved, rejected: irebRejected, forwarded: 0, decided: irebApproved + irebRejected };
      return { ...d, approvalRate: rate(d.approved, d.decided), rejectionRate: rate(d.rejected, d.decided) };
    });

    const avgWait = waitDays.length > 0 ? waitDays.reduce((a, b) => a + b, 0) / waitDays.length : null;

    tracks[key] = {
      track: key,
      label: meta.label,
      forms: meta.forms,
      stages: meta.stages,
      total,
      stageCounts,
      funnel,
      deciders,
      outcomes: { pending, approved, rejected },
      trend: Array.from(buckets.values()),
      aging: {
        avgDays: avgWait !== null ? round1(avgWait) : null,
        medianDays: median(waitDays),
        overThreshold: waitDays.filter((d) => d > AGING_THRESHOLD_DAYS).length,
        thresholdDays: AGING_THRESHOLD_DAYS,
      },
      agingByStage: Object.fromEntries(
        Array.from(waitDaysByStage.entries()).map(([stage, days]) => [
          stage,
          {
            count: days.length,
            avgDays: round1(days.reduce((a, b) => a + b, 0) / days.length),
            overThreshold: days.filter((d) => d > AGING_THRESHOLD_DAYS).length,
          },
        ]),
      ),
      avgDaysToDecision:
        daysToDecision.length > 0
          ? round1(daysToDecision.reduce((a, b) => a + b, 0) / daysToDecision.length)
          : null,
      sensitiveCount: sensitive,
      unassignedIrebCount: unassignedIreb,
    };
  }

  const summary: DashboardSummary = {
    range: { from: filters.from, to: filters.to, granularity },
    tracks,
    needsAttention: needsAttentionPool
      .sort((a, b) => b.daysWaiting - a.daysWaiting)
      .slice(0, 5),
    invariantOk: false,
    generatedAt: now.toISOString(),
  };
  summary.invariantOk = assertSummaryInvariant(summary);
  if (!summary.invariantOk) {
    console.error("[dashboard-summary] invariant violated: pending+approved+rejected !== total", {
      tracks: Object.values(tracks).map((t) => ({ track: t.track, ...t.outcomes, total: t.total })),
    });
  }
  return summary;
}
