/**
 * Maps a submitted application's flat `ethics.form` key/value payload back
 * into the same steps the applicant filled in the stepper, for the admin
 * dossier view.
 *
 * The step titles mirror the stepper's step headers per form type. Keys are
 * the camelCase field names used by the form components.
 */

export type FormStepSpec = {
  title: string;
  keys: string[];
};

// Keys rendered by the dedicated cards/sections instead of the step grids.
const IDENTITY_KEYS = new Set([
  "scholarName",
  "scholarSapId",
  "scholarEmail",
  "scholarFaculty",
  "scholarDepartment",
  "scholarProgram",
  "applicantName",
]);

const HOD_KEYS = new Set([
  "hodUserId",
  "hodDepartmentId",
  "hodName",
  "hodSapId",
  "hodEmail",
  "hodFaculty",
  "hodDepartment",
  "hodDesignation",
]);

/** Internal foreign keys — meaningful to the DB, noise to a reviewer. */
const INTERNAL_ID_KEYS = new Set([
  "supervisorUserId",
  "supervisorDepartmentId",
]);

const SPECIAL_KEYS = new Set([
  "requiredAttachments",
  "declarationAccepted",
  "form3DeclarationAccepted",
  "publicationDeclarationAccepted",
  // Generated declaration paragraph — template text, not applicant data.
  "declaration",
]);

export function isIdentityKey(key: string) {
  return IDENTITY_KEYS.has(key);
}
export function isHodKey(key: string) {
  return HOD_KEYS.has(key) || key.startsWith("hod");
}
export function isInternalIdKey(key: string) {
  return INTERNAL_ID_KEYS.has(key);
}
export function isSpecialKey(key: string) {
  return SPECIAL_KEYS.has(key);
}

/** Keys whose comma-separated values render better as chips than prose. */
const CHIP_KEYS = new Set([
  "sdgs",
  "researchPurpose",
  "dataCollectionMethod",
  "researchPopulation",
  "publicationPopulationType",
  "recruitmentChannels",
  "publicationRecruitmentChannels",
  "piiTypes",
  "confidentialityOptions",
  "dataProtectionOptions",
  "sensitiveTopicTypes",
]);

export function isChipKey(key: string) {
  return CHIP_KEYS.has(key);
}

// ─── Label overrides for cryptic camelCase keys ───

