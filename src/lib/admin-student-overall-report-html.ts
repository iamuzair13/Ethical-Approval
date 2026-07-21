/**
 * Overall Student Report — UOL student email cohort, thesis + publication.
 * Separate from aggregate catalog builders.
 */

import type { AggregateReportContext, AggregateSubmissionInput } from "@/lib/admin-aggregate-reports-html";
import {
  coverBlock,
  escapeHtml,
  wrapDocument,
} from "@/lib/admin-aggregate-reports-html";
import { buildOverallStudentChartsHtml } from "@/lib/admin-report-charts-html";
import { isStudentUolEmail } from "@/lib/admin-faculty-overall-report-html";

export function isStudentCohortRow(r: AggregateSubmissionInput): boolean {
  return isStudentUolEmail(r.applicant_email);
}

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

function collectSupervisorResponseDays(rows: AggregateSubmissionInput[]): number[] {
  const out: number[] = [];
  for (const r of rows) {
    if (!r.supervisor_decision_at) continue;
    out.push(daysBetween(r.submitted_at, r.supervisor_decision_at));
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

type ProgramTier = "phd" | "mphil" | "undergrad" | "other";

function classifyProgramTier(program: string | null): ProgramTier {
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

function passedSupervisorStage(cs: AggregateSubmissionInput["current_status"]): boolean {
  return ["supervisor_approved", "under_ireb_review", "approved", "rejected"].includes(cs);
}

function countByKey(rows: AggregateSubmissionInput[], keyFn: (r: AggregateSubmissionInput) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = keyFn(r).trim() || "—";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function extremalShare(
  counts: Map<string, number>,
  total: number,
  pick: "max" | "min",
): { label: string; pct: number; count: number } | null {
  if (total <= 0 || counts.size === 0) return null;
  let bestPct = pick === "max" ? -Infinity : Infinity;
  const winners: string[] = [];
  for (const [label, c] of counts) {
    const pct = (c / total) * 100;
    if (pick === "max") {
      if (pct > bestPct + 1e-9) {
        bestPct = pct;
        winners.length = 0;
        winners.push(label);
      } else if (Math.abs(pct - bestPct) < 1e-9) winners.push(label);
    } else {
      if (pct < bestPct - 1e-9) {
        bestPct = pct;
        winners.length = 0;
        winners.push(label);
      } else if (Math.abs(pct - bestPct) < 1e-9) winners.push(label);
    }
  }
  winners.sort((a, b) => a.localeCompare(b));
  const count = winners.reduce((s, lab) => s + (counts.get(lab) ?? 0), 0);
  return { label: winners.join(", "), pct: bestPct, count };
}

function highestFacultyRequestsLine(rows: AggregateSubmissionInput[]): string {
  if (rows.length === 0) return "—";
  const byFac = countByKey(rows, (r) => r.faculty);
  const ex = extremalShare(byFac, rows.length, "max");
  if (!ex) return "—";
  return `${ex.label} (${ex.count} requests; ${fmtPct(ex.pct)})`;
}

function highestStudentSupervisorApprovedByFaculty(studentRows: AggregateSubmissionInput[]): string {
  const supervisorOk = studentRows.filter((r) => passedSupervisorStage(r.current_status));
  if (supervisorOk.length === 0) return "—";
  const byFac = countByKey(supervisorOk, (r) => r.faculty);
  const ex = extremalShare(byFac, supervisorOk.length, "max");
  if (!ex) return "—";
  const total = supervisorOk.length;
  return `${ex.label} (${ex.count} of ${total} past supervisor; ${fmtPct((ex.count / total) * 100)})`;
}

function buildMetricsTableRows(studentRows: AggregateSubmissionInput[]): [string, string][] {
  const n = studentRows.length;
  if (n === 0) {
    return [
      ["Total students", "0"],
      ["Percentage of undergraduates", "—"],
      ["Percentage of MPhil.", "—"],
      ["Percentage of PhD", "—"],
      ["Number of requests by medical faculties", "0"],
      ["Number of requests by all other faculties", "0"],
      ["Number of requests for thesis/projects", "0"],
      ["Number of requests for publications", "0"],
      ["Highest faculty requests", "—"],
      ["Approval rate", "—"],
      ["Rejection rate", "—"],
      ["Average attempts", "—"],
      ["Highest students requests approved by supervisor (faculty)", "—"],
      ["Supervisor(s) average response days", "—"],
      ["IREB average response days", "—"],
      ["Average processing days (overall)", "—"],
      ["Common SDGs (top 5)", "—"],
    ];
  }

  let u = 0;
  let m = 0;
  let ph = 0;
  for (const r of studentRows) {
    const t = classifyProgramTier(r.applicant_program);
    if (t === "undergrad") u += 1;
    else if (t === "mphil") m += 1;
    else if (t === "phd") ph += 1;
  }

  const medicalN = studentRows.filter((r) => r.domain === "medical").length;
  const otherN = studentRows.filter((r) => r.domain === "non_medical").length;
  const thesisN = studentRows.filter((r) => r.type === "thesis").length;
  const pubN = studentRows.filter((r) => r.type === "publication").length;

  const approved = studentRows.filter((r) => r.current_status === "approved").length;
  const rejected = studentRows.filter(
    (r) => r.current_status === "rejected" || r.current_status === "supervisor_rejected",
  ).length;
  const attemptMean = mean(studentRows.map((r) => r.applicant_attempt_number));

  const supervisorDays = collectSupervisorResponseDays(studentRows);
  const irebDays = collectIrebPhaseDays(studentRows);
  const cycleDays = collectTerminalCycleDays(studentRows);

  return [
    ["Total students", String(n)],
    ["Percentage of undergraduates", fmtPct((u / n) * 100)],
    ["Percentage of MPhil.", fmtPct((m / n) * 100)],
    ["Percentage of PhD", fmtPct((ph / n) * 100)],
    ["Number of requests by medical faculties", String(medicalN)],
    ["Number of requests by all other faculties", String(otherN)],
    ["Number of requests for thesis/projects", String(thesisN)],
    ["Number of requests for publications", String(pubN)],
    ["Highest faculty requests", highestFacultyRequestsLine(studentRows)],
    ["Approval rate", fmtPct((approved / n) * 100)],
    ["Rejection rate", fmtPct((rejected / n) * 100)],
    [
      "Average attempts",
      attemptMean != null ? (Math.round(attemptMean * 100) / 100).toFixed(2) : "—",
    ],
    ["Highest students requests approved by supervisor (faculty)", highestStudentSupervisorApprovedByFaculty(studentRows)],
    ["Supervisor(s) average response days", supervisorDays.length ? `${fmtDays(mean(supervisorDays))} days` : "—"],
    ["IREB average response days", irebDays.length ? `${fmtDays(mean(irebDays))} days` : "—"],
    ["Average processing days (overall)", cycleDays.length ? `${fmtDays(mean(cycleDays))} days` : "—"],
    ["Common SDGs (top 5)", topSdgsSummary(studentRows, 5)],
  ];
}

export function buildOverallStudentReportHtml(
  studentRows: AggregateSubmissionInput[],
  ctx: AggregateReportContext,
): string {
  const rowsHtml = buildMetricsTableRows(studentRows);
  const body = rowsHtml
    .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
    .join("");
  const inner = `
  ${coverBlock(ctx)}
  ${buildOverallStudentChartsHtml(studentRows)}
  <div class="sec-title">Student applicant summary</div>
  <table class="pdf-grid"><tbody>${body}</tbody></table>
  <p class="footer-note">
    Cohort: submissions where the applicant email ends with
    <code>@student.uol.edu.pk</code> (thesis and publication), same period and scope as the catalog.
    Program tier (undergraduate / MPhil / PhD) is inferred from the applicant program snapshot; rows that do not match any tier still count in the total <em>n</em> used as the denominator for each percentage, so the three program percentages may sum to less than 100%.
    Medical vs other faculties uses submission domain. &ldquo;Total students&rdquo; is the count of such submissions (requests), not distinct people unless each person submits once.
    Supervisor / IREB / overall timing definitions match the faculty publication report.
  </p>`;
  return wrapDocument(`${ctx.reportTitle} — ${ctx.periodLabel}`, inner);
}
