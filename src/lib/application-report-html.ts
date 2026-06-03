import {
  inferFormIdFromLegacyRequiredForm,
  type ApprovalFormId,
} from "@/app/profile/_components/forms/form-registry";

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

/** Human-readable labels for stepper `form` keys (camelCase → English). */
const LABELS: Record<string, string> = {
  scholarName: "Scholar's name",
  scholarSapId: "SAP ID / Reg. No.",
  scholarEmail: "Email",
  scholarFaculty: "Faculty",
  scholarDepartment: "Department",
  scholarProgram: "Program",
  supervisorSapId: "Supervisor SAP ID",
  supervisorName: "Supervisor's name",
  supervisorEmail: "Supervisor email",
  supervisorFaculty: "Supervisor faculty",
  supervisorDepartment: "Supervisor department",
  coSupervisorType: "Co-supervisor type",
  uolCoSupervisorSapId: "Co-supervisor (UOL) SAP ID",
  uolCoSupervisorName: "Co-supervisor (UOL) name",
  uolCoSupervisorEmail: "Co-supervisor (UOL) email",
  uolCoSupervisorFaculty: "Co-supervisor (UOL) faculty",
  uolCoSupervisorDepartment: "Co-supervisor (UOL) department",
  externalCoSupervisorName: "External co-supervisor name",
  externalCoSupervisorRegNo: "External co-supervisor reg. no.",
  externalCoSupervisorEmail: "External co-supervisor email",
  externalUniversity: "External university",
  externalFaculty: "External faculty",
  externalDepartment: "External department",
  thesisTitle: "Thesis / project title",
  expectedStartDate: "Expected start date",
  expectedEndDate: "Expected end date",
  researchLocations: "Research location(s)",
  researchObjective1: "Research objective 1",
  researchObjective2: "Research objective 2",
  researchObjective3: "Research objective 3",
  researchObjective4: "Research objective 4",
  sdgs: "Sustainable Development Goals",
  researchPurpose: "Purpose of research",
  dataCollectionMethod: "Data collection method",
  researchPopulation: "Research population (selected)",
  methodology: "Research methodology",
  participantsEstimate: "Estimated participants",
  involveHumanParticipants: "Human participants involved?",
  collectPii: "Personally identifiable information collected?",
  piiTypes: "Types of PII",
  recruitmentChannels: "Recruitment channels",
  informedConsentType: "Informed consent type",
  preApprovalDataCollected: "Data collected before approval?",
  publicationPreApprovalDataCollected: "Data collected before approval? (publication)",
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
  canWithdraw: "Participants may withdraw?",
  compensation: "Compensation for participants?",
  confidentialityOptions: "Confidentiality / privacy measures",
  confidentialityOtherDetails: "Confidentiality (other details)",
  vulnerablePopulation: "Vulnerable populations?",
  vulnerableGroups: "Vulnerable populations (selected)",
  adverseEventsManagement: "Adverse events / complaint management",
  vulnerableSafeguards: "Safeguards for vulnerable populations",
  sensitiveTopics: "Sensitive topics?",
  sensitiveTopicTypes: "Sensitive topic types",
  sensitiveTopicOtherDetails: "Sensitive topics (other)",
  potentialRisks: "Potential adverse effects / risks?",
  potentialRiskDetails: "Risk details",
  dataRetentionYears: "Data retention period",
  longRetentionReason: "Reason for long retention",
  conflictOfInterest: "Conflict of interest",
  conflictManagement: "Conflict management",
  recordsWithoutConsent: "Access records without consent?",
  recordsWithoutConsentJustification: "Justification (records without consent)",
  institutionalFunding: "Has your research received institutional funding? ",
  externalFunding: "Has your research received external funding? ",
  externalFundingSource: "External funding source",
  internationalCollaboration: "International collaboration",
  internationalCollaborationDetails: "International collaboration details",
  conductedAbroad: "Will your research, or a part of it, be conducted overseas/abroad?",
  requiredAttachments: "Required attachments (selected)",
  declaration: "Declaration text",
  declarationAccepted: "Declaration accepted",
  applicantName: "Applicant name (signature)",
  submissionDate: "Submission date",
  form3DeclarationAccepted: "Declaration accepted (Form 3)",
  publicationTitle: "Publication / research title",
  publicationPharmaInterventions: "Pharmaceutical / drug administration involved",
  publicationObjective1: "Objective 1",
  publicationObjective2: "Objective 2",
  publicationObjective3: "Objective 3",
  publicationMethodology: "Methodology",
  publicationParticipantsEstimate: "Participants estimate",
  publicationPopulationType: "Population type",
  publicationHumanSubjects: "Human subjects",
  publicationRecruitmentChannels: "Recruitment",
  publicationInformedConsent: "Informed consent",
  publicationDeclarationAccepted: "Declaration accepted",
  projectTitle: "Project title",
  projectObjectives: "Project objectives",
  researcherName: "Researcher name",
  discipline: "Discipline",
  coSupervisorName: "Co-supervisor name",
  expectedResponseDays: "Expected response (days)",
  classification: "Classification",
  recruitmentMethod: "Recruitment method",
  consentProcess: "Consent process",
  confidentiality: "Confidentiality",
  riskMitigation: "Risk mitigation",
  biomedicalDetails: "Biomedical details",
  dataStorageMethod: "Data storage",
  cloudServices: "Cloud services",
  retentionPeriod: "Retention period",
  accessToData: "Access to data",
  dataSecurity: "Data security",
  futureDataUse: "Future data use",
  researchSetting: "Research setting",
  fundingSource: "Funding source",
  approvalsDetails: "Approvals details",
  researchDiscipline: "Research discipline",
  researchClassification: "Research classification (selected)",
  researchRiskLevel: "Research risk level",
  researchRiskJustification: "Research risk justification",
  drugName: "Drug name",
  drugDosageFrequency: "Dosage / frequency",
  drugKnownSideEffects: "Known side effects",
  drugRegulatoryApproval: "Regulatory approval",
  drugAdministrationRoutes: "Administration routes",
  monitoredAfterAdministration: "Monitoring after administration",
  followUpDuration: "Follow-up duration",
  emergencyProcedures: "Emergency procedures",
  dataProtectionOptions: "Data protection options",
  dataProtectionOtherDetails: "Data protection (other)",
  sharedWithThirdParties: "Will data be shared with third parties, collaborators, or external institutions?",
  thirdPartySharingDetails: "Third-party sharing details",
  cloudPlatformsUsed: "Cloud platforms used",
  cloudPlatformDetails: "Cloud platform details",
  futureResearchDataUse: "Future research data use",
  futureResearchDataUseConditions: "Future use conditions", 
  healthcareExternalInstitutions: "External healthcare institutions",
  thesisBiologicalSpecimensInvolved: "Biological specimens involved",
  thesisBiologicalSpecimensDetails: "Biological specimen handling",
  thesisAnimalSubjectsUsed: "Animal subjects used",
  thesisAnimalCareWelfareDetails: "Animal care / welfare",
  thesisAnimalEthicsCommitteeApproval: "Animal ethics committee approval",
};

