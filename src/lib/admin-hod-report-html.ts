/**
 * HOD's Report — standalone printable HTML (admin /reports catalog).
 * Uses the same print frame helpers as aggregate reports for consistent PDF tooling.
 */

import type { AggregateReportContext, AggregateSubmissionInput } from "@/lib/admin-aggregate-reports-html";
import {
  coverBlock,
  escapeHtml,
  wrapDocument,
} from "@/lib/admin-aggregate-reports-html";
import { buildHodReportChartsHtml } from "@/lib/admin-report-charts-html";
import { formatStaffSapId } from "@/lib/application-id";
import { isStudentApplicantEmail } from "@/lib/applicant-email";

const HOD_RESPONSE_DELAY_DAYS = 3;

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / 86400000);
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function fmtDays(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return (Math.round(n * 10) / 10).toFixed(1);
}

function fmtPct(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(Math.round(n * 10) / 10).toFixed(1)}%`;
}

export type HodReportMetricsInput = {
  hod: { name: string; email: string; sapId?: string | null };
  facultyLabel: string;
  rows: AggregateSubmissionInput[];
  institutionTotalSubmissions: number;
  rejectionReasonStated: "Yes" | "No" | "N/A";
};

function computeHodSummary(m: HodReportMetricsInput): [string, string][] {
  const { rows, institutionTotalSubmissions, rejectionReasonStated, hod, facultyLabel } = m;

  const totalApprovedForms = rows.filter((r) =>
    isStudentApplicantEmail(r.applicant_email) &&
    ["hod_approved", "under_admin_review", "under_ireb_review", "approved", "rejected"].includes(r.current_status),
  ).length;

  const totalRejectedForms = rows.filter((r) => r.current_status === "hod_rejected").length;

  const responded = rows.filter((r) => r.hod_decision_at != null);
  const responseDays = responded.map((r) => daysBetween(r.submitted_at, r.hod_decision_at!));
  const avgResponse = mean(responseDays);

  const delayResponse =
    responded.length === 0
      ? "N/A"
      : responseDays.some((d) => d > HOD_RESPONSE_DELAY_DAYS) ||
          (avgResponse != null && avgResponse > HOD_RESPONSE_DELAY_DAYS)
        ? "Yes"
        : "No";

  const contributionPct =
    institutionTotalSubmissions > 0 ? (rows.length / institutionTotalSubmissions) * 100 : null;

  return [
    ["Staff SAP ID", formatStaffSapId(hod.sapId)],
    ["Name", hod.name],
    ["Email", hod.email],
    ["Faculty", facultyLabel],
    ["Total approved forms", String(totalApprovedForms)],
    ["Total rejected forms", String(totalRejectedForms)],
    ["Rejection reason stated (Yes/No)", rejectionReasonStated],
    ["Average response days", responded.length > 0 ? `${fmtDays(avgResponse)} days` : "—"],
    ["Delay response (Yes/No)", delayResponse],
    ["Total contribution (%)", fmtPct(contributionPct)],
  ];
}

export function buildHodReportHtml(metrics: HodReportMetricsInput, ctx: AggregateReportContext): string {
  const rowsHtml = computeHodSummary(metrics);
  const body = rowsHtml
    .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
    .join("");
  const inner = `
  ${coverBlock(ctx)}
  ${buildHodReportChartsHtml({
    rows: metrics.rows,
    institutionTotalSubmissions: metrics.institutionTotalSubmissions,
  })}
  <div class="sec-title">HOD performance summary</div>
  <table class="pdf-grid"><tbody>${body}</tbody></table>
  <p class="footer-note">
    &ldquo;Total approved forms&rdquo; counts submissions that passed the hod stage (including those later rejected by IREB).
    &ldquo;Average response days&rdquo; uses the latest hod-stage decision timestamp where recorded.
    &ldquo;Delay response&rdquo; is <strong>Yes</strong> if any hod response exceeded ${HOD_RESPONSE_DELAY_DAYS} days from submission, or the average exceeded ${HOD_RESPONSE_DELAY_DAYS} days.
    &ldquo;Total contribution&rdquo; is this hod&rsquo;s scoped submissions as a percentage of all non-draft submissions in the same selected date range.
    Rejection reasons reflect whether every hod rejection in scope has a non-empty comment on the latest hod rejection decision.
  </p>`;
  return wrapDocument(`${ctx.reportTitle} — ${ctx.periodLabel}`, inner);
}
