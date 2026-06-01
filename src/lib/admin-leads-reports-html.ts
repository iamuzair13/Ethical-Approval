/**
 * Admin printable HTML reports — field labels and section layout aligned to:
 * - Student Level Analysis Report (Individual)
 * - Report of Application Status
 * - Faculty Report (Individual) — faculty applicants (non–student.uol.edu.pk emails)
 *
 * Download / print toolbar is embedded for iframe preview (postMessage to parent).
 */

export type LeadReportRow = {
  applicationId: string;
  name: string;
  email: string;
  faculty: string;
  project: string;
  duration: string;
  currentStatus: string;
  stage: string;
  latestFeedbackComment?: string | null;
  latestAuditNote?: string | null;
  latestActionTrace?: string | null;
};

export type AdminReportSubmission = {
  application_id: string;
  applicant_sap_id?: string;
  applicant_name?: string;
  applicant_email?: string;
  applicant_faculty?: string;
  applicant_department?: string;
  applicant_program?: string | null;
  type?: string;
  domain?: string;
  current_status?: string;
  submitted_at?: string | Date | null;
  title?: string | null;
  objectives?: string | null;
  ethics_json?: unknown;

  /** Position of this submission among the applicant's non-draft submissions (1-based). */
  applicant_attempt_number?: number;
  /** Total non-draft submissions made by this applicant. */
  applicant_total_submissions?: number;
  /** Latest dean decision timestamp on this submission, if any. */
  dean_decision_at?: string | Date | null;
  /** Latest IREB decision timestamp on this submission, if any. */
  ireb_decision_at?: string | Date | null;
  /** Count of files uploaded by the applicant at submission stage. */
  submission_attachment_count?: number;
  /** Thesis timeline persisted in submission_timeline (publications won't have this). */
  start_date?: string | Date | null;
  end_date?: string | Date | null;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function dash(s: string | null | undefined): string {
  const t = (s ?? "").trim();
  return t.length ? t : "—";
}

function formatDateTime(d: Date | string | null | undefined): { date: string; time: string } {
  if (d == null) return { date: "—", time: "—" };
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return { date: "—", time: "—" };
  return {
    date: dt.toLocaleDateString(undefined, { dateStyle: "medium" }),
    time: dt.toLocaleTimeString(undefined, { timeStyle: "short" }),
  };
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
}

function getForm(ethics: unknown): Record<string, unknown> {
  if (!ethics || typeof ethics !== "object") return {};
  const e = ethics as { form?: unknown };
  if (e.form && typeof e.form === "object" && !Array.isArray(e.form)) {
    return e.form as Record<string, unknown>;
  }
  return {};
}

function formStr(form: Record<string, unknown>, key: string): string {
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

function yesNoUnknown(v: string): string {
  const s = v.trim().toLowerCase();
  if (!s) return "—";
  if (s === "yes" || s === "y" || s === "true") return "Yes";
  if (s === "no" || s === "n" || s === "false") return "No";
  return v;
}

function mapSubmissionStatus(cs: string | undefined): string {
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
      return cs ? cs.replace(/_/g, " ") : "—";
  }
}

function deanDecisionShort(cs: string | undefined): string {
  if (!cs) return "—";
  if (cs === "dean_rejected") return "Rejected";
  if (cs === "submitted" || cs === "under_dean_review") return "Pending";
  return "Approved";
}

function irebDecisionShort(cs: string | undefined): string {
  if (!cs) return "—";
  if (cs === "approved") return "Approved";
  if (cs === "rejected") return "Rejected";
  if (cs === "under_ireb_review") return "Pending";
  return "Pending";
}

function parseDurationDays(duration: string): number | null {
  const n = Number.parseInt(duration, 10);
  return Number.isNaN(n) ? null : n;
}

function toValidDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const dt = value instanceof Date ? value : new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatDateOnly(value: Date | string | null | undefined): string {
  const dt = toValidDate(value);
  if (!dt) return "—";
  return dt.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/**
 * Pretty-print the gap between two timestamps as e.g. "2 days 3 hr", "45 minutes",
 * or "—" if either endpoint is unknown or the interval is negative.
 */
function formatTimeBetween(
  from: Date | string | null | undefined,
  to: Date | string | null | undefined,
): string {
  const start = toValidDate(from);
  const end = toValidDate(to);
  if (!start || !end) return "—";
  const ms = end.getTime() - start.getTime();
  if (ms < 0) return "—";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) {
    return hours > 0
      ? `${days} day${days === 1 ? "" : "s"} ${hours} hr`
      : `${days} day${days === 1 ? "" : "s"}`;
  }
  if (hours > 0) {
    return minutes > 0
      ? `${hours} hour${hours === 1 ? "" : "s"} ${minutes} min`
      : `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  if (minutes > 0) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  return "Less than a minute";
}

/** Simple SVG pie by workflow phase for Overview “Status” row (PDF template suggests chart). */
function statusPieSvg(lead: LeadReportRow, submissionStatus?: string): string {
  const cs = submissionStatus ?? "";
  let fill = "#5750f1";
  let label = lead.currentStatus;
  if (cs === "under_dean_review" || cs === "submitted") {
    fill = "#f59e0b";
    label = "Pending at Dean";
  } else if (cs === "under_ireb_review") {
    fill = "#0ea5e9";
    label = "Pending at IREB";
  } else if (cs === "approved" || lead.currentStatus.includes("Approved")) {
    fill = "#10b981";
    label = "Approved";
  } else if (cs === "rejected" || lead.currentStatus.includes("Rejected")) {
    fill = "#ef4444";
    label = "Rejected";
  }
  return `
  `;
}

const REPORT_STYLES = `
  :root {
    --ink: #111827;
    --muted: #6b7280;
    --border: #000000;
    --accent: #5750f1;
    --label-w: 40%;
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
    margin: 0 0 28px;
    font-size: 18px;
    font-weight: 700;
    text-decoration: underline;
    text-align: center;
  }
  .sec-title {
    margin: 22px 0 10px;
    font-size: 14px;
    font-weight: 700;
  }
  .sec-title:first-of-type { margin-top: 0; }
  table.pdf-grid {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin-bottom: 8px;
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
    width: var(--label-w);
    font-weight: 600;
    background: #fafafa;
  }
  .page-break { page-break-before: always; padding-top: 24px; }
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
    .page-break { padding-top: 0; }
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

type IndividualReportMode = "student" | "faculty";

function buildIndividualAnalysisReportHtml(
  lead: LeadReportRow,
  submission: AdminReportSubmission | null,
  generatedAt: Date,
  mode: IndividualReportMode,
): string {
  const form = getForm(submission?.ethics_json);
  const submitted = submission?.submitted_at
    ? submission.submitted_at instanceof Date
      ? submission.submitted_at
      : new Date(submission.submitted_at)
    : null;
  const validDate = submitted && !Number.isNaN(submitted.getTime()) ? submitted : null;
  const { date: subDate, time: subTime } = formatDateTime(validDate);
  const cs = submission?.current_status;

  const sapRaw = (submission?.applicant_sap_id || formStr(form, "scholarSapId")).trim() || "—";
  const submissionIdSap = `${escapeHtml(submission?.application_id ?? lead.applicationId)} / ${escapeHtml(sapRaw)}`;

  const programLevel = (submission?.applicant_program ?? formStr(form, "scholarProgram")).trim() || "—";
  const faculty = (submission?.applicant_faculty ?? lead.faculty).trim() || "—";
  const department = (submission?.applicant_department ?? "").trim() || "—";
  const formType =
    submission?.type != null
      ? `${submission.type === "thesis" ? "Thesis" : "Publication"} (${submission.domain === "medical" ? "Medical" : "Non-medical"})`
      : formStr(form, "applicationType").trim() || "—";

  const totalProcessingDays =
    validDate != null ? String(daysBetween(validDate, generatedAt)) : "—";

  const researchTitle = (submission?.title?.trim() || formStr(form, "thesisTitle")).trim() || "—";
  const sdgs = formStr(form, "sdgs").trim() || "—";
  const researchPurpose = (formStr(form, "researchPurpose") || submission?.objectives?.trim() || "").trim() || "—";

  const fundedInst = formStr(form, "institutionalFunding");
  const fundedExt = formStr(form, "externalFunding");
  const funded =
    fundedInst.toLowerCase().includes("yes") || fundedExt.toLowerCase().includes("yes")
      ? "Yes"
      : fundedInst.toLowerCase().includes("no") && fundedExt.toLowerCase().includes("no")
        ? "No"
        : fundedInst || fundedExt
          ? dash(fundedInst || fundedExt)
          : "—";

  const intl = yesNoUnknown(formStr(form, "internationalCollaboration"));
  const coSupType = formStr(form, "coSupervisorType").trim().toLowerCase();
  const hasExternalCoSupDetails = Boolean(
    formStr(form, "externalCoSupervisorName").trim() ||
      formStr(form, "externalCoSupervisorRegNo").trim() ||
      formStr(form, "externalCoSupervisorEmail").trim(),
  );
  const externalCosupervisor =
    coSupType === "external" || hasExternalCoSupDetails ? "Yes" : "No";

  const attemptNumber =
    typeof submission?.applicant_attempt_number === "number" &&
    submission.applicant_attempt_number > 0
      ? String(submission.applicant_attempt_number)
      : "—";
  const totalRequests =
    typeof submission?.applicant_total_submissions === "number" &&
    submission.applicant_total_submissions > 0
      ? String(submission.applicant_total_submissions)
      : "—";
  const isResubmission =
    typeof submission?.applicant_attempt_number === "number"
      ? submission.applicant_attempt_number > 1
        ? "Yes"
        : "No"
      : "—";

  const deanDecisionAt = toValidDate(submission?.dean_decision_at);
  const irebDecisionAt = toValidDate(submission?.ireb_decision_at);
  const timeForDeanDecision = formatTimeBetween(validDate, deanDecisionAt);
  // Time at IREB starts when the application leaves the dean's queue
  // (fall back to submission time if the dean stage was skipped).
  const timeForIrebDecision = formatTimeBetween(
    deanDecisionAt ?? validDate,
    irebDecisionAt,
  );

  const attachmentCount = submission?.submission_attachment_count ?? 0;
  const documentsProvided =
    attachmentCount > 0
      ? `Yes (${attachmentCount} file${attachmentCount === 1 ? "" : "s"})`
      : submission != null
        ? "No"
        : "—";

  const timelineStart = toValidDate(submission?.start_date);
  const timelineEnd = toValidDate(submission?.end_date);
  const expectedStart = timelineStart
    ? formatDateOnly(timelineStart)
    : formStr(form, "expectedStartDate").trim() || "—";
  const expectedEnd = timelineEnd
    ? formatDateOnly(timelineEnd)
    : formStr(form, "expectedEndDate").trim() || "—";

  const programRowLabel =
    mode === "faculty" ? "Program / designation (if applicable)" : "Program Level";

  const overviewRows: [string, string][] = [
    ["Application ID / SAP ID", submissionIdSap],
    ["Attempt Number", escapeHtml(attemptNumber)],
    ["Total No. of Request(s)", escapeHtml(totalRequests)],
    [programRowLabel, escapeHtml(programLevel)],
    ["Faculty", escapeHtml(faculty)],
    ["Department", escapeHtml(department)],
    ["Type of Form Selected (Thesis/Publication)", escapeHtml(formType)],
    ["Date(s) Submitted", escapeHtml(subDate !== "—" ? `${subDate}${subTime !== "—" ? ` ${subTime}` : ""}` : "—")],
    [
      "Status",
      statusPieSvg(lead, cs) + `<div style="margin-top:10px;font-size:12px;">${escapeHtml(mapSubmissionStatus(cs) || lead.currentStatus)}</div>`,
    ],
    ["Total Processing Days", escapeHtml(totalProcessingDays)],
    ["Dean's Decision (Approved/Rejected)", escapeHtml(deanDecisionShort(cs))],
    ["IREB Decision (Approved/Rejected)", escapeHtml(irebDecisionShort(cs))],
    ["Approved IREB Number (Ethical Approval Number)", "—"],
  ];

  const timelineRows: [string, string][] = [
    ["Form Submission Date", escapeHtml(subDate)],
    ["Form Submission Time", escapeHtml(subTime)],
    ["Dean Decision", escapeHtml(deanDecisionShort(cs))],
    ["Time for Dean's Decision", escapeHtml(timeForDeanDecision)],
    ["IREB Decision", escapeHtml(irebDecisionShort(cs))],
    ["Time for IREB's Decision", escapeHtml(timeForIrebDecision)],
    ["Resubmission (Yes/No)", escapeHtml(isResubmission)],
  ];

  const researchRows: [string, string][] = [
    ["Research Title", escapeHtml(researchTitle)],
    ["Selected SDGs", escapeHtml(sdgs)],
    ["Research Purpose", escapeHtml(researchPurpose)],
    ["Funded (Yes/No)", escapeHtml(funded)],
    ["International/Outside Collaboration (Yes/No)", escapeHtml(intl)],
    ["External Co-Supervisor (Yes/No)", escapeHtml(externalCosupervisor)],
  ];

  const footerRows: [string, string][] = [
    ["All Required Documents Provided (Yes/No)", escapeHtml(documentsProvided)],
    ["Expected Start Date", escapeHtml(expectedStart)],
    ["Expected End Date", escapeHtml(expectedEnd)],
  ];

  function tableSection(rows: [string, string][]): string {
    const body = rows
      .map(
        ([label, cell]) =>
          `<tr><th>${escapeHtml(label)}</th><td>${cell}</td></tr>`,
      )
      .join("");
    return `<table class="pdf-grid"><tbody>${body}</tbody></table>`;
  }

  const docTitle =
    mode === "student"
      ? "Student Level Analysis Report (Individual)"
      : "Faculty Report (Individual)";
  const overviewHeading =
    mode === "student" ? "Overview" : "Faculty member & application overview";
  const wrapTitle =
    mode === "student"
      ? `Student Level Analysis Report — ${lead.applicationId}`
      : `Faculty Report (Individual) — ${lead.applicationId}`;
  const footerExtra =
    mode === "faculty"
      ? " Faculty ethics application."
      : "";

  const inner = `
  <h1 class="doc-title">${escapeHtml(docTitle)}</h1>

  <div class="sec-title">${escapeHtml(overviewHeading)}</div>
  ${tableSection(overviewRows)}

  <div class="sec-title">Decision Tracking Timeline</div>
  ${tableSection(timelineRows)}

  <div class="sec-title">Research Characteristics</div>
  ${tableSection(researchRows)}

  <div class="page-break">
    <div class="sec-title">Additional information</div>
    ${tableSection(footerRows)}
  </div>

  <p class="footer-note">Generated ${escapeHtml(generatedAt.toLocaleString())}. Empty cells show &ldquo;—&rdquo; when data is not available on the record.${escapeHtml(footerExtra)}</p>`;

  return wrapDocument(wrapTitle, inner);
}

export function buildStudentLevelAnalysisReportHtml(
  lead: LeadReportRow,
  submission: AdminReportSubmission | null,
  generatedAt: Date = new Date(),
): string {
  return buildIndividualAnalysisReportHtml(lead, submission, generatedAt, "student");
}

/** Printable faculty individual report — layout aligned to the student analysis template; PDF via html2canvas + jsPDF. */
export function buildFacultyIndividualReportHtml(
  lead: LeadReportRow,
  submission: AdminReportSubmission | null,
  generatedAt: Date = new Date(),
): string {
  return buildIndividualAnalysisReportHtml(lead, submission, generatedAt, "faculty");
}

export function buildApplicationStatusReportHtml(
  lead: LeadReportRow,
  submission: AdminReportSubmission | null,
  generatedAt: Date = new Date(),
): string {
  const form = getForm(submission?.ethics_json);
  const submitted = submission?.submitted_at
    ? submission.submitted_at instanceof Date
      ? submission.submitted_at
      : new Date(submission.submitted_at)
    : null;
  const validDate = submitted && !Number.isNaN(submitted.getTime()) ? submitted : null;
  const { date: subDate } = formatDateTime(validDate);
  const cs = submission?.current_status;

  const currentStatusPdf = dash(
    mapSubmissionStatus(cs) !== "—" ? mapSubmissionStatus(cs) : lead.currentStatus,
  );

  const dur = parseDurationDays(lead.duration);
  const overdueDean =
    lead.stage === "dean" && dur != null && dur > 2 ? "Yes" : dur != null ? "No" : "—";
  const overdueDeanDays =
    lead.stage === "dean" && dur != null && dur > 2 ? String(dur - 2) : "—";

  const pendingDeanDays =
    cs === "under_dean_review" || cs === "submitted"
      ? dur != null
        ? String(dur)
        : "—"
      : "0";
  const pendingIrebDays = cs === "under_ireb_review" ? (dur != null ? String(dur) : "—") : "0";

  // Decision timestamps from approval_decisions (joined by getSubmissionDetailById)
  const deanDecisionAt = toValidDate(submission?.dean_decision_at);
  const irebDecisionAt = toValidDate(submission?.ireb_decision_at);
  const deanDecisionDate = deanDecisionAt ? formatDateOnly(deanDecisionAt) : "—";
  const irebDecisionDate = irebDecisionAt ? formatDateOnly(irebDecisionAt) : "—";

  // The form "reaches IREB" the moment the dean approves it. A dean rejection
  // means it never reached IREB.
  const reachedIrebOnDean =
    cs === "dean_approved" ||
    cs === "under_ireb_review" ||
    cs === "approved" ||
    cs === "rejected";
  const formReachedIrebDate =
    reachedIrebOnDean && deanDecisionAt ? formatDateOnly(deanDecisionAt) : "—";

  // IREB stage runs from dean approval (or submission, if dean was skipped)
  // until the IREB decision is recorded, or until now while still pending.
  const irebStageStart = deanDecisionAt ?? validDate;
  const irebStageEnd =
    irebDecisionAt ?? (cs === "under_ireb_review" ? generatedAt : null);
  const irebElapsedDays =
    irebStageStart && irebStageEnd
      ? Math.max(
          0,
          Math.floor((irebStageEnd.getTime() - irebStageStart.getTime()) / 86400000),
        )
      : null;
  const overdueIreb =
    irebElapsedDays == null ? "—" : irebElapsedDays > 2 ? "Yes" : "No";
  const overdueIrebDays =
    irebElapsedDays != null && irebElapsedDays > 2 ? String(irebElapsedDays - 2) : "—";

  const rows: [string, string][] = [
    ["Form Submission Date", escapeHtml(subDate)],
    [
      "Current Status (Approved/Rejected/Pending at Dean/Pending at IREB)",
      escapeHtml(currentStatusPdf),
    ],
    ["Form Number", escapeHtml(submission?.application_id ?? lead.applicationId)],
    [
      "Reached at Dean's Dashboard",
      escapeHtml(cs && cs !== "submitted" ? subDate : validDate ? subDate : "—"),
    ],
    ["Request Pending at Dean (Days)", escapeHtml(pendingDeanDays)],
    ["Rejected/Approved by Dean (Date)", escapeHtml(deanDecisionDate)],
    ["Form Overdue by Dean (Yes/No)", escapeHtml(overdueDean)],
    ["Overdue Days", escapeHtml(overdueDeanDays)],
    ["Approved Form Reached at IREB's Dashboard", escapeHtml(formReachedIrebDate)],
    ["Request Pending at IREB (Days)", escapeHtml(pendingIrebDays)],
    ["Form Overdue by IREB (Yes/No)", escapeHtml(overdueIreb)],
    ["Overdue Days", escapeHtml(overdueIrebDays)],
    ["Approval/Rejection Date by IREB", escapeHtml(irebDecisionDate)],
  ];

  const body = rows
    .map(([label, cell]) => `<tr><th>${escapeHtml(label)}</th><td>${cell}</td></tr>`)
    .join("");

  const inner = `
  <h1 class="doc-title">Report of Application Status</h1>
  <table class="pdf-grid"><tbody>${body}</tbody></table>
  <p class="footer-note">Generated ${escapeHtml(generatedAt.toLocaleString())}. Applicant: ${escapeHtml(lead.name)} · ${escapeHtml(formStr(form, "scholarSapId") || submission?.applicant_sap_id || "")}</p>`;

  return wrapDocument(`Report of Application Status — ${lead.applicationId}`, inner);
}