function labelForKey(key: string): string {
  return LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
}

function getFormValue(form: Record<string, unknown>, key: string): unknown {
  return form[key];
}

function formatValue(key: string, raw: unknown): string {
  if (raw == null) return "—";
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (typeof raw === "number") return String(raw);
  if (typeof raw !== "string") {
    try {
      return JSON.stringify(raw, null, 2);
    } catch {
      return String(raw);
    }
  }
  const s = raw.trim();
  if (!s) return "—";
  if (
    key === "sdgs" ||
    key === "researchPurpose" ||
    key === "recruitmentChannels" ||
    key === "confidentialityOptions" ||
    key === "sensitiveTopicTypes" ||
    key === "requiredAttachments" ||
    key === "publicationRecruitmentChannels" ||
    key === "researchClassification" ||
    key === "researchPopulation" ||
    key === "vulnerableGroups" ||
    key === "drugAdministrationRoutes" ||
    key === "dataProtectionOptions"
  ) {
    const parts = s
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length <= 1) return escapeHtml(s);
    return `<ul class="pipe-list">${parts.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`;
  }
  if (s.length > 200 && (key.includes("Objective") || key.includes("methodology") || key === "declaration")) {
    return `<div class="block">${escapeHtml(s)}</div>`;
  }
  return escapeHtml(s);
}