const LABEL_OVERRIDES: Record<string, string> = {
  thesisTitle: "Thesis / Project Title",
  publicationTitle: "Publication Title",
  expectedStartDate: "Expected Start Date",
  expectedEndDate: "Expected End Date",
  researchLocations: "Research Location(s)",
  sdgs: "Sustainable Development Goals",
  researchPurpose: "Purpose of Research",
  researchDiscipline: "Research Discipline",
  researchClassification: "Research Classification",
  dataCollectionMethod: "Data Collection Method(s)",
  researchPopulation: "Research Population",
  methodology: "Methodology",
  publicationMethodology: "Methodology",
  participantsEstimate: "Estimated Participants",
  publicationParticipantsEstimate: "Estimated Participants",
  publicationPopulationType: "Population Type",
  involveHumanParticipants: "Involves Human Participants",
  publicationHumanSubjects: "Involves Human Subjects",
  thesisSubjectType: "Subject Type",
  publicationSubjectType: "Subject Type",
  collectPii: "Collects Personally Identifiable Information",
  piiTypes: "PII Types Collected",
  piiOther: "Other PII",
  recruitmentChannels: "Recruitment Channels",
  publicationRecruitmentChannels: "Recruitment Channels",
  informedConsentType: "Informed Consent",
  publicationInformedConsent: "Informed Consent",
  preApprovalDataCollected: "Data Collected Before Ethical Approval",
  publicationPreApprovalDataCollected: "Data Collected Before Ethical Approval",
  canWithdraw: "Participants Can Withdraw at Any Time",
  publicationCanWithdraw: "Participants Can Withdraw at Any Time",
  compensation: "Participants Receive Compensation",
  publicationCompensation: "Participants Receive Compensation",
  confidentialityOptions: "Confidentiality Measures",
  confidentialityOtherDetails: "Other Confidentiality Measures",
  confidentialityOptionsOther: "Other Confidentiality Measures",
  vulnerablePopulation: "Involves Vulnerable Populations",
  publicationVulnerablePopulation: "Vulnerable Populations",
  vulnerableGroups: "Vulnerable Groups",
  vulnerableSafeguards: "Safeguards for Vulnerable Populations",
  publicationVulnerableProtections: "Protections for Vulnerable Populations",
  sensitiveTopics: "Addresses Sensitive Topics",
  sensitiveTopicTypes: "Sensitive Topic Types",
  sensitiveTopicOtherDetails: "Other Sensitive Topics",
  publicationSensitiveHealthTopics: "Sensitive Health Topics",
  publicationSensitiveTopicsDetails: "Sensitive Topics Details",
  potentialRisks: "Potential Risks to Participants",
  potentialRiskDetails: "Risk Details",
  publicationHasRisks: "Research Has Risks",
  publicationPotentialRisks: "Potential Risks",
  researchRiskLevel: "Research Risk Level",
  researchRiskJustification: "Risk Level Justification",
  conflictOfInterest: "Conflict of Interest",
  conflictManagement: "Conflict Management",
  publicationConflictsUndisclosed: "Undisclosed Conflicts",
  publicationConflictDisclosureDetails: "Conflict Disclosure Details",
  recordsWithoutConsent: "Uses Records Without Consent",
  recordsWithoutConsentJustification: "Justification for No Consent",
  dataRetentionYears: "Data Retention Period",
  longRetentionReason: "Reason for Long Retention",
  dataProtectionOptions: "Data Protection Measures",
  dataProtectionOtherDetails: "Other Data Protection Measures",
  sharedWithThirdParties: "Shared with Third Parties",
  thirdPartySharingDetails: "Third-Party Sharing Details",
  cloudPlatformsUsed: "Cloud Platforms Used",
  cloudPlatformDetails: "Cloud Platform Details",
  futureResearchDataUse: "Future Research Use of Data",
  futureResearchDataUseConditions: "Conditions for Future Use",
  institutionalFunding: "Institutional Funding",
  externalFunding: "External Funding",
  externalFundingSource: "External Funding Source",
  internationalCollaboration: "International Collaboration",
  internationalCollaborationDetails: "Collaboration Details",
  conductedAbroad: "Research Conducted Abroad",
  healthcareExternalInstitutions: "External Healthcare Institutions",
  healthcareExternalInstitutionsDetails: "External Institution Details",
  adverseEventsManagement: "Adverse Events Management",
  thesisBiologicalSpecimensInvolved: "Biological Specimens Involved",
  thesisBiologicalSpecimensDetails: "Specimen Details",
  publicationBiologicalSpecimens: "Biological Specimens",
  publicationBiologicalSpecimenDetails: "Specimen Details",
  publicationPharmaInterventions: "Pharmaceutical Interventions",
  publicationPharmaInterventionDetails: "Intervention Details",
  drugName: "Drug Name",
  drugDosageFrequency: "Drug Dosage / Frequency",
  drugKnownSideEffects: "Known Side Effects",
  drugRegulatoryApproval: "Drug Regulatory Approval",
  drugAdministrationRoutes: "Administration Routes",
  monitoredAfterAdministration: "Monitored After Administration",
  followUpDuration: "Follow-Up Duration",
  emergencyProcedures: "Emergency Procedures",
  thesisAnimalSubjectsUsed: "Animal Subjects Used",
  thesisAnimalCareWelfareDetails: "Animal Care & Welfare",
  thesisAnimalEthicsCommitteeApproval: "Animal Ethics Committee Approval",
  publicationAnimalSubjects: "Animal Subjects",
  publicationAnimalWelfareDetails: "Animal Welfare Details",
  publicationAnimalEthicsApproval: "Animal Ethics Approval",
  publicationAnonymized: "Data Anonymized",
  publicationPreviouslyPublished: "Previously Published",
  publicationSimultaneousJournals: "Submitted to Multiple Journals",
  publicationDataAccurate: "Data Accuracy Confirmed",
  publicationThirdPartyPermissions: "Third-Party Permissions",
  publicationThirdPartyPermissionDetails: "Permission Details",
  publicationReportingGuidelines: "Follows Reporting Guidelines",
  publicationAdverseEventsReported: "Adverse Events Reported",
  declarationAccepted: "Declaration Accepted",
  form3DeclarationAccepted: "Declaration Accepted",
  publicationDeclarationAccepted: "Declaration Accepted",
};

