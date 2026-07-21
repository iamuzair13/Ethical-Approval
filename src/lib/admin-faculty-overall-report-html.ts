/**
 * Overall Faculty Report — faculty/staff research publications only
 * (non–@student.uol.edu.pk applicants, `type = publication`), separate from aggregate catalog builders.
 */

import type { AggregateReportContext, AggregateSubmissionInput } from "@/lib/admin-aggregate-reports-html";
import {
  coverBlock,
  escapeHtml,
  wrapDocument,
} from "@/lib/admin-aggregate-reports-html";
import { buildOverallFacultyChartsHtml } from "@/lib/admin-report-charts-html";

const STUDENT_UOL_EMAIL_SUFFIX = "@student.uol.edu.pk";

export function isStudentUolEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(STUDENT_UOL_EMAIL_SUFFIX);
}

/** Faculty/staff publication cohort: publication type and not a UOL student email. */
export function isFacultyStaffPublicationRow(r: AggregateSubmissionInput): boolean {
  return r.type === "publication" && !isStudentUolEmail(r.applicant_email);
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

function isPhdProgram(program: string | null): boolean {
  if (!program) return false;
  const p = program.trim().toLowerCase();
  return p.includes("phd") || p.includes("ph.d") || p.includes("doctor of philosophy");
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

function formatShareLine(x: { label: string; pct: number; count: number } | null): string {
  if (!x) return "—";
  return `${x.label} (${fmtPct(x.pct)}; n=${x.count})`;
}

/** Student cohort in same scope/period: UOL student email or applicant role student. */
function isStudentApplicantRow(r: AggregateSubmissionInput): boolean {
  return isStudentUolEmail(r.applicant_email) || r.applicant_role === "student";
}

function highestStudentSupervisorApprovedByFaculty(scopedRows: AggregateSubmissionInput[]): string {
  const students = scopedRows.filter(isStudentApplicantRow);
  const supervisorOk = students.filter((r) => passedSupervisorStage(r.current_status));
  if (supervisorOk.length === 0) return "—";
  const byFac = countByKey(supervisorOk, (r) => r.faculty);
  const ex = extremalShare(byFac, supervisorOk.length, "max");
  if (!ex) return "—";
  const total = supervisorOk.length;
  return `${ex.label} (${ex.count} of ${total} student requests past supervisor; ${fmtPct((ex.count / total) * 100)})`;
}

function buildMetricsTableRows(
  facultyRows: AggregateSubmissionInput[],
  scopedAllRows: AggregateSubmissionInput[],
): [string, string][] {
  const n = facultyRows.length;
  if (n === 0) {
    return [
      ["Total faculty/staff requests", "0"],
      ["Highest percentage of request (faculty)", "—"],
      ["Highest percentage of request (department)", "—"],
      ["Lowest percentage of requests (department)", "—"],
      ["Percentage of PhD", "—"],
      ["Number of requests by medical faculties", "0"],
      ["Number of requests by all other faculties", "0"],
      ["Approval rate", "—"],
      ["Rejection rate", "—"],
      ["Average attempts", "—"],
      ["Highest students requests approved by supervisor (faculty)", highestStudentSupervisorApprovedByFaculty(scopedAllRows)],
      ["Supervisor(s) average response days", "—"],
      ["IREB average response days", "—"],
      ["Average processing days (overall)", "—"],
      ["Common SDGs (top 5)", "—"],
    ];
  }

  const byFaculty = countByKey(facultyRows, (r) => r.faculty);
  const byDept = countByKey(facultyRows, (r) => r.applicant_department);
  const hiFac = extremalShare(byFaculty, n, "max");
  const hiDept = extremalShare(byDept, n, "max");
  const loDept = extremalShare(byDept, n, "min");

  const phdN = facultyRows.filter((r) => isPhdProgram(r.applicant_program)).length;
  const medicalN = facultyRows.filter((r) => r.domain === "medical").length;
  const otherN = facultyRows.filter((r) => r.domain === "non_medical").length;

  const approved = facultyRows.filter((r) => r.current_status === "approved").length;
  const rejected = facultyRows.filter(
    (r) => r.current_status === "rejected" || r.current_status === "supervisor_rejected",
  ).length;
  const attemptMean = mean(facultyRows.map((r) => r.applicant_attempt_number));

  const supervisorDays = collectSupervisorResponseDays(facultyRows);
  const irebDays = collectIrebPhaseDays(facultyRows);
  const cycleDays = collectTerminalCycleDays(facultyRows);

  const sdgs = topSdgsSummary(facultyRows, 5);
  const studentSupervisorLine = highestStudentSupervisorApprovedByFaculty(scopedAllRows);

  return [
    ["Total faculty/staff requests", String(n)],
    ["Highest percentage of request (faculty)", formatShareLine(hiFac)],
    ["Highest percentage of request (department)", formatShareLine(hiDept)],
    ["Lowest percentage of requests (department)", formatShareLine(loDept)],
    ["Percentage of PhD", fmtPct((phdN / n) * 100)],
    ["Number of requests by medical faculties", String(medicalN)],
    ["Number of requests by all other faculties", String(otherN)],
    ["Approval rate", fmtPct((approved / n) * 100)],
    ["Rejection rate", fmtPct((rejected / n) * 100)],
    [
      "Average attempts",
      attemptMean != null ? (Math.round(attemptMean * 100) / 100).toFixed(2) : "—",
    ],
    ["Highest students requests approved by supervisor (faculty)", studentSupervisorLine],
    ["Supervisor(s) average response days", supervisorDays.length ? `${fmtDays(mean(supervisorDays))} days` : "—"],
    ["IREB average response days", irebDays.length ? `${fmtDays(mean(irebDays))} days` : "—"],
    ["Average processing days (overall)", cycleDays.length ? `${fmtDays(mean(cycleDays))} days` : "—"],
    ["Common SDGs (top 5)", sdgs],
  ];
}

/**
 * @param facultyRows — publication + non–student.uol.edu.pk, same scope as catalog
 * @param scopedAllRows — all submission types/roles in scope (for student vs supervisor faculty metric)
 */
export function buildOverallFacultyReportHtml(
  facultyRows: AggregateSubmissionInput[],
  scopedAllRows: AggregateSubmissionInput[],
  ctx: AggregateReportContext,
): string {
  const rowsHtml = buildMetricsTableRows(facultyRows, scopedAllRows);
  const body = rowsHtml
    .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
    .join("");
  const inner = `
  ${coverBlock(ctx)}
  ${buildOverallFacultyChartsHtml(facultyRows)}
  <div class="sec-title">Faculty / staff publication summary</div>
  <table class="pdf-grid"><tbody>${body}</tbody></table>
  <p class="footer-note">
    Includes only <strong>research publication</strong> submissions where the applicant email is not
    <code>${escapeHtml(STUDENT_UOL_EMAIL_SUFFIX)}</code> (faculty/staff and other non-student accounts in the same period and scope).
    Medical vs other faculties uses submission domain (<em>medical</em> / <em>non-medical</em>).
    PhD share uses the applicant program snapshot when it mentions PhD / Ph.D / Doctor of Philosophy.
    Student supervisor metric uses student email suffix or applicant role &ldquo;student&rdquo; within the same report scope and period.
    Supervisor response days: submission to latest supervisor-stage decision. IREB segment: latest supervisor decision to latest IREB decision when both exist.
    Overall processing: submission to final outcome (IREB decision, else supervisor-only rejection).
  </p>`;
  return wrapDocument(`${ctx.reportTitle} — ${ctx.periodLabel}`, inner);
}
