export const OVERDUE_THRESHOLD_DAYS = 2;

export type OverdueLeadInput = {
  currentStatus: string;
  submittedAt: string;
  deanDecisionAt: string | null;
};

export type OverdueRole = "administrator" | "dean" | "ireb" | null;

export type OverdueScope = {
  deanOnly?: boolean;
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

export function isDeanReviewOverdue({
  currentStatus,
  submittedAt,
  now = new Date(),
}: {
  currentStatus: string;
  submittedAt: string | Date;
  now?: Date;
}): boolean {
  if (currentStatus !== "Under Review by Dean") return false;
  const submitted = parseLeadDate(submittedAt);
  if (!submitted) return false;
  return daysBetween(submitted, now) > OVERDUE_THRESHOLD_DAYS;
}

export function isIrebReviewOverdue({
  currentStatus,
  submittedAt,
  deanDecisionAt,
  now = new Date(),
}: {
  currentStatus: string;
  submittedAt: string | Date;
  deanDecisionAt: string | Date | null;
  now?: Date;
}): boolean {
  if (currentStatus !== "Under Review by IREB") return false;
  const stageStart = parseLeadDate(deanDecisionAt) ?? parseLeadDate(submittedAt);
  if (!stageStart) return false;
  return daysBetween(stageStart, now) > OVERDUE_THRESHOLD_DAYS;
}

export function isLeadOverdueForRole(
  lead: OverdueLeadInput,
  role: OverdueRole,
  scope: OverdueScope = {},
  now: Date = new Date(),
): boolean {
  const deanOverdue = isDeanReviewOverdue({
    currentStatus: lead.currentStatus,
    submittedAt: lead.submittedAt,
    now,
  });
  const irebOverdue = isIrebReviewOverdue({
    currentStatus: lead.currentStatus,
    submittedAt: lead.submittedAt,
    deanDecisionAt: lead.deanDecisionAt,
    now,
  });

  if (role === "dean") return deanOverdue;
  if (role === "ireb") return irebOverdue;
  if (role === "administrator") return deanOverdue || irebOverdue;

  if (scope.deanOnly) return deanOverdue;
  if (scope.ethicalOnly) return irebOverdue;
  return deanOverdue || irebOverdue;
}

export function getStagePendingDays(
  lead: OverdueLeadInput & { stage: "dean" | "ireb" | "completed" },
  now: Date = new Date(),
): number | null {
  if (lead.stage === "dean" && lead.currentStatus === "Under Review by Dean") {
    const submitted = parseLeadDate(lead.submittedAt);
    if (!submitted) return null;
    return Math.max(1, daysBetween(submitted, now) || 1);
  }

  if (lead.stage === "ireb" && lead.currentStatus === "Under Review by IREB") {
    const stageStart =
      parseLeadDate(lead.deanDecisionAt) ?? parseLeadDate(lead.submittedAt);
    if (!stageStart) return null;
    return Math.max(1, daysBetween(stageStart, now) || 1);
  }

  return null;
}
