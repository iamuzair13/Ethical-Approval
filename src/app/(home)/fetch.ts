import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { normalizeFacultyIds, type AuthenticatedAdmin } from "@/lib/admin-auth";
import { getScopedSubmissions } from "@/lib/authorization";

export type OverviewData = {
  views: { value: number; growthRate: number };
  profit: { value: number; growthRate: number };
  products: { value: number; growthRate: number };
  users: { value: number; growthRate: number };
  customers: { value: number; growthRate: number };
  deanPending: { value: number; growthRate: number };
  deanApproved: { value: number; growthRate: number };
};

type LeadStatus =
  | "Submitted"
  | "Under Review by Dean"
  | "Approved by Dean"
  | "Rejected by Dean"
  | "Under Review by IREB"
  | "Approved by IREB"
  | "Rejected by IREB";

export type DashboardLead = {
  id: number;
  name: string;
  email: string;
  faculty: string;
  project: string;
  duration: string;
  passedStatus: LeadStatus;
  currentStatus: LeadStatus;
  stage: "dean" | "ireb" | "completed";
  avatar: string;
};

type SubmissionScopeRow = {
  id: number;
  submitted_at: Date;
  applicant_name: string;
  applicant_email: string;
  faculty: string;
  current_status:
    | "submitted"
    | "under_dean_review"
    | "dean_approved"
    | "dean_rejected"
    | "under_ireb_review"
    | "approved"
    | "rejected";
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
    facultyIds: normalizeFacultyIds(session.user.adminFacultyIds),
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
          sas.email AS applicant_email,
          sas.faculty,
          s.current_status
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
      faculty: row.faculty,
      current_status: row.current_status,
    }));
  }

  if (session.user.sapId) {
    const ownRows = await db.query<SubmissionScopeRow>(
      `
        SELECT
          s.id,
          s.submitted_at,
          sas.name AS applicant_name,
          sas.email AS applicant_email,
          sas.faculty,
          s.current_status
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
  const role = session?.user?.adminRole ?? null;

  if (submissionIds.length === 0) {
    return {
      views: { value: 0, growthRate: 0 },
      profit: { value: 0, growthRate: 0 },
      products: { value: 0, growthRate: 0 },
      users: { value: 0, growthRate: 0 },
      customers: { value: 0, growthRate: 0 },
      deanPending: { value: 0, growthRate: 0 },
      deanApproved: { value: 0, growthRate: 0 },
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

  const pendingDean =
    (statusMap.get("submitted") ?? 0) + (statusMap.get("under_dean_review") ?? 0);
  const pendingIreb = statusMap.get("under_ireb_review") ?? 0;
  const deanApproved =
    (statusMap.get("dean_approved") ?? 0) +
    (statusMap.get("under_ireb_review") ?? 0) +
    (statusMap.get("approved") ?? 0) +
    (statusMap.get("rejected") ?? 0);
  const deanRejected = statusMap.get("dean_rejected") ?? 0;
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
      deanPending: { value: pendingDean, growthRate: toRate(pendingDean) },
      deanApproved: { value: deanApproved, growthRate: toRate(deanApproved) },
    };
  }

  if (role === "dean") {
    return {
      views: { value: total, growthRate: 100 },
      profit: { value: pendingDean, growthRate: toRate(pendingDean) },
      products: { value: pendingIreb, growthRate: toRate(pendingIreb) },
      users: { value: deanApproved, growthRate: toRate(deanApproved) },
      customers: { value: deanRejected, growthRate: toRate(deanRejected) },
      deanPending: { value: pendingDean, growthRate: toRate(pendingDean) },
      deanApproved: { value: deanApproved, growthRate: toRate(deanApproved) },
    };
  }

  return {
    views: { value: total, growthRate: 100 },
    profit: { value: pendingDean, growthRate: toRate(pendingDean) },
    products: { value: pendingIreb, growthRate: toRate(pendingIreb) },
    users: { value: deanApproved, growthRate: toRate(deanApproved) },
    customers: { value: irebApproved, growthRate: toRate(irebApproved) },
    deanPending: { value: pendingDean, growthRate: toRate(pendingDean) },
    deanApproved: { value: deanApproved, growthRate: toRate(deanApproved) },
  };
}

export async function getUsedDevicesData(session: Session) {
  const scopedRows = await getScopedSubmissionRows(session);
  const statusMap = new Map<string, number>();
  for (const row of scopedRows) {
    statusMap.set(row.current_status, (statusMap.get(row.current_status) ?? 0) + 1);
  }

  const role = session.user.adminRole;
  const data =
    role === "dean"
      ? [
          {
            name: "Pending Dean Review",
            amount:
              (statusMap.get("submitted") ?? 0) + (statusMap.get("under_dean_review") ?? 0),
          },
          {
            name: "Approved by Dean",
            amount:
              (statusMap.get("dean_approved") ?? 0) +
              (statusMap.get("under_ireb_review") ?? 0) +
              (statusMap.get("approved") ?? 0) +
              (statusMap.get("rejected") ?? 0),
          },
          {
            name: "Rejected by Dean",
            amount: statusMap.get("dean_rejected") ?? 0,
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
              name: "Pending Dean Review",
              amount:
                (statusMap.get("submitted") ?? 0) + (statusMap.get("under_dean_review") ?? 0),
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
              name: "Rejected Requests",
              amount:
                (statusMap.get("dean_rejected") ?? 0) + (statusMap.get("rejected") ?? 0),
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
  return scopedRows.slice(0, 20).map((row) => {
    let passedStatus: LeadStatus = "Submitted";
    let currentStatus: LeadStatus = "Under Review by Dean";
    let stage: DashboardLead["stage"] = "dean";

    switch (row.current_status) {
      case "submitted":
      case "under_dean_review":
        passedStatus = "Submitted";
        currentStatus = "Under Review by Dean";
        stage = "dean";
        break;
      case "dean_approved":
      case "under_ireb_review":
        passedStatus = "Approved by Dean";
        currentStatus = "Under Review by IREB";
        stage = "ireb";
        break;
      case "dean_rejected":
        passedStatus = "Submitted";
        currentStatus = "Rejected by Dean";
        stage = "completed";
        break;
      case "approved":
        passedStatus = "Approved by Dean";
        currentStatus = "Approved by IREB";
        stage = "completed";
        break;
      case "rejected":
        passedStatus = "Approved by Dean";
        currentStatus = "Rejected by IREB";
        stage = "completed";
        break;
    }

    const submittedMs = new Date(row.submitted_at).getTime();
    const days = Math.max(1, Math.ceil((now - submittedMs) / (1000 * 60 * 60 * 24)));
    const from = new Date(row.submitted_at);
    const to = new Date(from.getTime() + 2 * 24 * 60 * 60 * 1000);
    const project = `${from.toLocaleDateString()} - ${to.toLocaleDateString()}`;

    return {
      id: row.id,
      name: row.applicant_name,
      email: row.applicant_email,
      faculty: row.faculty,
      project,
      duration: `${days} days`,
      passedStatus,
      currentStatus,
      stage,
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