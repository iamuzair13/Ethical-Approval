/**
 * Print/PDF-safe visual summaries for admin HTML reports (server-rendered SVG + simple HTML bars).
 *
 * Uses only `import type` from admin-aggregate-reports-html so aggregate can import this module
 * without a circular runtime dependency.
 */

import type { AggregateSubmissionInput } from "@/lib/admin-aggregate-reports-html";
import {
  submissionStatusCountsByLabel,
} from "@/lib/admin-submission-status";
import { isStudentApplicantEmail } from "@/lib/applicant-email";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Mirrors student report program-tier logic (keep aligned with admin-student-overall-report-html). */
type StudentProgramTier = "phd" | "mphil" | "undergrad" | "other";

function programTierForStudentCharts(program: string | null): StudentProgramTier {
  if (!program) return "other";
  const p = program.trim().toLowerCase();
  if (
    p.includes("phd") ||
    p.includes("ph.d") ||
    p.includes("doctor of philosophy") ||
    p.includes("dphil")
  ) {
    return "phd";
  }
  if (p.includes("mphil") || p.includes("m.phil") || p.includes("master of philosophy")) {
    return "mphil";
  }
  if (
    p.includes("undergraduate") ||
    p.includes("under graduate") ||
    p.includes("bachelor") ||
    /\bb\.?s\.?\b/.test(p) ||
    /\bb\.?a\.?\b/.test(p) ||
    /\bbsc\b/.test(p) ||
    /\bbs\b/.test(p) ||
    p.includes("bba") ||
    p.includes("bcom") ||
    p.includes("ugrad")
  ) {
    return "undergrad";
  }
  return "other";
}

/** Mirrors faculty overall PhD detection (keep aligned with admin-faculty-overall-report-html). */
function isPhdProgramForFacultyCharts(program: string | null): boolean {
  if (!program) return false;
  const p = program.trim().toLowerCase();
  return p.includes("phd") || p.includes("ph.d") || p.includes("doctor of philosophy");
}

const CHART_COLORS = ["#5750f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b", "#0ea5e9"];

function reportChartsShell(figuresHtml: string, submissionCount?: number): string {
  const scopeNote =
    submissionCount != null
      ? `<p class="chart-scope-note">${submissionCount} application${submissionCount === 1 ? "" : "s"} in scope — charts include all of them.</p>`
      : "";
  return `
  <div class="report-charts">
    <div class="sec-title">Visual summary</div>
    ${scopeNote}
    <div class="chart-grid">
      ${figuresHtml}
    </div>
  </div>`;
}

function emptyChartsMessage(): string {
  return `<p class="chart-empty">No data in scope for charts.</p>`;
}

function figureWrap(inner: string): string {
  return `<div class="chart-figure">${inner}</div>`;
}

function figCaption(text: string): string {
  return `<div class="chart-caption">${esc(text)}</div>`;
}

/** Stacked horizontal bar: segment widths by value (sum > 0). */
function stackedShareBar(caption: string, segments: { label: string; value: number; color: string }[]): string {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total <= 0) {
    return figureWrap(`${figCaption(caption)}${emptyChartsMessage()}`);
  }
  const parts = segments
    .map((seg) => {
      const pct = (seg.value / total) * 100;
      const w = Math.max(pct < 0.05 && seg.value > 0 ? 0.8 : pct, 0);
      return `<div class="stack-seg" style="width:${w}%;background:${seg.color}" title="${esc(seg.label)}: ${seg.value}"></div>`;
    })
    .join("");
  const legend = segments
    .map(
      (seg) =>
        `<span class="chart-legend-item"><span class="swatch" style="background:${seg.color}"></span>${esc(seg.label)} (${seg.value})</span>`,
    )
    .join(" ");
  return figureWrap(
    `${figCaption(caption)}<div class="stacked-bar-track">${parts}</div><div class="chart-legend">${legend}</div>`,
  );
}

