import type { Session } from "next-auth";
import { db } from "@/lib/db";
import type { AuthenticatedAdmin } from "@/lib/admin-auth";
import { getScopedSubmissions } from "@/lib/authorization";

export type OverviewData = {
  views: { value: number; growthRate: number };
  profit: { value: number; growthRate: number };
  products: { value: number; growthRate: number };
  users: { value: number; growthRate: number };
};

type LeadStatus =
  | "Approved by Dean"
  | "Rejected by Dean"
  | "Approved by IREB"
  | "Rejected by IREB";

export type DashboardLead = {
  name: string;
  email: string;
  project: string;
  duration: string;
  status: LeadStatus;
  avatar: string;
};

type SubmissionScopeRow = {
  id: number;
  submitted_at: Date;
  applicant_name: string;
  applicant_email: string;
};

type DecisionAggregateRow = {
  stage: "dean" | "ireb";
  decision: "approved" | "rejected";
  count: string;
};

function toAdminScope(session: Session): AuthenticatedAdmin | null {
  if (!session.user.adminId || !session.user.adminRole || !session.user.adminStatus) {
    return null;
  }
  return {
    adminId: session.user.adminId,
    role: session.user.adminRole,
    status: session.user.adminStatus,
    scopeMode: session.user.adminScopeMode ?? "all",
    facultyIds: session.user.adminFacultyIds ?? [],
    tokenVersion: 0,
  };
}

async function getScopedSubmissionRows(session?: Session): Promise<SubmissionScopeRow[]> {
  if (!session) {
    const result = await db.query<SubmissionScopeRow>(
      `
        SELECT
          s.id,
          s.submitted_at,
          sas.name AS applicant_name,
          sas.email AS applicant_email
        FROM submissions s
        INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
        ORDER BY s.submitted_at DESC
      `,
    );
    return result.rows;
  }

  const admin = toAdminScope(session);
  if (admin) {
    const rows = await getScopedSubmissions(admin);
    return rows.map((row) => ({
      id: row.id,
      submitted_at: row.submitted_at,
      applicant_name: row.applicant_name,
      applicant_email: row.applicant_email,
    }));
  }

  if (session.user.sapId) {
    const ownRows = await db.query<SubmissionScopeRow>(
      `
        SELECT
          s.id,
          s.submitted_at,
          sas.name AS applicant_name,
          sas.email AS applicant_email
        FROM submissions s
        INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
        WHERE sas.sap_id = $1
        ORDER BY s.submitted_at DESC
      `,
      [session.user.sapId],
    );
    return ownRows.rows;
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

  if (submissionIds.length === 0) {
    return {
      views: { value: 0, growthRate: 0 },
      profit: { value: 0, growthRate: 0 },
      products: { value: 0, growthRate: 0 },
      users: { value: 0, growthRate: 0 },
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
  const pendingDean = statusMap.get("under_dean_review") ?? 0;
  const pendingIreb = statusMap.get("under_ireb_review") ?? 0;

  const approvedDeanStatuses = [
    "dean_approved",
    "under_ireb_review",
    "approved",
    "rejected",
  ];
  const approvedDean = approvedDeanStatuses.reduce(
    (acc, key) => acc + (statusMap.get(key) ?? 0),
    0,
  );

  const approvedIreb = statusMap.get("approved") ?? 0;

  return {
    views: { value: total, growthRate: 0 },
    profit: { value: pendingDean, growthRate: 0 },
    products: { value: pendingIreb, growthRate: 0 },
    users: { value: approvedDean + approvedIreb, growthRate: 0 },
  };
}

export async function getUsedDevicesData(session: Session) {
  const scopedRows = await getScopedSubmissionRows(session);
  const submissionIds = scopedRows.map((row) => row.id);
  const aggregates = await getDecisionAggregates(submissionIds);

  const getCount = (stage: "dean" | "ireb", decision: "approved" | "rejected") =>
    Number(
      aggregates.find((row) => row.stage === stage && row.decision === decision)?.count ?? 0,
    );

  const deanApproved = getCount("dean", "approved");
  const deanRejected = getCount("dean", "rejected");
  const irebApproved = getCount("ireb", "approved");
  const irebRejected = getCount("ireb", "rejected");
  const total = Math.max(deanApproved + deanRejected + irebApproved + irebRejected, 1);

  return [
    {
      name: "Approved by Dean",
      amount: deanApproved,
      percentage: Math.round((deanApproved / total) * 100),
    },
    {
      name: "Rejected by Dean",
      amount: deanRejected,
      percentage: Math.round((deanRejected / total) * 100),
    },
    {
      name: "Approved by IREB",
      amount: irebApproved,
      percentage: Math.round((irebApproved / total) * 100),
    },
    {
      name: "Rejected by IREB",
      amount: irebRejected,
      percentage: Math.round((irebRejected / total) * 100),
    },
  ];
}

export async function getDashboardLeads(session: Session): Promise<DashboardLead[]> {
  const scopedRows = await getScopedSubmissionRows(session);
  const submissionIds = scopedRows.map((row) => row.id);
  if (submissionIds.length === 0) return [];

  const latestDecisions = await db.query<{
    submission_id: number;
    stage: "dean" | "ireb";
    decision: "approved" | "rejected";
  }>(
    `
      SELECT DISTINCT ON (ad.submission_id)
        ad.submission_id,
        ad.stage,
        ad.decision
      FROM approval_decisions ad
      WHERE ad.submission_id = ANY($1::bigint[])
      ORDER BY ad.submission_id, ad.decided_at DESC
    `,
    [submissionIds],
  );

  const decisionMap = new Map(
    latestDecisions.rows.map((row) => [row.submission_id, row] as const),
  );

  const now = Date.now();
  return scopedRows.slice(0, 20).map((row) => {
    const decision = decisionMap.get(row.id);
    const status: LeadStatus =
      decision?.stage === "ireb"
        ? decision.decision === "approved"
          ? "Approved by IREB"
          : "Rejected by IREB"
        : decision?.stage === "dean"
          ? decision.decision === "approved"
            ? "Approved by Dean"
            : "Rejected by Dean"
          : "Rejected by Dean";

    const submittedMs = new Date(row.submitted_at).getTime();
    const days = Math.max(1, Math.ceil((now - submittedMs) / (1000 * 60 * 60 * 24)));
    const from = new Date(row.submitted_at);
    const to = new Date(from.getTime() + 2 * 24 * 60 * 60 * 1000);
    const project = `${from.toLocaleDateString()} - ${to.toLocaleDateString()}`;

    return {
      name: row.applicant_name,
      email: row.applicant_email,
      project,
      duration: `${days} days`,
      status,
      avatar: "/images/user/user-17.png",
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