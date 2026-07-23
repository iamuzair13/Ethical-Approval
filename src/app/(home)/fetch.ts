import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { adminFromSession, type AuthenticatedAdmin } from "@/lib/admin-auth";
import { getScopedSubmissions } from "@/lib/authorization";
import { resolveFacultyIdsFromSnapshotValue } from "@/lib/admin-repository";
import { getStagePendingDays } from "@/lib/lead-overdue";
import { isStudentApplicantEmail } from "@/lib/applicant-email";

export type OverviewData = {
  views: { value: number; growthRate: number };
  profit: { value: number; growthRate: number };
  products: { value: number; growthRate: number };
  users: { value: number; growthRate: number };
  customers: { value: number; growthRate: number };
  supervisorPending: { value: number; growthRate: number };
  supervisorApproved: { value: number; growthRate: number };
  supervisorRejected: { value: number; growthRate: number };
  irebRejected: { value: number; growthRate: number };
};

export type OverviewTimelinePoint = {
  label: string | number;
  /** Total requests in this bucket */
  total: number;
};

export type OverviewTimelineBreakdownPoint = OverviewTimelinePoint & {
  pendingSupervisor: number;
  pendingIreb: number;
  approvedSupervisor: number;
  approvedIreb: number;
  rejectedSupervisor: number;
  rejectedIreb: number;
};

type LeadStatus =
  | "Submitted"
  | "Under Review by Supervisor"
  | "Approved by Supervisor"
  | "Rejected by Supervisor"
  | "Under Review by IREB"
  | "Approved by IREB"
  | "Rejected by IREB";

export function formatSubmissionApplicationType(type: "thesis" | "publication"): string {
  return type === "thesis" ? "Thesis" : "Research";
}

export type DashboardLead = {
  id: number;
  /** 6-digit public application reference */
  applicationId: string;
  name: string;
  email: string;
  applicationType: string;
  researchTitle: string;
  faculty: string;
  department: string;
  project: string;
  duration: string;
  currentStatus: LeadStatus;
  supervisorName: string | null;
  stage: "supervisor" | "ireb" | "completed";
  submittedAt: string;
  supervisorDecisionAt: string | null;
  /** Applicant profile image URL when set; otherwise use name initials in the UI. */
  avatar: string | null;
  latestFeedbackComment: string | null;
  latestAuditNote: string | null;
  latestActionTrace: string | null;
};

type SubmissionScopeRow = {
  id: number;
  application_id: string;
  submitted_at: Date;
  supervisor_decision_at: Date | null;
  applicant_name: string;
  applicant_email: string;
  faculty: string;
  department: string;
  current_status:
    | "draft"
    | "submitted"
    | "under_supervisor_review"
    | "supervisor_approved"
    | "supervisor_rejected"
    | "under_ireb_review"
    | "approved"
    | "rejected";
  latest_feedback_comment: string | null;
  latest_audit_note: string | null;
  latest_actor_name: string | null;
  latest_decision: "approved" | "rejected" | null;
  latest_decision_stage: "supervisor" | "ireb" | null;
  latest_decided_by_name: string | null;
  applicant_avatar_url: string | null;
  submission_type: "thesis" | "publication";
  research_title: string | null;
  supervisor_name: string | null;
};

/** Same rules as profile API: strip `?...` from local avatar paths for next/image. */
function normalizeDashboardAvatarUrl(value: string | null | undefined): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return null;
  if (v.startsWith("/")) {
    const queryIndex = v.indexOf("?");
    return queryIndex === -1 ? v : v.slice(0, queryIndex);
  }
  return v;
}

function splitFeedbackAndAudit(
  comment: string | null,
  actorName?: string | null,
): {
  latestFeedbackComment: string | null;
  latestAuditNote: string | null;
} {
  if (!comment) {
    return { latestFeedbackComment: null, latestAuditNote: null };
  }
  const auditMatch = comment.match(/((?:Action performed by administrator\s+)+.*?on behalf of .*?\.)/);
  let latestAuditNote = auditMatch?.[1]?.trim() || null;
  if (latestAuditNote) {
    const normalized = latestAuditNote.match(
      /(?:Action performed by administrator\s+)+(.+?)\s+on behalf of\s+(.+?)\./,
    );
    if (normalized) {
      const actorRaw = normalized[1].trim();
      const onBehalfName = normalized[2].trim();
      const actorLooksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        actorRaw,
      );
      const resolvedActorName = actorLooksLikeUuid && actorName?.trim() ? actorName.trim() : actorRaw;
      latestAuditNote = `Action performed by administrator ${resolvedActorName} on behalf of ${onBehalfName}.`;
    }
  }
  const latestFeedbackComment = comment.replace(auditMatch?.[0] ?? "", "").trim() || null;
  return { latestFeedbackComment, latestAuditNote };
}

