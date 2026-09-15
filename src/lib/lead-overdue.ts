export const OVERDUE_THRESHOLD_DAYS = 2;

export type OverdueLeadInput = {
  currentStatus: string;
  submittedAt: string;
  hodDecisionAt: string | null;
};

export type OverdueRole = "administrator" | "hod" | "ireb" | null;

export type OverdueScope = {
  hodOnly?: boolean;
  ethicalOnly?: boolean;
};

export function parseLeadDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
}

export function isHodReviewOverdue({
  currentStatus,
  submittedAt,
  now = new Date(),
}: {
  currentStatus: string;
  submittedAt: string | Date;
  now?: Date;
}): boolean {
  if (currentStatus !== "Under Review by HOD") return false;
  const submitted = parseLeadDate(submittedAt);
  if (!submitted) return false;
  return daysBetween(submitted, now) > OVERDUE_THRESHOLD_DAYS;
}

export function isIrebReviewOverdue({
  currentStatus,
  submittedAt,
  hodDecisionAt,
  now = new Date(),
}: {
  currentStatus: string;
  submittedAt: string | Date;
  hodDecisionAt: string | Date | null;
  now?: Date;
}): boolean {
  if (currentStatus !== "Under Review by IREB") return false;
  const stageStart = parseLeadDate(hodDecisionAt) ?? parseLeadDate(submittedAt);
  if (!stageStart) return false;
  return daysBetween(stageStart, now) > OVERDUE_THRESHOLD_DAYS;
}

export function isLeadOverdueForRole(
  lead: OverdueLeadInput,
  role: OverdueRole,
  scope: OverdueScope = {},
  now: Date = new Date(),
): boolean {
  const hodOverdue = isHodReviewOverdue({
    currentStatus: lead.currentStatus,
    submittedAt: lead.submittedAt,
    now,
  });
  const adminOverdue = isAdminReviewOverdue({
    currentStatus: lead.currentStatus,
    submittedAt: lead.submittedAt,
    hodDecisionAt: lead.hodDecisionAt,
    now,
  });
  const irebOverdue = isIrebReviewOverdue({
    currentStatus: lead.currentStatus,
    submittedAt: lead.submittedAt,
    hodDecisionAt: lead.hodDecisionAt,
    now,
  });

  if (role === "hod") return hodOverdue;
  if (role === "ireb") return irebOverdue;
  if (role === "administrator") return hodOverdue || adminOverdue || irebOverdue;

  if (scope.hodOnly) return hodOverdue;
  if (scope.ethicalOnly) return irebOverdue;
  return hodOverdue || adminOverdue || irebOverdue;
}

export function isAdminReviewOverdue({
  currentStatus,
  submittedAt,
  hodDecisionAt,
  now = new Date(),
}: {
  currentStatus: string;
  submittedAt: string | Date;
  hodDecisionAt: string | Date | null;
  now?: Date;
}): boolean {
  if (currentStatus !== "Under Review by IREB") return false;
  const stageStart = parseLeadDate(hodDecisionAt) ?? parseLeadDate(submittedAt);
  if (!stageStart) return false;
  return daysBetween(stageStart, now) > OVERDUE_THRESHOLD_DAYS;
}

export function getStagePendingDays(
  lead: OverdueLeadInput & { stage: "hod" | "admin" | "ireb" | "completed" },
  now: Date = new Date(),
): number | null {
  if (lead.stage === "hod" && lead.currentStatus === "Under Review by HOD") {
    const submitted = parseLeadDate(lead.submittedAt);
    if (!submitted) return null;
    return Math.max(1, daysBetween(submitted, now) || 1);
  }

  if (lead.stage === "admin" && lead.currentStatus === "Under Review by IREB") {
    const stageStart =
      parseLeadDate(lead.hodDecisionAt) ?? parseLeadDate(lead.submittedAt);
    if (!stageStart) return null;
    return Math.max(1, daysBetween(stageStart, now) || 1);
  }

  if (lead.stage === "ireb" && lead.currentStatus === "Under Review by IREB") {
    const stageStart =
      parseLeadDate(lead.hodDecisionAt) ?? parseLeadDate(lead.submittedAt);
    if (!stageStart) return null;
    return Math.max(1, daysBetween(stageStart, now) || 1);
  }

  return null;
}
