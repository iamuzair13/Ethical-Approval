/** Shared submission status labels/counts for report metrics and charts. */

export type ReportSubmissionStatus =
  | "submitted"
  | "under_hod_review"
  | "hod_approved"
  | "hod_rejected"
  | "under_ireb_review"
  | "approved"
  | "rejected";

export function submissionStatusLabel(cs: ReportSubmissionStatus): string {
  switch (cs) {
    case "submitted":
      return "Submitted";
    case "under_hod_review":
      return "Pending at HOD";
    case "hod_approved":
      return "Approved by HOD";
    case "hod_rejected":
      return "Rejected by HOD";
    case "under_ireb_review":
      return "Pending at IREB";
    case "approved":
      return "Approved by IREB";
    case "rejected":
      return "Rejected by IREB";
    default:
      return cs;
  }
}

export function submissionStatusCountsByLabel(
  rows: { current_status: ReportSubmissionStatus }[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = submissionStatusLabel(r.current_status);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}