function buildActionTrace(input: {
  latestDecision: "approved" | "rejected" | null;
  latestDecisionStage: "supervisor" | "ireb" | null;
  latestDecidedByName: string | null;
  latestAuditNote: string | null;
}): string | null {
  if (input.latestAuditNote) return input.latestAuditNote;
  if (!input.latestDecision || !input.latestDecisionStage || !input.latestDecidedByName) return null;
  const stageLabel = input.latestDecisionStage === "supervisor" ? "Supervisor" : "IREB";
  const decisionLabel = input.latestDecision === "approved" ? "approved" : "rejected";
  return `${stageLabel} ${decisionLabel} by ${input.latestDecidedByName}.`;
}

async function getLatestFeedbackBySubmissionIds(
  submissionIds: number[],
): Promise<Map<number, { comment: string | null; actorName: string | null }>> {
  if (submissionIds.length === 0) return new Map();
  const feedbackResult = await db.query<{
    submission_id: number;
    latest_feedback_comment: string | null;
    latest_actor_name: string | null;
  }>(
    `
      SELECT
        ad.submission_id,
        ad.comment AS latest_feedback_comment,
        actor.name AS latest_actor_name
      FROM (
        SELECT DISTINCT ON (submission_id)
          submission_id,
          comment,
          decided_at
        FROM approval_decisions
        WHERE submission_id = ANY($1::bigint[])
          AND comment IS NOT NULL
          AND LENGTH(TRIM(comment)) > 0
        ORDER BY submission_id, decided_at DESC
      ) ad
      LEFT JOIN admin_users actor
        ON actor.id::text = (regexp_match(
          ad.comment,
          '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})'
        ))[1]
    `,
    [submissionIds],
  );

  const feedbackMap = new Map<number, { comment: string | null; actorName: string | null }>();
  for (const row of feedbackResult.rows) {
    feedbackMap.set(row.submission_id, {
      comment: row.latest_feedback_comment,
      actorName: row.latest_actor_name,
    });
  }
  return feedbackMap;
}

async function getLatestDecisionBySubmissionIds(
  submissionIds: number[],
): Promise<
  Map<
    number,
    {
      latestDecision: "approved" | "rejected" | null;
      latestDecisionStage: "supervisor" | "ireb" | null;
      latestDecidedByName: string | null;
    }
  >
> {
  if (submissionIds.length === 0) return new Map();
  const decisionResult = await db.query<{
    submission_id: number;
    latest_decision: "approved" | "rejected";
    latest_decision_stage: "supervisor" | "ireb";
    latest_decided_by_name: string | null;
  }>(
    `
      SELECT
        ad.submission_id,
        ad.decision AS latest_decision,
        ad.stage AS latest_decision_stage,
        ad.decided_by_name AS latest_decided_by_name
      FROM (
        SELECT DISTINCT ON (submission_id)
          submission_id,
          decision,
          stage,
          decided_by_name,
          decided_at
        FROM approval_decisions
        WHERE submission_id = ANY($1::bigint[])
        ORDER BY submission_id, decided_at DESC
      ) ad
    `,
    [submissionIds],
  );

  const decisionMap = new Map<
    number,
    {
      latestDecision: "approved" | "rejected" | null;
      latestDecisionStage: "supervisor" | "ireb" | null;
      latestDecidedByName: string | null;
    }
  >();
  for (const row of decisionResult.rows) {
    decisionMap.set(row.submission_id, {
      latestDecision: row.latest_decision ?? null,
      latestDecisionStage: row.latest_decision_stage ?? null,
      latestDecidedByName: row.latest_decided_by_name ?? null,
    });
  }
  return decisionMap;
}