type SectionDef = { title: string; keys: string[] };

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
  const pre = getFormValue(form, "preApprovalDataCollected");
  const pubPre = getFormValue(form, "publicationPreApprovalDataCollected");
  return pre === "Yes" || pubPre === "Yes";
}

function shouldIncludeReportKey(key: string, form: Record<string, unknown>): boolean {
  if (!INFORMED_CONSENT_KEYS.includes(key)) return true;
  return preApprovalInformedConsentApplies(form);
}

const THESIS_SCHOLAR: SectionDef = {
  title: "Step 1 · Scholar's information",
  keys: [
    "scholarName",
    "scholarSapId",
    "scholarEmail",
    "scholarFaculty",
    "scholarDepartment",
    "scholarProgram",
  ],
};

const THESIS_SUPERVISOR: SectionDef = {
  title: "Step 1 · Supervisor",
  keys: [
    "supervisorSapId",
    "supervisorName",
    "supervisorEmail",
    "supervisorFaculty",
    "supervisorDepartment",
  ],
};

const THESIS_COSUP: SectionDef = {
  title: "Step 1 · Co-supervisor",
  keys: [
    "coSupervisorType",
    "uolCoSupervisorSapId",
    "uolCoSupervisorName",
    "uolCoSupervisorEmail",
    "uolCoSupervisorFaculty",
    "uolCoSupervisorDepartment",
    "externalCoSupervisorName",
    "externalCoSupervisorRegNo",
    "externalCoSupervisorEmail",
    "externalUniversity",
    "externalFaculty",
    "externalDepartment",
  ],
};

const THESIS_PROJECT: SectionDef = {
  title: "Step 1 · Thesis / project details",
  keys: [
    "thesisTitle",
    "researchDiscipline",
    "expectedStartDate",
    "expectedEndDate",
    "researchLocations",
    "fundingSource",
    "researchObjective1",
    "researchObjective2",
    "researchObjective3",
    "researchObjective4",
    "sdgs",
    "researchPurpose",
    "researchClassification",
    "dataCollectionMethod",
    "researchPopulation",
    "methodology",
    "participantsEstimate",
  ],
};

const ETHICAL_KEYS: string[] = [
  "involveHumanParticipants",
  "collectPii",
  "piiTypes",
  "recruitmentChannels",
  "informedConsentType",
  "preApprovalDataCollected",
  "canWithdraw",
  "compensation",
  "confidentialityOptions",
  "confidentialityOtherDetails",
  "vulnerablePopulation",
  "vulnerableSafeguards",
  "sensitiveTopics",
  "sensitiveTopicTypes",
  "sensitiveTopicOtherDetails",
  "potentialRisks",
  "potentialRiskDetails",
  "dataRetentionYears",
  "longRetentionReason",
  "conflictOfInterest",
  "conflictManagement",
  "recordsWithoutConsent",
  "recordsWithoutConsentJustification",
  ...INFORMED_CONSENT_KEYS,
];