export function fieldLabel(key: string): string {
  const override = LABEL_OVERRIDES[key];
  if (override) return override;
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

// ─── Step specs per form ───

const CO_PERSON_KEYS = [
  "coHodType",
  "uolCoHodSapId",
  "uolCoHodName",
  "uolCoHodEmail",
  "uolCoHodFaculty",
  "uolCoHodDepartment",
  "externalCoHodName",
  "externalCoHodRegNo",
  "externalCoHodEmail",
  "externalUniversity",
  "externalFaculty",
  "externalDepartment",
];

const coAuthorKeys = (n: number) => [
  `publicationCoAuthor${n}Type`,
  `publicationAuthor${n}UolSapId`,
  `publicationAuthor${n}UolName`,
  `publicationAuthor${n}UolEmail`,
  `publicationAuthor${n}UolFaculty`,
  `publicationAuthor${n}UolDepartment`,
  `publicationAuthor${n}ExternalName`,
  `publicationAuthor${n}ExternalEmail`,
  `publicationAuthor${n}ExternalUniversity`,
  `publicationAuthor${n}ExternalFaculty`,
  `publicationAuthor${n}ExternalDepartment`,
];

const PUBLICATION_CO_AUTHOR_KEYS = [
  ...coAuthorKeys(1),
  ...coAuthorKeys(2),
  ...coAuthorKeys(3),
];

const STEP1_THESIS = [
  "thesisTitle",
  "researchDiscipline",
  "researchClassification",
  "expectedStartDate",
  "expectedEndDate",
  "researchLocations",
  "sdgs",
  "researchPurpose",
  "dataCollectionMethod",
  "researchPopulation",
  "methodology",
  "participantsEstimate",
  "researchObjective1",
  "researchObjective2",
  "researchObjective3",
  "researchObjectivesExtras",
  "expectedResponseDays",
  "coSupervisorType",
  "supervisorName",
  "supervisorSapId",
  "supervisorEmail",
  "supervisorDepartment",
  "supervisorDesignation",
  ...CO_PERSON_KEYS,
  ...PUBLICATION_CO_AUTHOR_KEYS,
];

const STEP1_PUBLICATION = [
  "publicationTitle",
  "sdgs",
  "publicationPopulationType",
  "publicationParticipantsEstimate",
  "publicationMethodology",
  "publicationObjective1",
  "publicationObjective2",
  "publicationObjective3",
  "publicationObjectivesExtras",
  "expectedResponseDays",
  ...CO_PERSON_KEYS,
  ...PUBLICATION_CO_AUTHOR_KEYS,
];

const INSTITUTIONAL_KEYS = [
  "healthcareExternalInstitutions",
  "healthcareExternalInstitutionsDetails",
  "institutionalFunding",
  "externalFunding",
  "externalFundingSource",
  "internationalCollaboration",
  "internationalCollaborationDetails",
  "conductedAbroad",
];

const FORM_STEPS: Record<string, FormStepSpec[]> = {
  "form1-thesis-non-medical": [
    { title: "Researcher(s) and Thesis/Project Information", keys: STEP1_THESIS },
    {
      title: "Ethical Considerations",
      keys: [
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
      ],
    },
    { title: "Institutional Approvals & Collaboration", keys: INSTITUTIONAL_KEYS },
    { title: "Required Attachments", keys: ["requiredAttachments"] },
    { title: "Declaration and Submission", keys: ["declarationAccepted"] },
  ],
  "form3-thesis-medical": [
    { title: "Researcher(s) and Thesis/Project Information", keys: STEP1_THESIS },
    {
      title: "Ethical Considerations",
      keys: [
        "thesisSubjectType",
        "involveHumanParticipants",
        "collectPii",
        "piiTypes",
        "piiOther",
        "piiName",
        "piiMedicalRecordNumber",
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
    },
    {
      title: "Data Management",
      keys: [
        "dataProtectionOptions",
        "dataProtectionOtherDetails",
        "sharedWithThirdParties",
        "thirdPartySharingDetails",
        "cloudPlatformsUsed",
        "cloudPlatformDetails",
        "futureResearchDataUse",
        "futureResearchDataUseConditions",
        "dataRetentionYears",
        "longRetentionReason",
      ],
    },
    { title: "Institutional Approvals & Collaborations", keys: INSTITUTIONAL_KEYS },
    { title: "Required Attachments", keys: ["requiredAttachments"] },
    { title: "Declaration and Submission", keys: ["form3DeclarationAccepted"] },
  ],
  "form2-publication-non-medical": [
    { title: "Scholar's Information", keys: STEP1_PUBLICATION },
    {
      title: "Ethical Considerations",
      keys: [
        "publicationHumanSubjects",
        "publicationRecruitmentChannels",
        "publicationInformedConsent",
        "preApprovalDataCollected",
        "canWithdraw",
        "compensation",
        "confidentialityOptions",
        "vulnerablePopulation",
      ],
    },
    { title: "Institutional Approvals & Collaboration", keys: INSTITUTIONAL_KEYS },
    { title: "Required Attachments", keys: ["requiredAttachments"] },
    { title: "Declaration and Submission", keys: ["form3DeclarationAccepted"] },
  ],
  "form4-publication-medical": [
    { title: "Scholar's Information", keys: STEP1_PUBLICATION },
    {
      title: "Ethical Considerations",
      keys: [
        "publicationSubjectType",
        "publicationHumanSubjects",
        "publicationRecruitmentChannels",
        "publicationInformedConsent",
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
      ],
    },
    {
      title: "Data Integrity and Permissions",
      keys: [
        "publicationDataAccurate",
        "publicationThirdPartyPermissions",
        "publicationThirdPartyPermissionDetails",
      ],
    },
    { title: "Institutional Approvals & Collaboration", keys: INSTITUTIONAL_KEYS },
    { title: "Required Attachments", keys: ["requiredAttachments"] },
    { title: "Declaration and Submission", keys: ["publicationDeclarationAccepted"] },
  ],
  "form5-publication-faculty-staff": [
    { title: "Scholar's Information", keys: STEP1_PUBLICATION },
    {
      title: "Ethical Considerations",
      keys: ["publicationHumanSubjects", "publicationInformedConsent"],
    },
    { title: "Data Integrity and Permissions", keys: ["publicationDataAccurate"] },
    { title: "Institutional Approvals & Collaboration", keys: INSTITUTIONAL_KEYS },
    { title: "Required Attachments", keys: ["requiredAttachments"] },
    { title: "Declaration and Submission", keys: ["form3DeclarationAccepted"] },
  ],
  "form6-publication-faculty-non-medical": [
    { title: "Scholar's Information", keys: STEP1_PUBLICATION },
    {
      title: "Ethical Considerations",
      keys: [
        "publicationHumanSubjects",
        "publicationRecruitmentChannels",
        "publicationInformedConsent",
        "preApprovalDataCollected",
        "canWithdraw",
        "compensation",
        "confidentialityOptions",
        "confidentialityOptionsOther",
        "vulnerablePopulation",
        "publicationSensitiveHealthTopics",
        "publicationSensitiveTopicsDetails",
        "dataRetentionYears",
        "longRetentionReason",
        "publicationSimultaneousJournals",
        "publicationConflictsUndisclosed",
        "publicationConflictDisclosureDetails",
        "publicationHasRisks",
        "publicationPotentialRisks",
        "publicationThirdPartyPermissions",
        "publicationThirdPartyPermissionDetails",
      ],
    },
    { title: "Institutional Approvals & Collaboration", keys: INSTITUTIONAL_KEYS },
    { title: "Required Attachments", keys: ["requiredAttachments"] },
    { title: "Declaration and Submission", keys: ["form3DeclarationAccepted"] },
  ],
  "form7-publication-faculty-staff-medical": [
    { title: "Scholar's Information", keys: STEP1_PUBLICATION },
    {
      title: "Ethical Considerations",
      keys: [
        "publicationHumanSubjects",
        "publicationRecruitmentChannels",
        "publicationInformedConsent",
        "publicationPreApprovalDataCollected",
        "publicationAnonymized",
        "publicationCanWithdraw",
        "publicationCompensation",
        "publicationSensitiveHealthTopics",
        "publicationVulnerablePopulation",
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
      ],
    },
    {
      title: "Data Integrity and Permissions",
      keys: [
        "publicationDataAccurate",
        "publicationReportingGuidelines",
        "publicationAdverseEventsReported",
        "publicationThirdPartyPermissions",
        "publicationThirdPartyPermissionDetails",
      ],
    },
    { title: "Institutional Approvals & Collaboration", keys: INSTITUTIONAL_KEYS },
    { title: "Required Attachments", keys: ["requiredAttachments"] },
    { title: "Declaration and Submission", keys: ["form3DeclarationAccepted"] },
  ],
};

export function getFormSteps(formId: string | null | undefined): FormStepSpec[] | null {
  if (!formId) return null;
  return FORM_STEPS[formId] ?? null;
}

// ─── Value helpers shared by server + client renderers ───

export function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value.trim() || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).join(", ") || "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

/** Multi-select values are joined with "|" because option labels contain commas. */
export function csvItems(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => formatValue(v)).filter(Boolean);
  if (typeof value !== "string") return [];
  return value
    .split(/[|\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