async function getSupervisorDecisionAtBySubmissionIds(
  submissionIds: number[],
): Promise<Map<number, Date>> {
  if (submissionIds.length === 0) return new Map();

  const result = await db.query<{
    submission_id: number;
    supervisor_decision_at: Date;
  }>(
    `
      SELECT
        ad.submission_id,
        MAX(ad.decided_at) AS supervisor_decision_at
      FROM approval_decisions ad
      WHERE ad.submission_id = ANY($1::bigint[])
        AND ad.stage = 'supervisor'
      GROUP BY ad.submission_id
    `,
    [submissionIds],
  );

  const map = new Map<number, Date>();
  for (const row of result.rows) {
    map.set(row.submission_id, row.supervisor_decision_at);
  }
  return map;
}

type DecisionAggregateRow = {
  stage: "supervisor" | "ireb";
  decision: "approved" | "rejected";
  count: string;
};

function toAdminScope(session: Session): AuthenticatedAdmin | null {
  return adminFromSession(session);
}

async function batchResolveSupervisorNames(
  facultyValues: string[],
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  const uniqueValues = Array.from(new Set(facultyValues.filter(Boolean)));

  for (const facultyValue of uniqueValues) {
    const facultyIds = await resolveFacultyIdsFromSnapshotValue(facultyValue);
    if (facultyIds.length === 0) {
      result.set(facultyValue, null);
      continue;
    }
    const supervisorResult = await db.query<{ name: string }>(
      `
        SELECT au.name
        FROM admin_users au
        INNER JOIN admin_faculty_assignments afa ON afa.admin_user_id = au.id
        WHERE au.role = 'supervisor'
          AND au.status = 'active'
          AND au.deleted_at IS NULL
          AND afa.assignment_type = 'supervisor_primary'
          AND afa.deleted_at IS NULL
          AND afa.faculty_id = ANY($1::bigint[])
        ORDER BY au.updated_at DESC
        LIMIT 1
      `,
      [facultyIds],
    );
    result.set(facultyValue, supervisorResult.rows[0]?.name ?? null);
  }
  return result;
}