/** Form #3 Medical — Step 2 (matches Word Ethical Considerations section). */
const MEDICAL_THESIS_ETHICAL_KEYS: string[] = [
  "involveHumanParticipants",
  "collectPii",
  "piiName",
  "piiEmailPhone",
  "piiStudentEmployeeId",
  "piiMedicalRecordNumber",
  "piiAudioVideoRecordings",
  "piiOther",
  "recruitmentChannels",
  "informedConsentType",
  "preApprovalDataCollected",
  "vulnerableGroups",
  "canWithdraw",
  "compensation",
  "adverseEventsManagement",
  "thesisBiologicalSpecimensInvolved",
  "thesisBiologicalSpecimensDetails",
  "researchRiskLevel",
  "researchRiskJustification",
  "potentialRiskDetails",
  "conflictOfInterest",
  "conflictManagement",
  ...INFORMED_CONSENT_KEYS,
];

const MEDICAL_THESIS_ETHICAL: SectionDef = {
  title: "Step 2 · Ethical considerations (Medical thesis)",
  keys: MEDICAL_THESIS_ETHICAL_KEYS,
};

const THESIS_ETHICAL: SectionDef = {
  title: "Step 2 · Ethical considerations",
  keys: ETHICAL_KEYS,
};

const THESIS_INSTITUTIONAL: SectionDef = {
  title: "Step 3 · Institutional approvals & collaboration",
  keys: [
    "institutionalFunding",
    "externalFunding",
    "externalFundingSource",
    "internationalCollaboration",
    "internationalCollaborationDetails",
    "conductedAbroad",
  ],
};

const FORM3_INSTITUTIONAL: SectionDef = {
  title: "Step 5 · Institutional approvals & collaborations",
  keys: [
    "healthcareExternalInstitutions",
    "institutionalFunding",
    "externalFunding",
    "externalFundingSource",
    "internationalCollaboration",
    "internationalCollaborationDetails",
    "conductedAbroad",
  ],
};

const FORM3_BIOMEDICAL: SectionDef = {
  title: "Step 3 · Biomedical & pharmaceutical aspects",
  keys: [
    "publicationPharmaInterventions",
    "drugName",
    "drugDosageFrequency",
    "drugKnownSideEffects",
    "drugRegulatoryApproval",
    "drugAdministrationRoutes",
    "monitoredAfterAdministration",
    "followUpDuration",
    "emergencyProcedures",
    "thesisAnimalSubjectsUsed",
    "thesisAnimalCareWelfareDetails",
    "thesisAnimalEthicsCommitteeApproval",
  ],
};

const FORM3_DATA: SectionDef = {
  title: "Step 4 · Data management",
  keys: [
    "dataStorageMethod",
    "dataProtectionOptions",
    "dataProtectionOtherDetails",
    "sharedWithThirdParties",
    "thirdPartySharingDetails",
    "cloudPlatformsUsed",
    "cloudPlatformDetails",
    "futureResearchDataUse",
    "futureResearchDataUseConditions",
    "healthcareExternalInstitutions",
  ],
};

const THESIS_DECLARATION: SectionDef = {
  title: "Step 5 · Declaration & submission",
  keys: ["declaration", "declarationAccepted", "applicantName", "submissionDate", "form3DeclarationAccepted"],
};

const GENERIC_STEPPER: SectionDef = {
  title: "Research application",
  keys: [
    "researcherName",
    "discipline",
    "supervisorName",
    "coSupervisorName",
    "projectTitle",
    "projectObjectives",
    "expectedResponseDays",
    "classification",
    "recruitmentMethod",
    "consentProcess",
    "confidentiality",
    "riskMitigation",
    "biomedicalDetails",
    "dataStorageMethod",
    "cloudServices",
    "retentionPeriod",
    "accessToData",
    "dataSecurity",
    "futureDataUse",
    "researchSetting",
    "fundingSource",
    "approvalsDetails",
    "declaration",
    "applicantName",
    "submissionDate",
  ],
};

const PUBLICATION_SCHOLAR: SectionDef = {
  title: "Step 1 · Scholar & publication",
  keys: [
    "scholarName",
    "scholarSapId",
    "scholarEmail",
    "scholarFaculty",
    "scholarDepartment",
    "scholarProgram",
    "publicationTitle",
    "publicationObjective1",
    "publicationObjective2",
    "publicationObjective3",
    "publicationMethodology",
    "publicationParticipantsEstimate",
    "publicationPopulationType",
  ],
};

