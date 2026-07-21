/**
 * Printable aggregate HTML reports for the admin /reports catalog.
 * Styling matches admin-leads-reports-html (print + toolbar).
 */

import {
  buildOverallResearchSpecificChartsHtml,
  buildTotalEfficiencyChartsHtml,
} from "@/lib/admin-report-charts-html";

export type AggregateReportContext = {
  reportTitle: string;
  generatedAt: Date;
  periodLabel: string;
  scopeDescription: string;
  subjectLine?: string;
};

export type AggregateSubmissionInput = {
  submission_id: number;
  application_id: string;
  type: "thesis" | "publication";
  domain: "medical" | "non_medical";
  applicant_role: "student" | "faculty";
  current_status:
    | "submitted"
    | "under_supervisor_review"
    | "supervisor_approved"
    | "supervisor_rejected"
    | "under_ireb_review"
    | "approved"
    | "rejected";
  submitted_at: Date;
  faculty: string;
  applicant_email: string;
  applicant_department: string;
  applicant_program: string | null;
  supervisor_decision_at: Date | null;
  ireb_decision_at: Date | null;
  /** 1-based applicant submission sequence among non-draft rows (same logic as submission detail). */
  applicant_attempt_number: number;
  objectives: string | null;
  methodology: string | null;
  ethics_json: unknown;
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / 86400000);
}

function fmtDays(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return (Math.round(n * 10) / 10).toFixed(1);
}

function fmtPct(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(Math.round(n * 10) / 10).toFixed(1)}%`;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  if (s.length % 2 === 1) return s[m];
  return (s[m - 1] + s[m]) / 2;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export { submissionStatusLabel, submissionStatusCountsByLabel } from "@/lib/admin-submission-status";

const REPORT_STYLES = `
  :root {
    --ink: #111827;
    --muted: #6b7280;
    --border: #000000;
    --accent: #5750f1;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px 28px 40px;
    font-family: "Times New Roman", Times, ui-serif, Georgia, serif;
    font-size: 13px;
    line-height: 1.45;
    color: var(--ink);
    background: #fff;
  }
  .report-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    padding: 12px 14px;
    margin: 0 0 20px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #f9fafb;
    font-family: ui-sans-serif, system-ui, sans-serif;
  }
  .report-actions button {
    cursor: pointer;
    border-radius: 8px;
    border: 1px solid #d1d5db;
    background: #fff;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 600;
    color: #111827;
  }
  .report-actions button.primary {
    background: #5750f1;
    border-color: #5750f1;
    color: #fff;
  }
  .report-actions button:hover { filter: brightness(0.97); }
  .doc-title {
    margin: 0 0 12px;
    font-size: 18px;
    font-weight: 700;
    text-decoration: underline;
    text-align: center;
  }
  .meta-block {
    margin: 0 0 24px;
    text-align: center;
    font-size: 12px;
    color: var(--muted);
    font-family: ui-sans-serif, system-ui, sans-serif;
  }
  .meta-block strong { color: var(--ink); }
  .sec-title {
    margin: 22px 0 10px;
    font-size: 14px;
    font-weight: 700;
  }
  table.pdf-grid {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin-bottom: 16px;
  }
  table.pdf-grid th,
  table.pdf-grid td {
    border: 1px solid var(--border);
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
    word-break: break-word;
  }
  table.pdf-grid th {
    font-weight: 600;
    background: #fafafa;
    width: 36%;
  }
  table.pdf-data th,
  table.pdf-data td {
    border: 1px solid var(--border);
    padding: 6px 8px;
    text-align: left;
    font-size: 12px;
  }
  table.pdf-data thead th {
    background: #f3f4f6;
    font-weight: 700;
  }
  .footer-note {
    margin-top: 28px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    font-size: 10px;
    color: var(--muted);
    font-family: ui-sans-serif, system-ui, sans-serif;
  }
  .report-charts {
    margin: 0 0 20px;
    padding: 0 0 8px;
    border-bottom: 1px solid #e5e7eb;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .report-charts > .sec-title {
    margin-top: 0;
  }
  .chart-scope-note {
    margin: -4px 0 12px;
    font-size: 11px;
    color: var(--muted);
    font-family: ui-sans-serif, system-ui, sans-serif;
  }
  .chart-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px 18px;
    align-items: start;
  }
  .chart-figure {
    break-inside: avoid;
    page-break-inside: avoid;
    margin: 0;
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fafafa;
    font-family: ui-sans-serif, system-ui, sans-serif;
    overflow: visible;
  }
  .chart-caption {
    font-size: 11px;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 8px;
  }
  .chart-empty {
    margin: 0;
    font-size: 11px;
    color: var(--muted);
  }
  .stacked-bar-track {
    display: flex;
    height: 22px;
    width: 100%;
    max-width: 420px;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid #d1d5db;
    background: #fff;
  }
  .stack-seg {
    min-width: 0;
    height: 100%;
    transition: none;
  }
  .chart-legend {
    margin-top: 8px;
    font-size: 10px;
    color: var(--muted);
    line-height: 1.5;
  }
  .chart-legend-item {
    display: inline-block;
    margin-right: 12px;
    white-space: nowrap;
  }
  .chart-legend-item .swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 4px;
    border-radius: 2px;
    vertical-align: middle;
    border: 1px solid #d1d5db;
  }
  .chart-svg {
    display: block;
    max-width: 100%;
    height: auto;
  }
  @media print {
    .no-print { display: none !important; }
    body { padding: 12mm; }
  }