async function getScopedSubmissionRows(session?: Session): Promise<SubmissionScopeRow[]> {
  if (!session) {
    const result = await db.query<SubmissionScopeRow>(
      `
        SELECT
          s.id,
          s.application_id,
          s.submitted_at,
          sas.name AS applicant_name,
          sas.email AS applicant_email,
          up.avatar_url AS applicant_avatar_url,
          sas.faculty,
          sas.department,
          s.type AS submission_type,
          src.title AS research_title,
          s.current_status,
          (
            SELECT MAX(ad.decided_at)
            FROM approval_decisions ad
            WHERE ad.submission_id = s.id
              AND ad.stage = 'supervisor'
          ) AS supervisor_decision_at,
          afd.latest_feedback_comment,
          afd.latest_audit_note,
          afd.latest_actor_name,
          ld.latest_decision,
          ld.latest_decision_stage,
          ld.latest_decided_by_name
        FROM submissions s
        INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
        LEFT JOIN submission_research_core src ON src.submission_id = s.id
        LEFT JOIN user_profiles up ON up.sap_id = sas.sap_id
        LEFT JOIN LATERAL (
          SELECT
            ad.comment AS latest_feedback_comment,
            (regexp_match(
              ad.comment,
              'Action performed by administrator .*? on behalf of .*?\\.'
            ))[1] AS latest_audit_note,
            actor.name AS latest_actor_name
          FROM approval_decisions ad
          LEFT JOIN admin_users actor
            ON actor.id::text = (regexp_match(
              ad.comment,
              '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})'
            ))[1]
          WHERE ad.submission_id = s.id
            AND ad.comment IS NOT NULL
            AND LENGTH(TRIM(ad.comment)) > 0
          ORDER BY ad.decided_at DESC
          LIMIT 1
        ) afd ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            ad.decision AS latest_decision,
            ad.stage AS latest_decision_stage,
            ad.decided_by_name AS latest_decided_by_name
          FROM approval_decisions ad
          WHERE ad.submission_id = s.id
          ORDER BY ad.decided_at DESC
          LIMIT 1
        ) ld ON TRUE
        WHERE s.current_status <> 'draft'
        ORDER BY s.submitted_at DESC
      `,
    );
    const supervisorMap = await batchResolveSupervisorNames(result.rows.map((r) => r.faculty));
    return result.rows.map((row) => ({
      ...row,
      supervisor_name: supervisorMap.get(row.faculty) ?? null,
    }));
  }

  const admin = toAdminScope(session);
  if (admin) {
    const rows = await getScopedSubmissions(admin);
    const feedbackMap = await getLatestFeedbackBySubmissionIds(rows.map((row) => row.id));
    const decisionMap = await getLatestDecisionBySubmissionIds(rows.map((row) => row.id));
    const supervisorDecisionMap = await getSupervisorDecisionAtBySubmissionIds(rows.map((row) => row.id));
    const supervisorMap = await batchResolveSupervisorNames(rows.map((row) => row.faculty));
    return rows.map((row) => ({
      id: row.id,
      application_id: row.application_id,
      submitted_at: row.submitted_at,
      supervisor_decision_at: supervisorDecisionMap.get(row.id) ?? null,
      applicant_name: row.applicant_name,
      applicant_email: row.applicant_email,
      faculty: row.faculty,
      department: row.department,
      submission_type: row.type,
      research_title: row.research_title,
      current_status: row.current_status,
      latest_feedback_comment: feedbackMap.get(row.id)?.comment ?? null,
      latest_audit_note: null,
      latest_actor_name: feedbackMap.get(row.id)?.actorName ?? null,
      latest_decision: decisionMap.get(row.id)?.latestDecision ?? null,
      latest_decision_stage: decisionMap.get(row.id)?.latestDecisionStage ?? null,
      latest_decided_by_name: decisionMap.get(row.id)?.latestDecidedByName ?? null,
      applicant_avatar_url: row.applicant_avatar_url ?? null,
      supervisor_name: supervisorMap.get(row.faculty) ?? null,
    }));
  }

  if (session.user.sapId) {
    const ownRows = await db.query<SubmissionScopeRow>(
      `
        SELECT
          s.id,
          s.application_id,
          s.submitted_at,
          sas.name AS applicant_name,
          sas.email AS applicant_email,
          up.avatar_url AS applicant_avatar_url,
          sas.faculty,
          sas.department,
          s.type AS submission_type,
          src.title AS research_title,
          s.current_status,
          (
            SELECT MAX(ad.decided_at)
            FROM approval_decisions ad
            WHERE ad.submission_id = s.id
              AND ad.stage = 'supervisor'
          ) AS supervisor_decision_at,
          afd.latest_feedback_comment,
          afd.latest_audit_note,
          afd.latest_actor_name,
          ld.latest_decision,
          ld.latest_decision_stage,
          ld.latest_decided_by_name
        FROM submissions s
        INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
        LEFT JOIN submission_research_core src ON src.submission_id = s.id
        LEFT JOIN user_profiles up ON up.sap_id = sas.sap_id
        LEFT JOIN LATERAL (
          SELECT
            ad.comment AS latest_feedback_comment,
            (regexp_match(
              ad.comment,
              'Action performed by administrator .*? on behalf of .*?\\.'
            ))[1] AS latest_audit_note,
            actor.name AS latest_actor_name
          FROM approval_decisions ad
          LEFT JOIN admin_users actor
            ON actor.id::text = (regexp_match(
              ad.comment,
              '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})'
            ))[1]
          WHERE ad.submission_id = s.id
            AND ad.comment IS NOT NULL
            AND LENGTH(TRIM(ad.comment)) > 0
          ORDER BY ad.decided_at DESC
          LIMIT 1
        ) afd ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            ad.decision AS latest_decision,
            ad.stage AS latest_decision_stage,
            ad.decided_by_name AS latest_decided_by_name
          FROM approval_decisions ad
          WHERE ad.submission_id = s.id
          ORDER BY ad.decided_at DESC
          LIMIT 1
        ) ld ON TRUE
        WHERE sas.sap_id = $1 AND s.current_status <> 'draft'
        ORDER BY s.submitted_at DESC
      `,
      [session.user.sapId],
    );
    const studentSupervisorMap = await batchResolveSupervisorNames(ownRows.rows.map((r) => r.faculty));
    return ownRows.rows.map((row) => ({
      ...row,
      supervisor_name: studentSupervisorMap.get(row.faculty) ?? null,
    }));
  }

  return [];
}