const PUBLICATION_ETHICAL: SectionDef = {
  title: "Step 2 · Ethical considerations",
  keys: [
    "publicationHumanSubjects",
    "publicationRecruitmentChannels",
    "publicationInformedConsent",
    "preApprovalDataCollected",
    "publicationPreApprovalDataCollected",
    "publicationCanWithdraw",
    "publicationCompensation",
    "publicationAnonymized",
    "publicationSensitiveHealthTopics",
    "publicationVulnerablePopulation",
    "publicationVulnerableProtections",
    "publicationBiologicalSpecimens",
    "publicationBiologicalSpecimenDetails",
    "publicationPharmaInterventions",
    "publicationPharmaInterventionDetails",
    "publicationAnimalSubjects",
    "publicationAnimalWelfareDetails",
    "publicationAnimalEthicsApproval",
    "publicationConflictsUndisclosed",
    "publicationConflictDisclosureDetails",
    "publicationPotentialRisks",
    "publicationSimultaneousJournals",
    "publicationPreviouslyPublished",
    "publicationDataAccurate",
    "publicationReportingGuidelines",
    "publicationAdverseEventsReported",
    "publicationThirdPartyPermissions",
    "publicationThirdPartyPermissionDetails",
    ...INFORMED_CONSENT_KEYS,
  ],
};

const PUBLICATION_COAUTHORS: SectionDef = {
  title: "Authors & collaborators",
  keys: [
    "coauthorSapId",
    "coauthorName",
    "coauthorEmail",
    "coauthorFaculty",
    "coauthorDepartment",
    "publicationCoAuthor1Type",
    "publicationAuthor1UolSapId",
    "publicationAuthor1UolName",
    "publicationAuthor1UolEmail",
    "publicationAuthor1UolFaculty",
    "publicationAuthor1UolDepartment",
    "publicationAuthor1ExternalName",
    "publicationAuthor1ExternalEmail",
    "publicationAuthor1ExternalUniversity",
    "publicationAuthor1ExternalFaculty",
    "publicationAuthor1ExternalDepartment",
    "publicationCoAuthor2Type",
    "publicationAuthor2UolSapId",
    "publicationAuthor2UolName",
    "publicationAuthor2UolEmail",
    "publicationAuthor2UolFaculty",
    "publicationAuthor2UolDepartment",
    "publicationAuthor2ExternalName",
    "publicationAuthor2ExternalEmail",
    "publicationAuthor2ExternalUniversity",
    "publicationAuthor2ExternalFaculty",
    "publicationAuthor2ExternalDepartment",
    "publicationCoAuthor3Type",
    "publicationAuthor3UolSapId",
    "publicationAuthor3UolName",
    "publicationAuthor3UolEmail",
    "publicationAuthor3UolFaculty",
    "publicationAuthor3UolDepartment",
    "publicationAuthor3ExternalName",
    "publicationAuthor3ExternalEmail",
    "publicationAuthor3ExternalUniversity",
    "publicationAuthor3ExternalFaculty",
    "publicationAuthor3ExternalDepartment",
    "hasExternalResearcher",
    "externalResearcherDetails",
  ],
};

const PUBLICATION_INSTITUTIONAL: SectionDef = {
  title: "Institutional approvals & collaboration",
  keys: [
    "institutionalFunding",
    "externalFunding",
    "externalFundingSource",
    "internationalCollaboration",
    "internationalCollaborationDetails",
    "conductedAbroad",
  ],
};

const PUBLICATION_DECLARATION: SectionDef = {
  title: "Declaration & submission",
  keys: ["declaration", "publicationDeclarationAccepted", "applicantName", "submissionDate"],
};