`;

function embeddedToolbar(): string {
  return `
  <div class="report-actions no-print">
    <button type="button" onclick="window.print()">Print / Save as PDF</button>
    <button type="button" class="primary" id="ireb-admin-report-download-btn">Download PDF</button>
  </div>
  <script>
    (function () {
      var b = document.getElementById("ireb-admin-report-download-btn");
      if (!b) return;
      b.addEventListener("click", function () {
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: "IREB_ADMIN_REPORT_DOWNLOAD" }, "*");
          }
        } catch (e) {}
      });
    })();
  </script>`;
}

export function wrapDocument(title: string, inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${REPORT_STYLES}</style>
</head>
<body>
${embeddedToolbar()}
${inner}
</body>
</html>`;
}

export function coverBlock(ctx: AggregateReportContext): string {
  const subject = ctx.subjectLine?.trim()
    ? `<div><strong>Subject:</strong> ${escapeHtml(ctx.subjectLine!)}</div>`
    : "";
  return `
  <h1 class="doc-title">${escapeHtml(ctx.reportTitle)}</h1>
  <div class="meta-block">
    <div><strong>Period:</strong> ${escapeHtml(ctx.periodLabel)}</div>
    <div><strong>Scope:</strong> ${escapeHtml(ctx.scopeDescription)}</div>
    ${subject}
    <div><strong>Generated:</strong> ${escapeHtml(ctx.generatedAt.toLocaleString())}</div>
  </div>`;
}

function collectSupervisorDecisionDays(rows: AggregateSubmissionInput[]): number[] {
  const out: number[] = [];
  for (const r of rows) {
    if (!r.supervisor_decision_at) continue;
    out.push(daysBetween(r.submitted_at, r.supervisor_decision_at));
  }
  return out;
}

/** Submission → final recorded decision (IREB preferred; else supervisor), including supervisor-only rejections. */
function collectTerminalCycleDays(rows: AggregateSubmissionInput[]): number[] {
  const out: number[] = [];
  for (const r of rows) {
    const terminal =
      r.current_status === "approved" ||
      r.current_status === "rejected" ||
      r.current_status === "supervisor_rejected";
    if (!terminal) continue;
    const end = r.ireb_decision_at ?? r.supervisor_decision_at;
    if (!end) continue;
    out.push(daysBetween(r.submitted_at, end));
  }
  return out;
}

function collectIrebPhaseDays(rows: AggregateSubmissionInput[]): number[] {
  const out: number[] = [];
  for (const r of rows) {
    if (!r.supervisor_decision_at || !r.ireb_decision_at) continue;
    out.push(daysBetween(r.supervisor_decision_at, r.ireb_decision_at));
  }
  return out;
}

function supervisorIrebDelaySharePct(rows: AggregateSubmissionInput[]): { supervisor: number; ireb: number } | null {
  let sumSupervisor = 0;
  let sumIreb = 0;
  for (const r of rows) {
    if (!r.supervisor_decision_at || !r.ireb_decision_at) continue;
    sumSupervisor += daysBetween(r.submitted_at, r.supervisor_decision_at);
    sumIreb += daysBetween(r.supervisor_decision_at, r.ireb_decision_at);
  }
  const total = sumSupervisor + sumIreb;
  if (total <= 0) return null;
  return { supervisor: (sumSupervisor / total) * 100, ireb: (sumIreb / total) * 100 };
}