async function getDecisionAggregates(submissionIds: number[]) {
  if (submissionIds.length === 0) {
    return [] as DecisionAggregateRow[];
  }

  const decisions = await db.query<DecisionAggregateRow>(
    `
      SELECT
        ad.stage,
        ad.decision,
        COUNT(*)::text AS count
      FROM approval_decisions ad
      WHERE ad.submission_id = ANY($1::bigint[])
      GROUP BY ad.stage, ad.decision
    `,
    [submissionIds],
  );
  return decisions.rows;
}

export async function getOverviewData(session?: Session): Promise<OverviewData> {
  const scopedRows = await getScopedSubmissionRows(session);
  const submissionIds = scopedRows.map((row) => row.id);
  const role = session?.user?.adminRole ?? null;

  if (submissionIds.length === 0) {
    return {
      views: { value: 0, growthRate: 0 },
      profit: { value: 0, growthRate: 0 },
      products: { value: 0, growthRate: 0 },
      users: { value: 0, growthRate: 0 },
      customers: { value: 0, growthRate: 0 },
      supervisorPending: { value: 0, growthRate: 0 },
      supervisorApproved: { value: 0, growthRate: 0 },
      supervisorRejected: { value: 0, growthRate: 0 },
      irebRejected: { value: 0, growthRate: 0 },
    };
  }

  const statuses = await db.query<{ current_status: string; count: string }>(
    `
      SELECT s.current_status, COUNT(*)::text AS count
      FROM submissions s
      WHERE s.id = ANY($1::bigint[])
      GROUP BY s.current_status
    `,
    [submissionIds],
  );

  const statusMap = new Map(statuses.rows.map((row) => [row.current_status, Number(row.count)]));
  const total = submissionIds.length;
  const toRate = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

  const pendingSupervisor =
    (statusMap.get("submitted") ?? 0) + (statusMap.get("under_supervisor_review") ?? 0);
  const pendingIreb = statusMap.get("under_ireb_review") ?? 0;
  const supervisorApproved = scopedRows.filter(
    (row) =>
      isStudentApplicantEmail(row.applicant_email) &&
      (row.current_status === "supervisor_approved" ||
        row.current_status === "under_ireb_review" ||
        row.current_status === "approved" ||
        row.current_status === "rejected"),
  ).length;
  const supervisorRejected = statusMap.get("supervisor_rejected") ?? 0;
  const irebApproved = statusMap.get("approved") ?? 0;
  const irebRejected = statusMap.get("rejected") ?? 0;

  if (role === "ireb") {
    return {
      views: { value: total, growthRate: 100 },
      // "profit" card is labeled "Rejected Requests" on Ethical committee panel.
      profit: { value: irebRejected, growthRate: toRate(irebRejected) },
      // "products" card is labeled "Pending Approvals" on Ethical committee panel.
      products: { value: pendingIreb, growthRate: toRate(pendingIreb) },
      // "users" card is labeled "Approved Requests" on Ethical committee panel.
      users: { value: irebApproved, growthRate: toRate(irebApproved) },
      // keep explicit IREB approved metric for other shared consumers.
      customers: { value: irebApproved, growthRate: toRate(irebApproved) },
      supervisorPending: { value: pendingSupervisor, growthRate: toRate(pendingSupervisor) },
      supervisorApproved: { value: supervisorApproved, growthRate: toRate(supervisorApproved) },
      supervisorRejected: { value: supervisorRejected, growthRate: toRate(supervisorRejected) },
      irebRejected: { value: irebRejected, growthRate: toRate(irebRejected) },
    };
  }

  if (role === "supervisor") {
    return {
      views: { value: total, growthRate: 100 },
      profit: { value: pendingSupervisor, growthRate: toRate(pendingSupervisor) },
      products: { value: pendingIreb, growthRate: toRate(pendingIreb) },
      users: { value: supervisorApproved, growthRate: toRate(supervisorApproved) },
      customers: { value: supervisorRejected, growthRate: toRate(supervisorRejected) },
      supervisorPending: { value: pendingSupervisor, growthRate: toRate(pendingSupervisor) },
      supervisorApproved: { value: supervisorApproved, growthRate: toRate(supervisorApproved) },
      supervisorRejected: { value: supervisorRejected, growthRate: toRate(supervisorRejected) },
      irebRejected: { value: irebRejected, growthRate: toRate(irebRejected) },
    };
  }

  return {
    views: { value: total, growthRate: 100 },
    profit: { value: pendingSupervisor, growthRate: toRate(pendingSupervisor) },
    products: { value: pendingIreb, growthRate: toRate(pendingIreb) },
    users: { value: supervisorApproved, growthRate: toRate(supervisorApproved) },
    customers: { value: irebApproved, growthRate: toRate(irebApproved) },
    supervisorPending: { value: pendingSupervisor, growthRate: toRate(pendingSupervisor) },
    supervisorApproved: { value: supervisorApproved, growthRate: toRate(supervisorApproved) },
    supervisorRejected: { value: supervisorRejected, growthRate: toRate(supervisorRejected) },
    irebRejected: { value: irebRejected, growthRate: toRate(irebRejected) },
  };
}