function sectionsForFormId(formId: ApprovalFormId | null): SectionDef[] {
  switch (formId) {
    case "form1-thesis-non-medical":
      return [
        THESIS_SCHOLAR,
        THESIS_SUPERVISOR,
        THESIS_COSUP,
        THESIS_PROJECT,
        THESIS_ETHICAL,
        THESIS_INSTITUTIONAL,
        THESIS_DECLARATION,
      ];
    case "form3-thesis-medical":
      return [
        THESIS_SCHOLAR,
        THESIS_SUPERVISOR,
        THESIS_COSUP,
        THESIS_PROJECT,
        MEDICAL_THESIS_ETHICAL,
        FORM3_BIOMEDICAL,
        FORM3_DATA,
        FORM3_INSTITUTIONAL,
        {
          title: "Step 6 · Declaration & submission",
          keys: THESIS_DECLARATION.keys,
        },
      ];
    case "form2-publication-non-medical":
    case "form4-publication-medical":
    case "form5-publication-faculty-staff":
      return [
        PUBLICATION_SCHOLAR,
        PUBLICATION_ETHICAL,
        PUBLICATION_COAUTHORS,
        PUBLICATION_INSTITUTIONAL,
        PUBLICATION_DECLARATION,
      ];
    default:
      return [GENERIC_STEPPER];
  }
}

function collectUsedKeys(sections: SectionDef[]): Set<string> {
  const s = new Set<string>();
  for (const sec of sections) {
    for (const k of sec.keys) s.add(k);
  }
  return s;
}

function renderDlRow(key: string, form: Record<string, unknown>): string | null {
  const raw = getFormValue(form, key);
  if (raw == null || (typeof raw === "string" && !raw.trim())) return null;
  const val = formatValue(key, raw);
  return `<div class="row"><dt>${escapeHtml(labelForKey(key))}</dt><dd>${val}</dd></div>`;
}

function renderSection(section: SectionDef, form: Record<string, unknown>): string {
  const rows: string[] = [];
  for (const key of section.keys) {
    if (!shouldIncludeReportKey(key, form)) continue;
    const row = renderDlRow(key, form);
    if (row) rows.push(row);
  }
  if (rows.length === 0) return "";
  return `<section class="sec"><h2>${escapeHtml(section.title)}</h2><dl class="grid">${rows.join("")}</dl></section>`;
}

function renderAttachmentsSection(
  attachmentFiles: Record<string, string>,
  extras: string[],
): string {
  const rows: string[] = [];
  for (const [label, name] of Object.entries(attachmentFiles)) {
    if (!name?.trim()) continue;
    rows.push(
      `<div class="row"><dt>${escapeHtml(label)}</dt><dd><span class="file-name">${escapeHtml(name)}</span></dd></div>`,
    );
  }
  extras.forEach((name, i) => {
    if (name?.trim()) {
      rows.push(
        `<div class="row"><dt>${escapeHtml(`Additional upload ${i + 1}`)}</dt><dd><span class="file-name">${escapeHtml(name)}</span></dd></div>`,
      );
    }
  });
  if (rows.length === 0) return "";
  return `<section class="sec"><h2>Required attachments & uploads</h2><dl class="grid">${rows.join("")}</dl><p class="hint">File names as selected in the application. Binary files are not stored on the server.</p></section>`;
}

function renderOrphans(form: Record<string, unknown>, used: Set<string>): string {
  const orphans: string[] = [];
  for (const key of Object.keys(form).sort()) {
    if (used.has(key)) continue;
    if (!shouldIncludeReportKey(key, form)) continue;
    const row = renderDlRow(key, form);
    if (row) orphans.push(row);
  }
  if (orphans.length === 0) return "";
  return `<section class="sec"><h2>Additional fields</h2><dl class="grid">${orphans.join("")}</dl></section>`;
}