function svgHorizontalBars(
  caption: string,
  entries: { label: string; value: number; color?: string }[],
  totalApplications?: number,
): string {
  if (entries.length === 0) {
    return figureWrap(`${figCaption(caption)}${emptyChartsMessage()}`);
  }
  const counted = entries.reduce((sum, e) => sum + e.value, 0);
  const total = totalApplications ?? counted;
  const fullCaption =
    total > 0
      ? `${caption} (${total} application${total === 1 ? "" : "s"})`
      : caption;
  const w = 400;
  const rowH = 22;
  const labelW = 150;
  const barX = labelW + 6;
  const barW = w - barX - 36;
  const maxV = Math.max(1, ...entries.map((e) => e.value));
  const topPad = 8;
  const h = topPad + entries.length * rowH + 8;
  let ci = 0;
  const rows = entries
    .map((e, idx) => {
      const y = topPad + idx * rowH;
      const bw = e.value > 0 ? Math.max(2, (e.value / maxV) * barW) : 0;
      const color = e.color ?? CHART_COLORS[ci++ % CHART_COLORS.length];
      const labelShort = e.label.length > 38 ? `${esc(e.label.slice(0, 37))}…` : esc(e.label);
      return `<text x="2" y="${y + 14}" font-size="10" font-family="ui-sans-serif,system-ui,sans-serif" fill="#374151">${labelShort}</text>
      <rect x="${barX}" y="${y + 3}" width="${barW}" height="${rowH - 6}" fill="#f3f4f6" stroke="#e5e7eb" stroke-width="1"/>
      <rect x="${barX}" y="${y + 3}" width="${bw}" height="${rowH - 6}" fill="${color}"/>
      <text x="${barX + barW + 4}" y="${y + 14}" font-size="10" font-family="ui-sans-serif,system-ui,sans-serif" fill="#374151">${e.value}</text>`;
    })
    .join("");
  const svg = `<svg class="chart-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(fullCaption)}">${rows}</svg>`;
  return figureWrap(`${figCaption(fullCaption)}${svg}`);
}

function svgVerticalGroup(
  caption: string,
  groups: { label: string; value: number; color: string }[],
  opts: { barW: number; gap: number; chartH: number },
): string {
  if (groups.length === 0) {
    return figureWrap(`${figCaption(caption)}${emptyChartsMessage()}`);
  }
  const maxV = Math.max(1, ...groups.map((g) => g.value));
  const { barW, gap, chartH } = opts;
  const n = groups.length;
  const w = 24 + n * (barW + gap);
  const baseY = 16 + chartH;
  const bars = groups
    .map((g, i) => {
      const x = 20 + i * (barW + gap);
      const h = (g.value / maxV) * chartH;
      const y = baseY - h;
      return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${g.color}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="${x + barW / 2}" y="${baseY + 14}" font-size="9" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" fill="#374151">${g.value}</text>
      <text x="${x + barW / 2}" y="${baseY + 28}" font-size="8" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" fill="#6b7280">${esc(g.label)}</text>`;
    })
    .join("");
  const svgH = baseY + 36;
  const svg = `<svg class="chart-svg" width="${w}" height="${svgH}" viewBox="0 0 ${w} ${svgH}" xmlns="http://www.w3.org/2000/svg" role="img">${bars}</svg>`;
  return figureWrap(`${figCaption(caption)}${svg}`);
}

export function buildSupervisorReportChartsHtml(metrics: {
  rows: AggregateSubmissionInput[];
  institutionTotalSubmissions: number;
}): string {
  const { rows, institutionTotalSubmissions } = metrics;
  if (rows.length === 0 && institutionTotalSubmissions === 0) {
    return reportChartsShell(figureWrap(`${figCaption("Supervisor scope")}${emptyChartsMessage()}`), 0);
  }

  const passedSupervisor = rows.filter((r) =>
    isStudentApplicantEmail(r.applicant_email) &&
    ["supervisor_approved", "under_ireb_review", "approved", "rejected"].includes(r.current_status),
  ).length;
  const supervisorRejected = rows.filter((r) => r.current_status === "supervisor_rejected").length;

  const fig1 =
    rows.length > 0
      ? stackedShareBar("Approved vs Rejected (scoped submissions)", [
          { label: "Approved", value: passedSupervisor, color: CHART_COLORS[0]! },
          { label: "Rejected", value: supervisorRejected, color: CHART_COLORS[4]! },
        ])
      : figureWrap(`${figCaption("Approved vs Rejected")}${emptyChartsMessage()}`);

  const inst = institutionTotalSubmissions;
  const scoped = rows.length;
  const rest = Math.max(0, inst - scoped);
  const fig2 =
    inst > 0
      ? stackedShareBar("Institution submissions: this supervisor’s scope vs other", [
          { label: "This supervisor’s scope", value: scoped, color: CHART_COLORS[0]! },
          { label: "Rest of institution", value: rest, color: CHART_COLORS[6]! },
        ])
      : figureWrap(`${figCaption("Institution submissions in range")}<p class="chart-empty">Institution total not available for chart.</p>`);

  return reportChartsShell(`${fig1}${fig2}`, rows.length);
}