/**
 * Returns a simple time-series of total requests grouped by submitted date.
 * - monthly: last 12 calendar months (labelled "Mon YYYY")
 * - yearly: per calendar year present in the data
 */
export async function getOverviewTimeline(
  session: Session | undefined,
  mode: "monthly" | "yearly" = "monthly",
): Promise<OverviewTimelinePoint[]> {
  const timeline = await getOverviewTimelineBreakdown(session, mode);
  return timeline.map(({ label, total }) => ({ label, total }));
}

export async function getOverviewTimelineBreakdown(
  session: Session | undefined,
  mode: "monthly" | "yearly" = "monthly",
): Promise<OverviewTimelineBreakdownPoint[]> {
  const scopedRows = await getScopedSubmissionRows(session);

  const mkEmpty = (label: string | number): Omit<OverviewTimelineBreakdownPoint, "label"> => ({
    total: 0,
    pendingSupervisor: 0,
    pendingIreb: 0,
    approvedSupervisor: 0,
    approvedIreb: 0,
    rejectedSupervisor: 0,
    rejectedIreb: 0,
  });

  const isPendingSupervisor = (s: SubmissionScopeRow["current_status"]) =>
    s === "submitted" || s === "under_supervisor_review";
  const isPendingIreb = (s: SubmissionScopeRow["current_status"]) => s === "under_ireb_review";
  const isApprovedSupervisor = (row: SubmissionScopeRow) =>
    isStudentApplicantEmail(row.applicant_email) &&
    (row.current_status === "supervisor_approved" ||
      row.current_status === "under_ireb_review" ||
      row.current_status === "approved" ||
      row.current_status === "rejected");
  const isApprovedIreb = (s: SubmissionScopeRow["current_status"]) => s === "approved";
  const isRejectedSupervisor = (s: SubmissionScopeRow["current_status"]) => s === "supervisor_rejected";
  const isRejectedIreb = (s: SubmissionScopeRow["current_status"]) => s === "rejected";

  if (mode === "monthly") {
    // Always return the last 12 calendar months (oldest -> newest), filling missing buckets with 0.
    const now = new Date();
    const monthKeys: { key: string; label: string }[] = [];
    for (let offset = 11; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleString("default", { month: "short", year: "numeric" });
      monthKeys.push({ key, label });
    }

    const buckets = new Map<string, OverviewTimelineBreakdownPoint>(
      monthKeys.map((m) => [m.key, { label: m.label, ...mkEmpty(m.label) }]),
    );

    for (const row of scopedRows) {
      const d = new Date(row.submitted_at);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = buckets.get(key);
      if (!bucket) continue; // outside last 12 months

      const s = row.current_status;
      bucket.total += 1;
      if (isPendingSupervisor(s)) bucket.pendingSupervisor += 1;
      if (isPendingIreb(s)) bucket.pendingIreb += 1;
      if (isApprovedSupervisor(row)) bucket.approvedSupervisor += 1;
      if (isApprovedIreb(s)) bucket.approvedIreb += 1;
      if (isRejectedSupervisor(s)) bucket.rejectedSupervisor += 1;
      if (isRejectedIreb(s)) bucket.rejectedIreb += 1;
    }

    return monthKeys.map((m) => buckets.get(m.key)!);
  }

  // yearly – always return the last 10 calendar years (oldest → newest), filling missing buckets with 0.
  const now = new Date();
  const currentYear = now.getFullYear();
  const yearRange: number[] = [];
  for (let offset = 9; offset >= 0; offset--) {
    yearRange.push(currentYear - offset);
  }

  const buckets = new Map<number, OverviewTimelineBreakdownPoint>(
    yearRange.map((y) => [y, { label: y, ...mkEmpty(y) }]),
  );

  for (const row of scopedRows) {
    const d = new Date(row.submitted_at);
    if (Number.isNaN(d.getTime())) continue;
    const year = d.getFullYear();
    const bucket = buckets.get(year);
    if (!bucket) continue; // outside last 10 years

    const s = row.current_status;
    bucket.total += 1;
    if (isPendingSupervisor(s)) bucket.pendingSupervisor += 1;
    if (isPendingIreb(s)) bucket.pendingIreb += 1;
    if (isApprovedSupervisor(row)) bucket.approvedSupervisor += 1;
    if (isApprovedIreb(s)) bucket.approvedIreb += 1;
    if (isRejectedSupervisor(s)) bucket.rejectedSupervisor += 1;
    if (isRejectedIreb(s)) bucket.rejectedIreb += 1;
  }

  return yearRange.map((y) => buckets.get(y)!);
}

