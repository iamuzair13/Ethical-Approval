import {
  inferFormIdFromLegacyRequiredForm,
  type ApprovalFormId,
} from "@/app/profile/_components/forms/form-registry";
import {
  fieldLabel,
  getFormSteps,
  isEmptyValue,
  isInternalIdKey,
} from "@/lib/submission-form-steps";

export type SubmissionReportInput = {
  id?: number;
  application_id: string;
  title?: string | null;
  objectives?: string | null;
  methodology?: string | null;
  current_status?: string | null;
  submitted_at?: string | Date | null;
  applicant_name?: string | null;
  applicant_email?: string | null;
  applicant_faculty?: string | null;
  applicant_department?: string | null;
  applicant_program?: string | null;
  applicant_sap_id?: string | null;
  hod_name_snapshot?: string | null;
  hod_sap_id_snapshot?: string | null;
  hod_email_snapshot?: string | null;
  hod_department_snapshot?: string | null;
  hod_faculty_snapshot?: string | null;
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

function inferFormIdFromEthics(ethics: Record<string, unknown> | null): ApprovalFormId | null {
  if (!ethics) return null;
  const rf = ethics.requiredForm;
  if (rf && typeof rf === "object" && !Array.isArray(rf)) {
    const o = rf as { id?: string; label?: string; applicationType?: string };
    const valid: ApprovalFormId[] = [
      "form1-thesis-non-medical",
      "form2-publication-non-medical",
      "form3-thesis-medical",
      "form4-publication-medical",
      "form5-publication-faculty-staff",
      "form6-publication-faculty-non-medical",
      "form7-publication-faculty-staff-medical",
    ];
    if (o.id && typeof o.id === "string" && valid.includes(o.id as ApprovalFormId)) {
      return o.id as ApprovalFormId;
    }
    if (o.label && o.applicationType) {
      return inferFormIdFromLegacyRequiredForm({
        label: o.label,
        applicationType: o.applicationType as "thesis" | "research-publication",
      });
    }
  }
  return null;
}

/** Human-readable labels for stepper `form` keys — overrides on top of the shared map. */
const LABELS: Record<string, string> = {
  scholarName: "Scholar's name",
  scholarSapId: "SAP ID / Reg. No.",
  scholarEmail: "Email",
  scholarFaculty: "Faculty",
  scholarDepartment: "Department",
  scholarProgram: "Program",
  hodSapId: "HOD SAP ID",
  hodName: "HOD's name",
  hodEmail: "HOD email",
  hodFaculty: "HOD faculty",
  hodDepartment: "HOD department",
  coHodType: "Co-HOD type",
  uolCoHodSapId: "Co-HOD (UOL) SAP ID",
  uolCoHodName: "Co-HOD (UOL) name",
  uolCoHodEmail: "Co-HOD (UOL) email",
  uolCoHodFaculty: "Co-HOD (UOL) faculty",
  uolCoHodDepartment: "Co-HOD (UOL) department",
  externalCoHodName: "External co-HOD name",
  externalCoHodRegNo: "External co-HOD reg. no.",
  externalCoHodEmail: "External co-HOD email",
  externalUniversity: "External university",
  externalFaculty: "External faculty",
  externalDepartment: "External department",
  informedConsentParticipantName: "Informed consent — participant name (English)",
  informedConsentParentage: "Informed consent — S/O, D/O (English)",
  informedConsentProjectTitle: "Informed consent — project title (English)",
  informedConsentConductedBy: "Informed consent — conducted by (English)",
  informedConsentSignature: "Informed consent — signature (English)",
  informedConsentCnic: "Informed consent — CNIC (English)",
  informedConsentDate: "Informed consent — date (English)",
  informedConsentParticipantNameUr: "Informed consent — participant name (Urdu)",
  informedConsentParentageUr: "Informed consent — S/O, D/O (Urdu)",
  informedConsentProjectTitleUr: "Informed consent — project title (Urdu)",
  informedConsentNameUr: "Informed consent — name (Urdu)",
  informedConsentSignatureUr: "Informed consent — signature (Urdu)",
  informedConsentCnicUr: "Informed consent — CNIC (Urdu)",
  informedConsentDateUr: "Informed consent — date (Urdu)",
  requiredAttachments: "Required attachments (selected)",
  declaration: "Declaration text",
  declarationAccepted: "Declaration accepted",
  form3DeclarationAccepted: "Declaration accepted",
  publicationDeclarationAccepted: "Declaration accepted",
  applicantName: "Applicant name (signature)",
  submissionDate: "Submission date",
};

function labelForKey(key: string): string {
  return LABELS[key] ?? fieldLabel(key);
}

/** Field groups rendered in dedicated tables, not the step tables. */
const IDENTITY_KEYS = new Set([
  "scholarName",
  "scholarSapId",
  "scholarEmail",
  "scholarFaculty",
  "scholarDepartment",
  "scholarProgram",
  "applicantName",
]);

const HOD_DISPLAY_KEYS = new Set([
  "hodName",
  "hodSapId",
  "hodEmail",
  "hodFaculty",
  "hodDepartment",
  "hodDesignation",
]);

const DECLARATION_KEYS = new Set([
  "declaration",
  "declarationAccepted",
  "form3DeclarationAccepted",
  "publicationDeclarationAccepted",
]);

const INFORMED_CONSENT_KEYS: string[] = [
  "informedConsentParticipantName",
  "informedConsentParentage",
  "informedConsentProjectTitle",
  "informedConsentConductedBy",
  "informedConsentSignature",
  "informedConsentCnic",
  "informedConsentDate",
  "informedConsentParticipantNameUr",
  "informedConsentParentageUr",
  "informedConsentProjectTitleUr",
  "informedConsentNameUr",
  "informedConsentSignatureUr",
  "informedConsentCnicUr",
  "informedConsentDateUr",
];

function preApprovalInformedConsentApplies(form: Record<string, unknown>): boolean {
  const pre = form.preApprovalDataCollected;
  const pubPre = form.publicationPreApprovalDataCollected;
  return pre === "Yes" || pubPre === "Yes";
}

function shouldIncludeReportKey(key: string, form: Record<string, unknown>): boolean {
  if (!INFORMED_CONSENT_KEYS.includes(key)) return true;
  return preApprovalInformedConsentApplies(form);
}

/** Keys that never appear in the report. */
function isSkippedKey(key: string): boolean {
  return (
    key.startsWith("hod") || // covered by the HOD table
    isInternalIdKey(key) ||
    key === "requiredAttachments" // covered by the attachments table
  );
}

function formatCell(key: string, raw: unknown): string {
  if (raw == null) return "—";
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (typeof raw === "number") return escapeHtml(String(raw));
  if (typeof raw !== "string") {
    try {
      return `<pre class="pre">${escapeHtml(JSON.stringify(raw, null, 2))}</pre>`;
    } catch {
      return escapeHtml(String(raw));
    }
  }
  const s = raw.trim();
  if (!s) return "—";
  if (isChipKeyForReport(key)) {
    const parts = s.split("|").map((p) => p.trim()).filter(Boolean);
    if (parts.length <= 1) return escapeHtml(s);
    return `<ul class="pipe-list">${parts.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`;
  }
  return `<span class="pre">${escapeHtml(s)}</span>`;
}

const PIPE_KEYS = new Set([
  "sdgs",
  "researchPurpose",
  "recruitmentChannels",
  "confidentialityOptions",
  "sensitiveTopicTypes",
  "requiredAttachments",
  "publicationRecruitmentChannels",
  "researchClassification",
  "researchPopulation",
  "publicationPopulationType",
  "vulnerableGroups",
  "drugAdministrationRoutes",
  "dataProtectionOptions",
  "dataCollectionMethod",
]);

function isChipKeyForReport(key: string): boolean {
  return PIPE_KEYS.has(key);
}

function metaRow(label: string, value: string): string {
  return `<tr><th>${escapeHtml(label)}</th><td>${value}</td></tr>`;
}

function fieldRow(key: string, form: Record<string, unknown>): string | null {
  const raw = form[key];
  if (isEmptyValue(raw)) return null;
  return `<tr><th>${escapeHtml(labelForKey(key))}</th><td>${formatCell(key, raw)}</td></tr>`;
}

function renderFieldsTable(rows: string[]): string {
  if (rows.length === 0) return "";
  return `<table class="fields"><colgroup><col class="lc"/><col/></colgroup><tbody>${rows.join("")}</tbody></table>`;
}

function renderSection(title: string, rows: string[]): string {
  const table = renderFieldsTable(rows);
  if (!table) return "";
  return `<section class="sec"><h2>${escapeHtml(title)}</h2>${table}</section>`;
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return status.replace(/_/g, " ");
}

/**
 * Builds a standalone, print-friendly HTML report of the ethical application.
 * All form data is rendered in tabular form — every value shown in full
 * (a PDF cannot expand collapsed content).
 */
export function buildApplicationReportHtml(sub: SubmissionReportInput): string {
  const ethics =
    sub.ethics_json && typeof sub.ethics_json === "object" && !Array.isArray(sub.ethics_json)
      ? (sub.ethics_json as Record<string, unknown>)
      : null;
  const form =
    ethics?.form && typeof ethics.form === "object" && !Array.isArray(ethics.form)
      ? (ethics.form as Record<string, unknown>)
      : {};

  const formId = inferFormIdFromEthics(ethics);
  const steps = getFormSteps(formId);

  // ─── Attachment file names ───
  const attachmentFiles: Record<string, string> = {};
  if (ethics?.attachmentFiles && typeof ethics.attachmentFiles === "object" && !Array.isArray(ethics.attachmentFiles)) {
    for (const [k, v] of Object.entries(ethics.attachmentFiles as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) {
        attachmentFiles[k] = v.trim();
      } else if (
        v &&
        typeof v === "object" &&
        typeof (v as { fileName?: unknown }).fileName === "string" &&
        (v as { fileName: string }).fileName.trim()
      ) {
        attachmentFiles[k] = (v as { fileName: string }).fileName.trim();
      }
    }
  }
  const extras: string[] = Array.isArray(ethics?.extraUploadFiles)
    ? (ethics!.extraUploadFiles as unknown[])
        .map((x) => {
          if (typeof x === "string" && x.trim()) return x.trim();
          if (
            x &&
            typeof x === "object" &&
            typeof (x as { fileName?: unknown }).fileName === "string" &&
            (x as { fileName: string }).fileName.trim()
          ) {
            return (x as { fileName: string }).fileName.trim();
          }
          return "";
        })
        .filter((s) => s.length > 0)
    : [];

  const submitted =
    sub.submitted_at instanceof Date
      ? sub.submitted_at.toISOString().slice(0, 10)
      : typeof sub.submitted_at === "string"
        ? sub.submitted_at.slice(0, 10)
        : "—";

  const title =
    sub.title?.trim() ||
    (typeof form.thesisTitle === "string" && form.thesisTitle.trim()) ||
    (typeof form.publicationTitle === "string" && form.publicationTitle.trim()) ||
    "Ethical review application";

  // ─── Applicant table ───
  const applicantRows = [
    metaRow("Name", escapeHtml(sub.applicant_name || (form.scholarName as string) || "—")),
    metaRow("SAP ID / Reg. No.", escapeHtml(sub.applicant_sap_id || (form.scholarSapId as string) || "—")),
    metaRow("Email", escapeHtml(sub.applicant_email || (form.scholarEmail as string) || "—")),
    metaRow("Faculty", escapeHtml(sub.applicant_faculty || (form.scholarFaculty as string) || "—")),
    metaRow("Department", escapeHtml(sub.applicant_department || (form.scholarDepartment as string) || "—")),
    metaRow("Program", escapeHtml(sub.applicant_program || (form.scholarProgram as string) || "—")),
  ];

  // ─── HOD table (snapshots preferred, form values as fallback) ───
  const hodName = sub.hod_name_snapshot || (form.hodName as string) || null;
  const hodRows = hodName
    ? [
        metaRow("Name", escapeHtml(hodName)),
        metaRow("SAP ID", escapeHtml(sub.hod_sap_id_snapshot || (form.hodSapId as string) || "—")),
        metaRow("Email", escapeHtml(sub.hod_email_snapshot || (form.hodEmail as string) || "—")),
        metaRow("Department", escapeHtml(sub.hod_department_snapshot || (form.hodDepartment as string) || "—")),
        metaRow("Faculty", escapeHtml(sub.hod_faculty_snapshot || (form.hodFaculty as string) || "—")),
      ]
    : [];

  // ─── Step sections ───
  const covered = new Set<string>();
  const stepSections: string[] = [];

  if (steps) {
    steps.forEach((step, index) => {
      const isAttachments = step.keys.includes("requiredAttachments");
      const isDeclaration = step.keys.some((k) => DECLARATION_KEYS.has(k));
      for (const k of step.keys) covered.add(k);

      if (isAttachments) {
        const rows: string[] = [];
        const checklist = form.requiredAttachments;
        if (!isEmptyValue(checklist)) {
          rows.push(
            `<tr><th>${escapeHtml(labelForKey("requiredAttachments"))}</th><td>${formatCell("requiredAttachments", checklist)}</td></tr>`,
          );
        }
        for (const [label, name] of Object.entries(attachmentFiles)) {
          if (!name?.trim()) continue;
          rows.push(
            `<tr><th>${escapeHtml(label)}</th><td><span class="file-name">${escapeHtml(name)}</span></td></tr>`,
          );
        }
        extras.forEach((name, i) => {
          if (name?.trim()) {
            rows.push(
              `<tr><th>${escapeHtml(`Additional upload ${i + 1}`)}</th><td><span class="file-name">${escapeHtml(name)}</span></td></tr>`,
            );
          }
        });
        stepSections.push(renderSection(`Step ${index + 1} · ${step.title}`, rows));
        return;
      }

      const rows: string[] = [];
      // The signed declaration text is meaningful record content — include it
      // with the declaration step even though it isn't a stepper field key.
      if (isDeclaration && !isEmptyValue(form.declaration)) {
        covered.add("declaration");
        rows.push(
          `<tr><th>${escapeHtml(labelForKey("declaration"))}</th><td>${formatCell("declaration", form.declaration)}</td></tr>`,
        );
      }
      for (const key of step.keys) {
        if (isSkippedKey(key) || IDENTITY_KEYS.has(key)) continue;
        if (!shouldIncludeReportKey(key, form)) continue;
        const row = fieldRow(key, form);
        if (row) rows.push(row);
      }
      stepSections.push(renderSection(`Step ${index + 1} · ${step.title}`, rows));
    });
  } else {
    // Unknown/legacy form — flat table of everything.
    const rows: string[] = [];
    for (const [key, value] of Object.entries(form)) {
      if (isSkippedKey(key) || IDENTITY_KEYS.has(key) || DECLARATION_KEYS.has(key)) continue;
      if (!shouldIncludeReportKey(key, form) || isEmptyValue(value)) continue;
      covered.add(key);
      rows.push(`<tr><th>${escapeHtml(labelForKey(key))}</th><td>${formatCell(key, value)}</td></tr>`);
    }
    stepSections.push(renderSection("Application responses", rows));

    // Attachments fallback
    const attRows = Object.entries(attachmentFiles)
      .filter(([, n]) => n?.trim())
      .map(([label, name]) => `<tr><th>${escapeHtml(label)}</th><td><span class="file-name">${escapeHtml(name)}</span></td></tr>`);
    stepSections.push(renderSection("Required attachments & uploads", attRows));
  }

  // ─── Leftover fields — never silently drop submitted data ───
  const orphanRows: string[] = [];
  for (const [key, value] of Object.entries(form)) {
    if (covered.has(key) || isSkippedKey(key) || IDENTITY_KEYS.has(key) || HOD_DISPLAY_KEYS.has(key)) continue;
    if (!shouldIncludeReportKey(key, form) || isEmptyValue(value)) continue;
    orphanRows.push(`<tr><th>${escapeHtml(labelForKey(key))}</th><td>${formatCell(key, value)}</td></tr>`);
  }

  const bodySections = [
    renderSection("Applicant", applicantRows),
    hodRows.length ? renderSection("Reviewing HOD", hodRows) : "",
    ...stepSections,
    renderSection("Additional fields", orphanRows),
  ].join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)} — ${escapeHtml(sub.application_id)}</title>
  <style>
    :root {
      --ink: #0f172a;
      --muted: #64748b;
      --line: #e2e8f0;
      --accent: #4f46e5;
      --surface: #ffffff;
      --page: #f1f5f9;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 1.75rem 1rem 3rem;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 15px;
      line-height: 1.55;
      color: var(--ink);
      background: var(--page);
      -webkit-font-smoothing: antialiased;
    }
    .sheet {
      max-width: 820px;
      margin: 0 auto;
      background: var(--surface);
      border-radius: 14px;
      border: 1px solid var(--line);
      box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
      padding: 2rem 2.25rem 2.5rem;
    }
    @media print {
      body { background: #fff; padding: 0; }
      /* Flatten the card chrome — a printed report is a document, not a webpage. */
      .sheet {
        box-shadow: none;
        border: none;
        border-radius: 0;
        max-width: none;
        padding: 0;
      }
      .summary { background: #fff; }
      .sec { break-before: auto; }
      h2 { break-after: avoid; page-break-after: avoid; }
      table.fields { page-break-inside: auto; }
      .fields tr { break-inside: avoid; page-break-inside: avoid; }
    }
    .head { margin-bottom: 1.75rem; }
    h1 {
      font-size: 1.3rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      margin: 0 0 0.75rem;
      line-height: 1.25;
    }
    .meta-line {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 0.9rem;
      font-size: 0.85rem;
      color: var(--muted);
      align-items: center;
    }
    .badge {
      display: inline-block;
      font-family: ui-monospace, "Cascadia Code", monospace;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--accent);
      background: rgba(79, 70, 229, 0.08);
      padding: 0.15rem 0.55rem;
      border-radius: 6px;
      letter-spacing: 0.02em;
    }
    .status {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: capitalize;
      color: #92400e;
      background: #fef3c7;
      border: 1px solid #fde68a;
      padding: 0.15rem 0.6rem;
      border-radius: 999px;
    }
    .summary {
      margin-top: 1rem;
      padding: 0.85rem 1rem;
      background: #f8fafc;
      border-radius: 10px;
      border: 1px solid var(--line);
      font-size: 0.9rem;
    }
    .summary h3 { margin: 0 0 0.4rem; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent); }
    .summary p { margin: 0; white-space: pre-wrap; }
    .sec { margin-top: 1.75rem; }
    h2 {
      margin: 0 0 0.65rem;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      color: var(--accent);
    }
    table.fields {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }
    .fields col.lc { width: 30%; }
    .fields th, .fields td {
      border: 1px solid var(--line);
      padding: 0.45rem 0.7rem;
      vertical-align: top;
      text-align: left;
      font-size: 0.83rem;
      line-height: 1.5;
    }
    .fields th {
      background: #f8fafc;
      font-weight: 600;
      color: var(--ink);
    }
    .fields tr { break-inside: avoid; page-break-inside: avoid; }
    .pre { white-space: pre-wrap; word-break: break-word; }
    pre.pre { margin: 0; font-family: inherit; font-size: inherit; }
    ul.pipe-list { margin: 0; padding-left: 1.1rem; }
    ul.pipe-list li { margin: 0.1rem 0; }
    .file-name { font-family: ui-monospace, monospace; font-size: 0.8rem; }
    footer {
      margin-top: 2.25rem;
      padding-top: 0.9rem;
      border-top: 1px solid var(--line);
      font-size: 0.72rem;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="head">
      <h1>${escapeHtml(title)}</h1>
      <div class="meta-line">
        <span class="badge">${escapeHtml(sub.application_id)}</span>
        <span class="status">${escapeHtml(formatStatus(sub.current_status))}</span>
        <span>Submitted ${escapeHtml(submitted)}</span>
        ${sub.applicant_name ? `<span>${escapeHtml(sub.applicant_name)}</span>` : ""}
      </div>
      ${
        sub.objectives?.trim()
          ? `<div class="summary"><h3>Research summary</h3><p>${escapeHtml(sub.objectives.trim())}</p></div>`
          : ""
      }
      ${
        sub.methodology?.trim()
          ? `<div class="summary" style="margin-top:0.6rem"><h3>Methodology (record)</h3><p>${escapeHtml(sub.methodology.trim())}</p></div>`
          : ""
      }
    </header>
    ${bodySections}
    <footer>
      Generated from the ethical review application. Application record #${sub.id ?? "—"}.
    </footer>
  </div>
</body>
</html>`;
}