export function buildTotalEfficiencyChartsHtml(rows: AggregateSubmissionInput[]): string {
  if (rows.length === 0) {
    return reportChartsShell(figureWrap(`${figCaption("Throughput")}${emptyChartsMessage()}`), 0);
  }

  const statusMap = submissionStatusCountsByLabel(rows);
  const statusEntries = Array.from(statusMap.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));

  const approved = rows.filter((r) => r.current_status === "approved").length;
  const rejected = rows.filter((r) => r.current_status === "rejected" || r.current_status === "supervisor_rejected").length;
  const pending = rows.length - approved - rejected;

  const fig1 = svgHorizontalBars("Submissions by status", statusEntries, rows.length);
  const fig2 = stackedShareBar("Outcome-style split (approved vs rejected vs still pending)", [
    { label: "Approved (IREB)", value: approved, color: CHART_COLORS[2]! },
    { label: "Rejected (IREB or supervisor)", value: rejected, color: CHART_COLORS[4]! },
    { label: "Pending / in progress", value: Math.max(0, pending), color: CHART_COLORS[6]! },
  ]);

  const byFac = new Map<string, number>();
  for (const r of rows) {
    const f = r.faculty.trim() || "—";
    byFac.set(f, (byFac.get(f) ?? 0) + 1);
  }
  const topFac = Array.from(byFac.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));

  const fig3 = svgHorizontalBars("Faculties by submission count", topFac, rows.length);

  return reportChartsShell(`${fig1}${fig3}${fig2}`, rows.length);
}

export function buildOverallResearchSpecificChartsHtml(rows: AggregateSubmissionInput[]): string {
  if (rows.length === 0) {
    return reportChartsShell(figureWrap(`${figCaption("Research mix")}${emptyChartsMessage()}`), 0);
  }

  const thesis = rows.filter((r) => r.type === "thesis").length;
  const pub = rows.filter((r) => r.type === "publication").length;
  const med = rows.filter((r) => r.domain === "medical").length;
  const nonMed = rows.filter((r) => r.domain === "non_medical").length;

  const fig1 = stackedShareBar("Thesis vs publication", [
    { label: "Thesis / project", value: thesis, color: CHART_COLORS[0]! },
    { label: "Publication", value: pub, color: CHART_COLORS[1]! },
  ]);
  const fig2 = stackedShareBar("Medical vs non-medical domain", [
    { label: "Medical", value: med, color: CHART_COLORS[2]! },
    { label: "Non-medical", value: nonMed, color: CHART_COLORS[3]! },
  ]);

  const tMed = rows.filter((r) => r.type === "thesis" && r.domain === "medical").length;
  const tNon = rows.filter((r) => r.type === "thesis" && r.domain === "non_medical").length;
  const pMed = rows.filter((r) => r.type === "publication" && r.domain === "medical").length;
  const pNon = rows.filter((r) => r.type === "publication" && r.domain === "non_medical").length;

  const fig3 = svgVerticalGroup(
    "Type × domain counts",
    [
      { label: "Thesis (med.)", value: tMed, color: CHART_COLORS[0]! },
      { label: "Thesis (other)", value: tNon, color: CHART_COLORS[5]! },
      { label: "Pub. (med.)", value: pMed, color: CHART_COLORS[1]! },
      { label: "Pub. (other)", value: pNon, color: CHART_COLORS[7]! },
    ],
    { barW: 36, gap: 16, chartH: 100 },
  );

  return reportChartsShell(`${fig1}${fig2}${fig3}`, rows.length);
}

export function buildOverallStudentChartsHtml(studentRows: AggregateSubmissionInput[]): string {
  if (studentRows.length === 0) {
    return reportChartsShell(figureWrap(`${figCaption("Student cohort")}${emptyChartsMessage()}`), 0);
  }

  let u = 0;
  let m = 0;
  let ph = 0;
  let o = 0;
  for (const r of studentRows) {
    const t = programTierForStudentCharts(r.applicant_program);
    if (t === "undergrad") u += 1;
    else if (t === "mphil") m += 1;
    else if (t === "phd") ph += 1;
    else o += 1;
  }

  const fig1 = stackedShareBar("Program tier (inferred from program field)", [
    { label: "Undergraduate", value: u, color: CHART_COLORS[0]! },
    { label: "MPhil", value: m, color: CHART_COLORS[1]! },
    { label: "PhD", value: ph, color: CHART_COLORS[2]! },
    { label: "Other / unmatched", value: o, color: CHART_COLORS[6]! },
  ]);

  const thesisN = studentRows.filter((r) => r.type === "thesis").length;
  const pubN = studentRows.filter((r) => r.type === "publication").length;
  const fig2 = stackedShareBar("Thesis vs publication", [
    { label: "Thesis / project", value: thesisN, color: CHART_COLORS[0]! },
    { label: "Publication", value: pubN, color: CHART_COLORS[1]! },
  ]);

  const medicalN = studentRows.filter((r) => r.domain === "medical").length;
  const otherN = studentRows.filter((r) => r.domain === "non_medical").length;
  const fig3 = stackedShareBar("Medical vs other faculties (domain)", [
    { label: "Medical", value: medicalN, color: CHART_COLORS[2]! },
    { label: "All other", value: otherN, color: CHART_COLORS[3]! },
  ]);

  const approved = studentRows.filter((r) => r.current_status === "approved").length;
  const rejected = studentRows.filter(
    (r) => r.current_status === "rejected" || r.current_status === "supervisor_rejected",
  ).length;
  const pend = studentRows.length - approved - rejected;
  const fig4 = stackedShareBar("Approved vs rejected vs pending", [
    { label: "Approved", value: approved, color: CHART_COLORS[2]! },
    { label: "Rejected", value: rejected, color: CHART_COLORS[4]! },
    { label: "Pending", value: Math.max(0, pend), color: CHART_COLORS[6]! },
  ]);

  return reportChartsShell(`${fig1}${fig2}${fig3}${fig4}`, studentRows.length);
}