export async function getUsedDevicesData(session: Session) {
  const scopedRows = await getScopedSubmissionRows(session);
  const statusMap = new Map<string, number>();
  for (const row of scopedRows) {
    statusMap.set(row.current_status, (statusMap.get(row.current_status) ?? 0) + 1);
  }

  const role = session.user.adminRole;
  const supervisorApprovedCount = scopedRows.filter(
    (row) =>
      isStudentApplicantEmail(row.applicant_email) &&
      (row.current_status === "supervisor_approved" ||
        row.current_status === "under_ireb_review" ||
        row.current_status === "approved" ||
        row.current_status === "rejected"),
  ).length;
  const data =
    role === "supervisor"
      ? [
          {
            name: "Pending Supervisor Review",
            amount:
              (statusMap.get("submitted") ?? 0) + (statusMap.get("under_supervisor_review") ?? 0),
          },
          {
            name: "Approved by Supervisor",
            amount: supervisorApprovedCount,
          },
          {
            name: "Rejected by Supervisor",
            amount: statusMap.get("supervisor_rejected") ?? 0,
          },
        ]
      : role === "ireb"
        ? [
            {
              name: "Pending IREB Review",
              amount: statusMap.get("under_ireb_review") ?? 0,
            },
            {
              name: "Approved by IREB",
              amount: statusMap.get("approved") ?? 0,
            },
            {
              name: "Rejected by IREB",
              amount: statusMap.get("rejected") ?? 0,
            },
          ]
        : [
            {
              name: "Pending Supervisor Review",
              amount:
                (statusMap.get("submitted") ?? 0) + (statusMap.get("under_supervisor_review") ?? 0),
            },
            {
              name: "Pending IREB Review",
              amount: statusMap.get("under_ireb_review") ?? 0,
            },
            {
              name: "Approved by IREB",
              amount: statusMap.get("approved") ?? 0,
            },
            {
              name: "Rejected by Supervisor",
              amount: statusMap.get("supervisor_rejected") ?? 0,
            },
            {
              name: "Rejected by IREB",
              amount: statusMap.get("rejected") ?? 0,
            },
          ];

  const total = Math.max(
    data.reduce((acc, item) => acc + item.amount, 0),
    1,
  );

  return data.map((item) => ({
    ...item,
    percentage: Math.round((item.amount / total) * 100),
  }));
}