function efficiencyMetricsTable(rows: AggregateSubmissionInput[]): string {
  const n = rows.length;
  const approved = rows.filter((r) => r.current_status === "approved").length;
  const rejected =
    rows.filter((r) => r.current_status === "rejected" || r.current_status === "supervisor_rejected")
      .length;
  const resubmittedApprovals = rows.filter(
    (r) => r.current_status === "approved" && r.applicant_attempt_number > 1,
  ).length;
  const attemptNums = rows.map((r) => r.applicant_attempt_number).filter((x) => typeof x === "number" && x > 0);
  const avgAttempts = mean(attemptNums);
  const dd = collectSupervisorDecisionDays(rows);
  const irebPhase = collectIrebPhaseDays(rows);
  const terminalCycle = collectTerminalCycleDays(rows);
  const approvedWithIrebEnd = rows.filter((r) => r.current_status === "approved" && r.ireb_decision_at);
  const approvedWithin3 = approvedWithIrebEnd.filter(
    (r) => daysBetween(r.submitted_at, r.ireb_decision_at!) <= 3,
  ).length;
  const delayedOver3 = rows.filter((r) => {
    const terminal =
      r.current_status === "approved" ||
      r.current_status === "rejected" ||
      r.current_status === "supervisor_rejected";
    if (!terminal) return false;
    const end = r.ireb_decision_at ?? r.supervisor_decision_at;
    if (!end) return false;
    return daysBetween(r.submitted_at, end) > 3;
  }).length;
  const share = supervisorIrebDelaySharePct(rows);
  const avgProcDays = mean(terminalCycle);
  const avgSupervisorDays = mean(dd);
  const avgIrebPhaseDays = mean(irebPhase);
  const rowsHtml: [string, string][] = [
    ["Total submissions", String(n)],
    ["Approval rate", n ? `${((approved / n) * 100).toFixed(1)}%` : "—"],
    ["Resubmitted approvals", String(resubmittedApprovals)],
    ["Total rejection rate", n ? fmtPct((rejected / n) * 100) : "—"],
    ["Avg. number of attempts", avgAttempts != null ? (Math.round(avgAttempts * 100) / 100).toFixed(2) : "—"],
    ["Avg. processing time", avgProcDays != null ? `${fmtDays(avgProcDays)} days` : "—"],
    ["Cases approved within 3 days", String(approvedWithin3)],
    ["Number of delayed cases (more than 3 days)", String(delayedOver3)],
    ["Avg. delay caused by Supervisor", avgSupervisorDays != null ? `${fmtDays(avgSupervisorDays)} days` : "—"],
    ["Avg. delay caused by IREB", avgIrebPhaseDays != null ? `${fmtDays(avgIrebPhaseDays)} days` : "—"],
    ["Delay by Faculty (Supervisor)", share ? fmtPct(share.supervisor) : "—"],
    ["Delay by IREB member", share ? fmtPct(share.ireb) : "—"],
  ];
  const body = rowsHtml
    .map(([a, b]) => `<tr><th>${escapeHtml(a)}</th><td>${escapeHtml(b)}</td></tr>`)
    .join("");
  return `<div class="sec-title">Efficiency summary</div><table class="pdf-grid"><tbody>${body}</tbody></table>`;
}

function topFaculties(rows: AggregateSubmissionInput[], limit?: number): string {
  const m = new Map<string, number>();
  for (const r of rows) {
    const f = r.faculty.trim() || "—";
    m.set(f, (m.get(f) ?? 0) + 1);
  }
  const sorted = Array.from(m.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const slice = limit != null ? sorted.slice(0, limit) : sorted;
  if (slice.length === 0) {
    return `<div class="sec-title">Faculties by submission count</div><p>No data.</p>`;
  }
  const head = `<thead><tr><th>Faculty (snapshot)</th><th>Count</th></tr></thead>`;
  const body = slice
    .map(
      ([name, c]) =>
        `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(String(c))}</td></tr>`,
    )
    .join("");
  return `<div class="sec-title">Faculties by submission count</div><table class="pdf-data">${head}<tbody>${body}</tbody></table>`;
}

function ethicsForm(ethics: unknown): Record<string, unknown> {
  if (!ethics || typeof ethics !== "object") return {};
  const e = ethics as { form?: unknown };
  if (e.form && typeof e.form === "object" && !Array.isArray(e.form)) {
    return e.form as Record<string, unknown>;
  }
  return {};
}

function ethicsField(form: Record<string, unknown>, key: string): string {
  const v = form[key];
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x.trim() : typeof x === "number" ? String(x) : ""))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof v === "object" && v && "label" in (v as object)) {
    const l = (v as { label?: unknown }).label;
    return typeof l === "string" ? l : "";
  }
  return "";
}

