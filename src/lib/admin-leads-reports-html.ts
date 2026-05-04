/**
 * Admin printable HTML reports — field labels and section layout aligned to:
 * - Student Level Analysis Report (Individual)
 * - Report of Application Status
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
  passedStatus: string;
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

export function buildStudentLevelAnalysisReportHtml(
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
  const extCo = formStr(form, "coSupervisorType");
  const externalCosupervisor =
    extCo.toLowerCase().includes("external") || formStr(form, "externalCoSupervisorName")
      ? "Yes"
      : extCo
        ? "See form"
        : "—";

  const expectedStart = formStr(form, "expectedStartDate").trim() || "—";
  const expectedEnd = formStr(form, "expectedEndDate").trim() || "—";
  const documentsProvided = "—";

  const overviewRows: [string, string][] = [
    ["Submission ID/SAP ID", submissionIdSap],
    ["Attempt Number", "—"],
    ["Total No. of Request(s)", "—"],
    ["Program Level", escapeHtml(programLevel)],
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
    ["Time for Dean's Decision", "—"],
    ["IREB Decision", escapeHtml(irebDecisionShort(cs))],
    ["Time for IREB's Decision", "—"],
    ["Resubmission (Yes/No)", "—"],
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

  const inner = `
  <h1 class="doc-title">Student Level Analysis Report (Individual)</h1>

  <div class="sec-title">Overview</div>
  ${tableSection(overviewRows)}

  <div class="sec-title">Decision Tracking Timeline</div>
  ${tableSection(timelineRows)}

  <div class="sec-title">Research Characteristics</div>
  ${tableSection(researchRows)}

  <div class="page-break">
    <div class="sec-title">Additional information</div>
    ${tableSection(footerRows)}
  </div>

  <p class="footer-note">Generated ${escapeHtml(generatedAt.toLocaleString())}. Empty cells show &ldquo;—&rdquo; when data is not available on the record.</p>`;

  return wrapDocument(`Student Level Analysis Report — ${lead.applicationId}`, inner);
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

  const overdueIreb =
    lead.stage === "ireb" && dur != null && dur > 2 ? "Yes" : lead.stage === "ireb" && dur != null ? "No" : "—";
  const overdueIrebDays =
    lead.stage === "ireb" && dur != null && dur > 2 ? String(dur - 2) : "—";

  const pendingDeanDays =
    cs === "under_dean_review" || cs === "submitted"
      ? dur != null
        ? String(dur)
        : "—"
      : "0";
  const pendingIrebDays = cs === "under_ireb_review" ? (dur != null ? String(dur) : "—") : "0";

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
    ["Rejected/Approved by Dean (Date)", "—"],
    ["Form Overdue by Dean (Yes/No)", escapeHtml(overdueDean)],
    ["Overdue Days", escapeHtml(overdueDeanDays)],
    [
      "Approved Form Reached at IREB's Dashboard",
      escapeHtml(
        cs === "under_ireb_review" || cs === "approved" || cs === "rejected" ? "—" : "—",
      ),
    ],
    ["Request Pending at IREB (Days)", escapeHtml(pendingIrebDays)],
    ["Form Overdue by IREB (Yes/No)", escapeHtml(overdueIreb)],
    ["Overdue Days", escapeHtml(overdueIrebDays)],
    ["Approval/Rejection Date by IREB", "—"],
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