export function buildOverallFacultyChartsHtml(facultyRows: AggregateSubmissionInput[]): string {
  if (facultyRows.length === 0) {
    return reportChartsShell(figureWrap(`${figCaption("Faculty / staff publications")}${emptyChartsMessage()}`), 0);
  }

  const n = facultyRows.length;
  const phdN = facultyRows.filter((r) => isPhdProgramForFacultyCharts(r.applicant_program)).length;
  const nonPhd = n - phdN;
  const fig1 = stackedShareBar("PhD vs non-PhD (program snapshot)", [
    { label: "PhD-related program", value: phdN, color: CHART_COLORS[0]! },
    { label: "Other", value: nonPhd, color: CHART_COLORS[6]! },
  ]);

  const medicalN = facultyRows.filter((r) => r.domain === "medical").length;
  const otherN = facultyRows.filter((r) => r.domain === "non_medical").length;
  const fig2 = stackedShareBar("Medical vs other faculties (domain)", [
    { label: "Medical", value: medicalN, color: CHART_COLORS[2]! },
    { label: "All other", value: otherN, color: CHART_COLORS[3]! },
  ]);

  const approved = facultyRows.filter((r) => r.current_status === "approved").length;
  const rejected = facultyRows.filter(
    (r) => r.current_status === "rejected" || r.current_status === "supervisor_rejected",
  ).length;
  const pend = n - approved - rejected;
  const fig3 = stackedShareBar("Approved vs rejected vs pending", [
    { label: "Approved", value: approved, color: CHART_COLORS[2]! },
    { label: "Rejected", value: rejected, color: CHART_COLORS[4]! },
    { label: "Pending", value: Math.max(0, pend), color: CHART_COLORS[6]! },
  ]);

  return reportChartsShell(`${fig1}${fig2}${fig3}`, facultyRows.length);
}

function facultyDeptOutcomeCharts(rows: AggregateSubmissionInput[]): string {
  const thesis = rows.filter((r) => r.type === "thesis").length;
  const pub = rows.filter((r) => r.type === "publication").length;
  const approved = rows.filter((r) => r.current_status === "approved").length;
  const rejected = rows.filter((r) => r.current_status === "rejected" || r.current_status === "supervisor_rejected").length;
  const pending = rows.filter(
    (r) => r.current_status !== "approved" && r.current_status !== "rejected" && r.current_status !== "supervisor_rejected",
  ).length;

  const fig1 = stackedShareBar("Thesis vs publication", [
    { label: "Thesis / project", value: thesis, color: CHART_COLORS[0]! },
    { label: "Publication", value: pub, color: CHART_COLORS[1]! },
  ]);
  const fig2 = stackedShareBar("Approved vs rejected vs pending", [
    { label: "Approved", value: approved, color: CHART_COLORS[2]! },
    { label: "Rejected", value: rejected, color: CHART_COLORS[4]! },
    { label: "Pending", value: pending, color: CHART_COLORS[6]! },
  ]);
  return `${fig1}${fig2}`;
}

export function buildFacultyWiseResearchChartsHtml(rows: AggregateSubmissionInput[]): string {
  if (rows.length === 0) {
    return reportChartsShell(figureWrap(`${figCaption("Faculty research")}${emptyChartsMessage()}`), 0);
  }
  return reportChartsShell(facultyDeptOutcomeCharts(rows), rows.length);
}

export function buildDepartmentWiseResearchChartsHtml(rows: AggregateSubmissionInput[]): string {
  if (rows.length === 0) {
    return reportChartsShell(figureWrap(`${figCaption("Department research")}${emptyChartsMessage()}`), 0);
  }
  return reportChartsShell(facultyDeptOutcomeCharts(rows), rows.length);
}