function mostCommonInsightText(values: string[]): string | null {
  const buckets = new Map<string, { count: number; display: string }>();
  for (const raw of values) {
    const display = raw.replace(/\s+/g, " ").trim();
    if (!display) continue;
    const key = display.toLowerCase();
    const cur = buckets.get(key);
    if (cur) cur.count += 1;
    else buckets.set(key, { count: 1, display });
  }
  if (buckets.size === 0) return null;
  let best: { count: number; display: string } | null = null;
  for (const v of buckets.values()) {
    if (!best || v.count > best.count || (v.count === best.count && v.display.localeCompare(best.display) < 0)) {
      best = v;
    }
  }
  return best?.display ?? null;
}

function researchPurposeLine(r: AggregateSubmissionInput): string {
  const form = ethicsForm(r.ethics_json);
  return (ethicsField(form, "researchPurpose") || (r.objectives ?? "").trim()).trim();
}

function researchMethodLine(r: AggregateSubmissionInput): string {
  const form = ethicsForm(r.ethics_json);
  return (ethicsField(form, "methodology") || (r.methodology ?? "").trim()).trim();
}

function topSdgsSummary(rows: AggregateSubmissionInput[], limit: number): string {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const raw = ethicsField(ethicsForm(r.ethics_json), "sdgs");
    for (const part of raw.split(",")) {
      const p = part.trim();
      if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
    }
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top = sorted.slice(0, limit);
  if (top.length === 0) return "—";
  return top.map(([label, c]) => `${label} (${c})`).join("; ");
}

type FacultyInsightAgg = { total: number; approved: number; rejected: number };

function facultyAggregates(rows: AggregateSubmissionInput[]): Map<string, FacultyInsightAgg> {
  const m = new Map<string, FacultyInsightAgg>();
  for (const r of rows) {
    const fac = r.faculty.trim() || "—";
    const cur = m.get(fac) ?? { total: 0, approved: 0, rejected: 0 };
    cur.total += 1;
    if (r.current_status === "approved") cur.approved += 1;
    if (r.current_status === "rejected" || r.current_status === "supervisor_rejected") cur.rejected += 1;
    m.set(fac, cur);
  }
  return m;
}

function extremalFacultyByMetric(
  byFac: Map<string, FacultyInsightAgg>,
  totalN: number,
  mode: "volumeShare" | "approvedRate" | "rejectedRate",
  pick: "max" | "min",
): { names: string; pct: number } | null {
  if (byFac.size === 0 || totalN === 0) return null;
  let bestPct = pick === "max" ? -Infinity : Infinity;
  const namesAt: string[] = [];
  for (const [fac, agg] of byFac) {
    let pct = 0;
    if (mode === "volumeShare") pct = (agg.total / totalN) * 100;
    else if (mode === "approvedRate") pct = agg.total > 0 ? (agg.approved / agg.total) * 100 : 0;
    else pct = agg.total > 0 ? (agg.rejected / agg.total) * 100 : 0;

    if (pick === "max") {
      if (pct > bestPct + 1e-9) {
        bestPct = pct;
        namesAt.length = 0;
        namesAt.push(fac);
      } else if (Math.abs(pct - bestPct) < 1e-9) {
        namesAt.push(fac);
      }
    } else {
      if (pct < bestPct - 1e-9) {
        bestPct = pct;
        namesAt.length = 0;
        namesAt.push(fac);
      } else if (Math.abs(pct - bestPct) < 1e-9) {
        namesAt.push(fac);
      }
    }
  }
  namesAt.sort((a, b) => a.localeCompare(b));
  return { names: namesAt.join(", "), pct: bestPct };
}

