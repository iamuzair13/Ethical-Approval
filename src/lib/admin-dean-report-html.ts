/**
 * Dean's Report — standalone printable HTML (admin /reports catalog).
 * Uses the same print frame helpers as aggregate reports for consistent PDF tooling.
 */

import type { AggregateReportContext, AggregateSubmissionInput } from "@/lib/admin-aggregate-reports-html";
import { coverBlock, escapeHtml, wrapDocument } from "@/lib/admin-aggregate-reports-html";

const DEAN_RESPONSE_DELAY_DAYS = 3;

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

export type DeanReportMetricsInput = {
  dean: { id: string; name: string; email: string };
  facultyLabel: string;
  rows: AggregateSubmissionInput[];
  institutionTotalSubmissions: number;
  rejectionReasonStated: "Yes" | "No" | "N/A";
};

function computeDeanSummary(m: DeanReportMetricsInput): [string, string][] {
  const { rows, institutionTotalSubmissions, rejectionReasonStated, dean, facultyLabel } = m;

  const totalApprovedForms = rows.filter((r) =>
    ["dean_approved", "under_ireb_review", "approved", "rejected"].includes(r.current_status),
  ).length;

  const totalRejectedForms = rows.filter((r) => r.current_status === "dean_rejected").length;

  const responded = rows.filter((r) => r.dean_decision_at != null);
  const responseDays = responded.map((r) => daysBetween(r.submitted_at, r.dean_decision_at!));
  const avgResponse = mean(responseDays);

  const delayResponse =
    responded.length === 0
      ? "N/A"
      : responseDays.some((d) => d > DEAN_RESPONSE_DELAY_DAYS) ||
          (avgResponse != null && avgResponse > DEAN_RESPONSE_DELAY_DAYS)
        ? "Yes"
        : "No";

  const contributionPct =
    institutionTotalSubmissions > 0 ? (rows.length / institutionTotalSubmissions) * 100 : null;

  return [
    ["Dean ID", dean.id],
    ["Name", dean.name],
    ["Faculty", facultyLabel],
    ["Total approved forms", String(totalApprovedForms)],
    ["Total rejected forms", String(totalRejectedForms)],
    ["Rejection reason stated (Yes/No)", rejectionReasonStated],
    ["Average response days", responded.length > 0 ? `${fmtDays(avgResponse)} days` : "—"],
    ["Delay response (Yes/No)", delayResponse],
    ["Total contribution (%)", fmtPct(contributionPct)],
  ];
}

export function buildDeanReportHtml(metrics: DeanReportMetricsInput, ctx: AggregateReportContext): string {
  const rowsHtml = computeDeanSummary(metrics);
  const body = rowsHtml
    .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
    .join("");
  const inner = `
  ${coverBlock(ctx)}
  <div class="sec-title">Dean performance summary</div>
  <table class="pdf-grid"><tbody>${body}</tbody></table>
  <p class="footer-note">
    &ldquo;Total approved forms&rdquo; counts submissions that passed the dean stage (including those later rejected by IREB).
    &ldquo;Average response days&rdquo; uses the latest dean-stage decision timestamp where recorded.
    &ldquo;Delay response&rdquo; is <strong>Yes</strong> if any dean response exceeded ${DEAN_RESPONSE_DELAY_DAYS} days from submission, or the average exceeded ${DEAN_RESPONSE_DELAY_DAYS} days.
    &ldquo;Total contribution&rdquo; is this dean&rsquo;s scoped submissions as a percentage of all non-draft submissions in the same period (lifetime for this report).
    Rejection reasons reflect whether every dean rejection in scope has a non-empty comment on the latest dean rejection decision.
  </p>`;
  return wrapDocument(`${ctx.reportTitle} — ${ctx.periodLabel}`, inner);
}