export async function getDashboardLeads(session: Session): Promise<DashboardLead[]> {
  const scopedRows = await getScopedSubmissionRows(session);
  const now = Date.now();
  const nowDate = new Date(now);
  return scopedRows.map((row) => {
    let currentStatus: LeadStatus = "Under Review by Supervisor";
    let stage: DashboardLead["stage"] = "supervisor";

    switch (row.current_status) {
      case "submitted":
      case "under_supervisor_review":
        currentStatus = "Under Review by Supervisor";
        stage = "supervisor";
        break;
      case "supervisor_approved":
      case "under_ireb_review":
        currentStatus = "Under Review by IREB";
        stage = "ireb";
        break;
      case "supervisor_rejected":
        currentStatus = "Rejected by Supervisor";
        stage = "completed";
        break;
      case "approved":
        currentStatus = "Approved by IREB";
        stage = "completed";
        break;
      case "rejected":
        currentStatus = "Rejected by IREB";
        stage = "completed";
        break;
    }

    const submittedAt = new Date(row.submitted_at).toISOString();
    const supervisorDecisionAt = row.supervisor_decision_at
      ? new Date(row.supervisor_decision_at).toISOString()
      : null;
    const submittedMs = new Date(row.submitted_at).getTime();
    const stagePendingDays = getStagePendingDays(
      { currentStatus, stage, submittedAt, supervisorDecisionAt },
      nowDate,
    );
    const totalDays = Math.max(1, Math.ceil((now - submittedMs) / (1000 * 60 * 60 * 24)));
    const days = stagePendingDays ?? totalDays;

    const stageStart =
      stage === "ireb" && row.supervisor_decision_at
        ? new Date(row.supervisor_decision_at)
        : new Date(row.submitted_at);
    const projectEnd = new Date(stageStart.getTime() + 2 * 24 * 60 * 60 * 1000);
    const project = `${stageStart.toLocaleDateString()} - ${projectEnd.toLocaleDateString()}`;

    const feedbackAndAudit = splitFeedbackAndAudit(row.latest_feedback_comment, row.latest_actor_name);
    return {
      ...feedbackAndAudit,
      id: row.id,
      applicationId: row.application_id,
      name: row.applicant_name,
      email: row.applicant_email,
      applicationType: formatSubmissionApplicationType(row.submission_type),
      researchTitle: row.research_title?.trim() || "—",
      faculty: row.faculty,
      department: row.department,
      project,
      duration: `${days} days`,
      currentStatus,
      supervisorName: row.supervisor_name,
      stage,
      submittedAt,
      supervisorDecisionAt,
      avatar: normalizeDashboardAvatarUrl(row.applicant_avatar_url),
      latestActionTrace: buildActionTrace({
        latestDecision: row.latest_decision,
        latestDecisionStage: row.latest_decision_stage,
        latestDecidedByName: row.latest_decided_by_name,
        latestAuditNote: feedbackAndAudit.latestAuditNote,
      }),
    };
  });
}

export async function getChatsData() {
  // Fake delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return [
    {
      name: "Jacob Jones",
      profile: "/images/user/user-01.png",
      isActive: true,
      lastMessage: {
        content: "See you tomorrow at the meeting!",
        type: "text",
        timestamp: "2024-12-19T14:30:00Z",
        isRead: false,
      },
      unreadCount: 3,
    },
    {
      name: "Wilium Smith",
      profile: "/images/user/user-03.png",
      isActive: true,
      lastMessage: {
        content: "Thanks for the update",
        type: "text",
        timestamp: "2024-12-19T10:15:00Z",
        isRead: true,
      },
      unreadCount: 0,
    },
    {
      name: "Johurul Haque",
      profile: "/images/user/user-04.png",
      isActive: false,
      lastMessage: {
        content: "What's up?",
        type: "text",
        timestamp: "2024-12-19T10:15:00Z",
        isRead: true,
      },
      unreadCount: 0,
    },
    {
      name: "M. Chowdhury",
      profile: "/images/user/user-05.png",
      isActive: false,
      lastMessage: {
        content: "Where are you now?",
        type: "text",
        timestamp: "2024-12-19T10:15:00Z",
        isRead: true,
      },
      unreadCount: 2,
    },
    {
      name: "Akagami",
      profile: "/images/user/user-07.png",
      isActive: false,
      lastMessage: {
        content: "Hey, how are you?",
        type: "text",
        timestamp: "2024-12-19T10:15:00Z",
        isRead: true,
      },
      unreadCount: 0,
    },
  ];
}