function truncateForCell(s: string, maxLen: number): string {
  const t = s.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

/** Row titles follow the admin research-insights checklist wording. */
function researchInsightsSummaryTable(rows: AggregateSubmissionInput[]): string {
  const n = rows.length;
  const emptyTitles: [string, string][] = [
    ["Common research purpose", "—"],
    ["Common research method", "—"],
    ["Top 5 SDGs", "—"],
    ["% of thesis / project requests", "—"],
    ["% of publication requests", "—"],
    ["Highest % of research requests by faculty", "—"],
    ["Lowest % of research requests by faculty", "—"],
    ["Highest approved % of requests by faculty", "—"],
    ["Highest rejected % of requests by faculty", "—"],
  ];
  if (n === 0) {
    const body = emptyTitles
      .map(([a, b]) => `<tr><th>${escapeHtml(a)}</th><td>${escapeHtml(b)}</td></tr>`)
      .join("");
    return `<div class="sec-title">Research insights (aggregate)</div><table class="pdf-grid"><tbody>${body}</tbody></table>`;
  }
  const commonPurpose = mostCommonInsightText(rows.map(researchPurposeLine));
  const commonMethod = mostCommonInsightText(rows.map(researchMethodLine));
  const thesisN = rows.filter((r) => r.type === "thesis").length;
  const pubN = rows.filter((r) => r.type === "publication").length;
  const byFac = facultyAggregates(rows);
  const hiVol = extremalFacultyByMetric(byFac, n, "volumeShare", "max");
  const loVol = extremalFacultyByMetric(byFac, n, "volumeShare", "min");
  const hiAppr = extremalFacultyByMetric(byFac, n, "approvedRate", "max");
  const hiRej = extremalFacultyByMetric(byFac, n, "rejectedRate", "max");
  const fmtFac = (x: { names: string; pct: number } | null) =>
    x && x.names ? `${x.names} (${fmtPct(x.pct)})` : "—";
  const rowsHtml: [string, string][] = [
    [
      "Common research purpose",
      commonPurpose ? truncateForCell(commonPurpose, 700) : "—",
    ],
    ["Common research method", commonMethod ? truncateForCell(commonMethod, 700) : "—"],
    ["Top 5 SDGs", topSdgsSummary(rows, 5)],
    ["% of thesis / project requests", fmtPct((thesisN / n) * 100)],
    ["% of publication requests", fmtPct((pubN / n) * 100)],
    ["Highest % of research requests by faculty", fmtFac(hiVol)],
    ["Lowest % of research requests by faculty", fmtFac(loVol)],
    ["Highest approved % of requests by faculty", fmtFac(hiAppr)],
    ["Highest rejected % of requests by faculty", fmtFac(hiRej)],
  ];
  const body = rowsHtml
    .map(([a, b]) => `<tr><th>${escapeHtml(a)}</th><td>${escapeHtml(b)}</td></tr>`)
    .join("");
  return `<div class="sec-title">Research insights (aggregate)</div><table class="pdf-grid"><tbody>${body}</tbody></table>`;
}

function researchCrossTab(rows: AggregateSubmissionInput[]): string {
  const domains: AggregateSubmissionInput["domain"][] = ["medical", "non_medical"];
  const types: AggregateSubmissionInput["type"][] = ["thesis", "publication"];
  const head = `<thead><tr><th>Type / Domain</th>${domains
    .map((d) => `<th>${escapeHtml(d === "medical" ? "Medical" : "Non-medical")}</th>`)
    .join("")}<th>Total</th></tr></thead>`;
  const body = types
    .map((t) => {
      let lineTotal = 0;
      const cells = domains.map((d) => {
        const c = rows.filter((r) => r.type === t && r.domain === d).length;
        lineTotal += c;
        return `<td>${c}</td>`;
      });
      const label = t === "thesis" ? "Thesis" : "Publication";
      return `<tr><th>${escapeHtml(label)}</th>${cells.join("")}<td><strong>${lineTotal}</strong></td></tr>`;
    })
    .join("");
  return `<div class="sec-title">Research mix (type × domain)</div><table class="pdf-data">${head}<tbody>${body}</tbody></table>`;
}

export function buildTotalEfficiencyReportHtml(
  rows: AggregateSubmissionInput[],
  ctx: AggregateReportContext,
): string {
  const inner = `
  ${coverBlock(ctx)}
  ${buildTotalEfficiencyChartsHtml(rows)}
  ${efficiencyMetricsTable(rows)}
  ${topFaculties(rows)}
  <p class="footer-note">Total efficiency view for the selected period and scope.</p>`;
  return wrapDocument(`${ctx.reportTitle} — ${ctx.periodLabel}`, inner);
}

export function buildOverallResearchSpecificReportHtml(
  rows: AggregateSubmissionInput[],
  ctx: AggregateReportContext,
): string {
  const inner = `
  ${coverBlock(ctx)}
  ${buildOverallResearchSpecificChartsHtml(rows)}
  ${researchCrossTab(rows)}
  ${researchInsightsSummaryTable(rows)}
  ${topFaculties(rows)}
  <p class="footer-note">Research-specific overview: thesis vs publication and medical vs non-medical domain.</p>`;
  return wrapDocument(`${ctx.reportTitle} — ${ctx.periodLabel}`, inner);
}
