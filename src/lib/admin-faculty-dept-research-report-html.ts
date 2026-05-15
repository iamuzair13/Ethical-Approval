import type { AggregateReportContext, AggregateSubmissionInput } from "@/lib/admin-aggregate-reports-html";
import { coverBlock, escapeHtml, wrapDocument } from "@/lib/admin-aggregate-reports-html";
import {
  buildDepartmentWiseResearchChartsHtml,
  buildFacultyWiseResearchChartsHtml,
} from "@/lib/admin-report-charts-html";
import {
  departmentCountsForFacultyReport,
  extremalDepartmentByVolume,
} from "@/lib/admin-report-faculty-dept-filters";
import { commonResearchPurposeSummary, topSdgsLine } from "@/lib/admin-research-metrics-text";

function fmtPct(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(Math.round(n * 10) / 10).toFixed(1)}%`;
}

function isApproved(r: AggregateSubmissionInput): boolean {
  return r.current_status === "approved";
}

function isRejected(r: AggregateSubmissionInput): boolean {
  return r.current_status === "rejected" || r.current_status === "dean_rejected";
}

function isPending(r: AggregateSubmissionInput): boolean {
  return !isApproved(r) && !isRejected(r);
}

function facultyApplicantSharePct(rows: AggregateSubmissionInput[]): string {
  const n = rows.length;
  if (!n) return "—";
  const fac = rows.filter((r) => r.applicant_role === "faculty").length;
  return fmtPct((fac / n) * 100);
}

function metricsTable(rows: AggregateSubmissionInput[], extraRows: [string, string][]): string {
  const n = rows.length;
  const thesis = rows.filter((r) => r.type === "thesis").length;
  const pub = rows.filter((r) => r.type === "publication").length;
  const appr = rows.filter(isApproved).length;
  const rej = rows.filter(isRejected).length;
  const pend = rows.filter(isPending).length;

  const base: [string, string][] = [
    ["Total Thesis/Project Applications Received", String(thesis)],
    ["Total Research Publication Application", String(pub)],
    ["Total Approved Applications", String(appr)],
    ["Total Rejected Applications", String(rej)],
    ["Total Pending Applications", String(pend)],
    ["Common Research Purpose(s)", commonResearchPurposeSummary(rows)],
    ["Top 5 SDGs Covered", topSdgsLine(rows, 5)],
    ...extraRows,
    ["Faculty Research Requests (%)", facultyApplicantSharePct(rows)],
  ];

  const body = base
    .map(([a, b]) => `<tr><th>${escapeHtml(a)}</th><td>${escapeHtml(b)}</td></tr>`)
    .join("");
  return `<div class="sec-title">Summary</div><table class="pdf-grid"><tbody>${body}</tbody></table>`;
}

export function buildFacultyWiseResearchReportHtml(
  rows: AggregateSubmissionInput[],
  ctx: AggregateReportContext,
  focus: { facultyName: string },
): string {
  const byDept = departmentCountsForFacultyReport(rows);
  const hi = extremalDepartmentByVolume(byDept, "max");
  const lo = extremalDepartmentByVolume(byDept, "min");
  const hiStr = hi && hi.count > 0 ? `${hi.name} (${hi.count})` : "—";
  const loStr = lo && lo.count > 0 ? `${lo.name} (${lo.count})` : "—";

  const extra: [string, string][] = [
    ["Highest Number of Research Requests by Department", hiStr],
    ["Lowest Number of Research Requests by Department", loStr],
  ];

  const inner = `
  ${coverBlock({ ...ctx, subjectLine: `Faculty: ${focus.facultyName}` })}
  ${buildFacultyWiseResearchChartsHtml(rows)}
  ${metricsTable(rows, extra)}
  <p class="footer-note">Faculty-wise research summary for the selected period and scope.</p>`;
  return wrapDocument(`${ctx.reportTitle} — ${ctx.periodLabel}`, inner);
}

export function buildDepartmentWiseResearchReportHtml(
  rows: AggregateSubmissionInput[],
  ctx: AggregateReportContext,
  focus: { departmentName: string; facultyName: string },
): string {
  const inner = `
  ${coverBlock({
    ...ctx,
    subjectLine: `Department: ${focus.departmentName} — ${focus.facultyName}`,
  })}
  ${buildDepartmentWiseResearchChartsHtml(rows)}
  ${metricsTable(rows, [])}
  <p class="footer-note">Department-wise research summary for the selected period and scope.</p>`;
  return wrapDocument(`${ctx.reportTitle} — ${ctx.periodLabel}`, inner);
}