/**
 * Builds a standalone HTML document: clean, print-friendly report of the ethical application
 * (all major stepper sections + attachment file names).
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
  const sections = sectionsForFormId(formId);
  const used = collectUsedKeys(sections);

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

  const title = sub.title?.trim() || "Ethical review application";
  const status = sub.current_status?.replace(/_/g, " ") ?? "—";

  const bodySections = [
    ...sections.map((s) => renderSection(s, form)).filter(Boolean),
    renderAttachmentsSection(attachmentFiles, extras),
    renderOrphans(form, used),
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
      --accent: #0d9488;
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
      .sheet { box-shadow: none; border: none; max-width: none; padding: 0; }
    }
    .head { margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--line); }
    h1 {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      margin: 0 0 0.5rem;
      line-height: 1.25;
    }
    .meta {
      display: grid;
      gap: 0.35rem 1.5rem;
      font-size: 0.875rem;
      color: var(--muted);
    }
    @media (min-width: 520px) {
      .meta { grid-template-columns: auto 1fr; }
    }
    .meta strong { color: var(--ink); font-weight: 600; }
    .badge {
      display: inline-block;
      font-family: ui-monospace, "Cascadia Code", monospace;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--accent);
      background: rgba(13, 148, 136, 0.08);
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      letter-spacing: 0.02em;
    }
    .summary {
      margin-top: 1rem;
      padding: 1rem 1.1rem;
      background: #f8fafc;
      border-radius: 10px;
      border: 1px solid var(--line);
      font-size: 0.9rem;
    }
    .summary h3 { margin: 0 0 0.5rem; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent); }
    .summary p { margin: 0; white-space: pre-wrap; }
    .sec { margin-top: 2rem; }
    .sec:first-of-type { margin-top: 1.25rem; }
    h2 {
      margin: 0 0 1rem;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--accent);
    }
    dl.grid { margin: 0; display: flex; flex-direction: column; gap: 0; }
    .row {
      display: grid;
      grid-template-columns: minmax(140px, 240px) 1fr;
      gap: 0.5rem 1.25rem;
      padding: 0.65rem 0;
      border-bottom: 1px solid #f1f5f9;
    }
    @media (max-width: 560px) {
      .row { grid-template-columns: 1fr; gap: 0.2rem; padding: 0.75rem 0; }
    }
    dt {
      margin: 0;
      font-size: 0.8rem;
      color: var(--muted);
      font-weight: 500;
    }
    dd { margin: 0; font-size: 0.9rem; }
    .block { white-space: pre-wrap; word-break: break-word; }
    ul.pipe-list { margin: 0.25rem 0 0; padding-left: 1.15rem; }
    ul.pipe-list li { margin: 0.15rem 0; }
    .file-name { font-family: ui-monospace, monospace; font-size: 0.85rem; }
    .hint { margin: 0.75rem 0 0; font-size: 0.78rem; color: var(--muted); }
    footer {
      margin-top: 2.5rem;
      padding-top: 1rem;
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
      <div class="meta">
        <span>Application ID</span><span><span class="badge">${escapeHtml(sub.application_id)}</span></span>
        <span>Status</span><span><strong>${escapeHtml(status)}</strong></span>
        <span>Submitted</span><span>${escapeHtml(submitted)}</span>
        ${sub.applicant_name ? `<span>Applicant</span><span><strong>${escapeHtml(sub.applicant_name)}</strong>${sub.applicant_email ? ` · ${escapeHtml(sub.applicant_email)}` : ""}</span>` : ""}
        ${sub.applicant_faculty ? `<span>Faculty / Dept</span><span>${escapeHtml(sub.applicant_faculty)}${sub.applicant_department ? ` · ${escapeHtml(sub.applicant_department)}` : ""}</span>` : ""}
      </div>
      ${
        sub.objectives?.trim()
          ? `<div class="summary"><h3>Research summary</h3><p>${escapeHtml(sub.objectives.trim())}</p></div>`
          : ""
      }
      ${
        sub.methodology?.trim()
          ? `<div class="summary" style="margin-top:0.75rem"><h3>Methodology (record)</h3><p>${escapeHtml(sub.methodology.trim())}</p></div>`
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
