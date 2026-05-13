/**
 * Printable aggregate HTML reports for the admin /reports catalog.
 * Styling matches admin-leads-reports-html (print + toolbar).
 */

export type AggregateReportContext = {
  reportTitle: string;
  generatedAt: Date;
  periodLabel: string;
  scopeDescription: string;
  subjectLine?: string;
};

export type AggregateSubmissionInput = {
  application_id: string;
  type: "thesis" | "publication";
  domain: "medical" | "non_medical";
  applicant_role: "student" | "faculty";
  current_status:
    | "submitted"
    | "under_dean_review"
    | "dean_approved"
    | "dean_rejected"
    | "under_ireb_review"
    | "approved"
    | "rejected";
  submitted_at: Date;
  faculty: string;
  dean_decision_at: Date | null;
  ireb_decision_at: Date | null;
};

function escapeHtml(s: string): string {
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

function statusLabel(cs: AggregateSubmissionInput["current_status"]): string {
  switch (cs) {
    case "submitted":
      return "Submitted";
    case "under_dean_review":
      return "Pending at Dean";
    case "dean_approved":
      return "Approved by Dean";
    case "dean_rejected":
      return "Rejected by Dean";
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

function wrapDocument(title: string, inner: string): string {
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

function coverBlock(ctx: AggregateReportContext): string {
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

function countsByStatus(rows: AggregateSubmissionInput[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = statusLabel(r.current_status);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function tableFromMap(title: string, map: Map<string, number>): string {
  const rows = Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const body =
    rows.length === 0
      ? `<tr><td colspan="2">No applications in this scope.</td></tr>`
      : rows
          .map(
            ([k, v]) =>
              `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(String(v))}</td></tr>`,
          )
          .join("");
  return `<div class="sec-title">${escapeHtml(title)}</div><table class="pdf-grid"><tbody>${body}</tbody></table>`;
}

function collectDeanDecisionDays(rows: AggregateSubmissionInput[]): number[] {
  const out: number[] = [];
  for (const r of rows) {
    if (!r.dean_decision_at) continue;
    out.push(daysBetween(r.submitted_at, r.dean_decision_at));
  }
  return out;
}

function collectIrebDecisionDays(rows: AggregateSubmissionInput[]): number[] {
  const out: number[] = [];
  for (const r of rows) {
    if (!r.ireb_decision_at) continue;
    out.push(daysBetween(r.submitted_at, r.ireb_decision_at));
  }
  return out;
}

function collectTotalCycleDays(rows: AggregateSubmissionInput[]): number[] {
  const out: number[] = [];
  for (const r of rows) {
    if (r.current_status !== "approved" && r.current_status !== "rejected") continue;
    const end = r.ireb_decision_at ?? r.dean_decision_at;
    if (!end) continue;
    out.push(daysBetween(r.submitted_at, end));
  }
  return out;
}

function efficiencyMetricsTable(rows: AggregateSubmissionInput[]): string {
  const n = rows.length;
  const approved = rows.filter((r) => r.current_status === "approved").length;
  const rejected =
    rows.filter((r) => r.current_status === "rejected" || r.current_status === "dean_rejected")
      .length;
  const pending = n - approved - rejected;
  const dd = collectDeanDecisionDays(rows);
  const id = collectIrebDecisionDays(rows);
  const cy = collectTotalCycleDays(rows);
  const rowsHtml: [string, string][] = [
    ["Applications in period", String(n)],
    ["Approved (IREB)", String(approved)],
    ["Rejected (Dean or IREB)", String(rejected)],
    ["In progress", String(Math.max(0, pending))],
    ["Approval rate", n ? `${((approved / n) * 100).toFixed(1)}%` : "—"],
    ["Mean days to dean decision (where recorded)", fmtDays(mean(dd))],
    ["Median days to dean decision (where recorded)", fmtDays(median(dd))],
    ["Mean days to IREB decision (where recorded)", fmtDays(mean(id))],
    ["Median days to IREB decision (where recorded)", fmtDays(median(id))],
    [
      "Mean total cycle (submitted → terminal, where dated)",
      fmtDays(mean(cy)),
    ],
    ["Median total cycle (submitted → terminal, where dated)", fmtDays(median(cy))],
  ];
  const body = rowsHtml
    .map(([a, b]) => `<tr><th>${escapeHtml(a)}</th><td>${escapeHtml(b)}</td></tr>`)
    .join("");
  return `<div class="sec-title">Efficiency summary</div><table class="pdf-grid"><tbody>${body}</tbody></table>`;
}

function topFaculties(rows: AggregateSubmissionInput[], limit: number): string {
  const m = new Map<string, number>();
  for (const r of rows) {
    const f = r.faculty.trim() || "—";
    m.set(f, (m.get(f) ?? 0) + 1);
  }
  const sorted = Array.from(m.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const slice = sorted.slice(0, limit);
  if (slice.length === 0) {
    return `<div class="sec-title">Top faculties</div><p>No data.</p>`;
  }
  const head = `<thead><tr><th>Faculty (snapshot)</th><th>Count</th></tr></thead>`;
  const body = slice
    .map(
      ([name, c]) =>
        `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(String(c))}</td></tr>`,
    )
    .join("");
  return `<div class="sec-title">Top faculties by volume</div><table class="pdf-data">${head}<tbody>${body}</tbody></table>`;
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

export function buildDeansReportHtml(
  rows: AggregateSubmissionInput[],
  ctx: AggregateReportContext,
): string {
  const inner = `
  ${coverBlock(ctx)}
  ${tableFromMap("Applications by current status", countsByStatus(rows))}
  ${efficiencyMetricsTable(rows)}
  ${topFaculties(rows, 12)}
  <p class="footer-note">Dean&rsquo;s report summarizes ethical applications visible under the selected dean scope. Metrics use approval timestamps where recorded; otherwise values show &ldquo;—&rdquo;.</p>`;
  return wrapDocument(`${ctx.reportTitle} — ${ctx.periodLabel}`, inner);
}

export function buildTotalEfficiencyReportHtml(
  rows: AggregateSubmissionInput[],
  ctx: AggregateReportContext,
): string {
  const inner = `
  ${coverBlock(ctx)}
  ${efficiencyMetricsTable(rows)}
  ${tableFromMap("Status distribution", countsByStatus(rows))}
  ${topFaculties(rows, 10)}
  <p class="footer-note">Total efficiency view for the selected period and scope.</p>`;
  return wrapDocument(`${ctx.reportTitle} — ${ctx.periodLabel}`, inner);
}

export function buildOverallResearchSpecificReportHtml(
  rows: AggregateSubmissionInput[],
  ctx: AggregateReportContext,
): string {
  const inner = `
  ${coverBlock(ctx)}
  ${researchCrossTab(rows)}
  ${tableFromMap("Status distribution", countsByStatus(rows))}
  ${topFaculties(rows, 10)}
  <p class="footer-note">Research-specific overview: thesis vs publication and medical vs non-medical domain.</p>`;
  return wrapDocument(`${ctx.reportTitle} — ${ctx.periodLabel}`, inner);
}

export function buildOverallStudentReportHtml(
  rows: AggregateSubmissionInput[],
  ctx: AggregateReportContext,
): string {
  const inner = `
  ${coverBlock(ctx)}
  ${efficiencyMetricsTable(rows)}
  ${tableFromMap("Status distribution (student applicants)", countsByStatus(rows))}
  ${researchCrossTab(rows)}
  <p class="footer-note">Filtered to submissions with applicant role &ldquo;student&rdquo; only.</p>`;
  return wrapDocument(`${ctx.reportTitle} — ${ctx.periodLabel}`, inner);
}

export function buildOverallFacultyReportHtml(
  rows: AggregateSubmissionInput[],
  ctx: AggregateReportContext,
): string {
  const inner = `
  ${coverBlock(ctx)}
  ${efficiencyMetricsTable(rows)}
  ${tableFromMap("Status distribution (faculty applicants)", countsByStatus(rows))}
  ${researchCrossTab(rows)}
  <p class="footer-note">Filtered to submissions with applicant role &ldquo;faculty&rdquo; only.</p>`;
  return wrapDocument(`${ctx.reportTitle} — ${ctx.periodLabel}`, inner);
}
