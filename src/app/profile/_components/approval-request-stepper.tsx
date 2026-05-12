"use client";

import { cn } from "@/lib/utils";
import {
  inferFormIdFromLegacyRequiredForm,
  type RequiredForm,
} from "@/app/profile/_components/forms/form-registry";
import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Form1ThesisForm,
  FORM_1_REQUIRED_ATTACHMENTS,
  hasForm1CoSupervisorEntry,
} from "./forms/form1-thesis-form";
import { RequiredFieldsBanner } from "./forms/form-ui";
import {
  Form4ResearchPublicationMedicalForm,
  FORM_4_MANDATORY_ATTACHMENT_LABELS,
} from "./forms/form4-research-publication-medical-form";
import { GenericApprovalForm } from "./forms/generic-approval-form";
import {
  FORM_3_MANDATORY_ATTACHMENTS,
  Form3ThesisMedicalForm,
  FORM_3_REQUIRED_ATTACHMENTS as FORM_3_MEDICAL_ATTACHMENT_LABELS,
} from "./forms/form3-thesis-medical-form";
import { Form2ResearchPublicationForm } from "./forms/form2-research-publication-form";
import { Form5ResearchPublicationFacultyStaffForm } from "./forms/form5-research-publication-faculty-staff";
import { Form6ResearchPublicationFacultyNonMedicalForm } from "./forms/form6-research-publication-faculty-non-medical-form";
import { Form7ResearchPublicationFacultyStaffMedicalSciencesForm } from "./forms/form7-research-publication-faculty-staff-medical-sciences-form";
import {
  shortenToastLabel,
  validateRequiredMarkFields,
  REQUIRED_CONTROL_SELECTOR,
} from "@/lib/validate-required-mark-fields";
import {
  requiredMarkField,
  requiredRadioGroupProps,
  requiredSelectionGroupProps,
  allInlineRequiredProps,
  ignoreRequiredValidationProps,
} from "./forms/form-validation-mark";
import { Required } from "./forms/required";

type RequestPayload = {
  title: string;
  objectives: string;
  methodology: string;
  type: "thesis" | "publication";
  domain: "medical" | "non_medical";
  ethics: Record<string, unknown>;
  /** When submitting, promotes this existing draft row to submitted. */
  draftSubmissionId?: number;
};

export type SubmissionFileBundle = {
  requiredByLabel: Record<string, File>;
  extraByIndex: Record<number, File>;
};

type ApprovalRequestStepperProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    payload: RequestPayload,
    fileBundle?: SubmissionFileBundle,
  ) => Promise<{ ok: boolean; error?: string }>;
  mode?: "create" | "view" | "edit" | "resume";
  submissionMeta?: Record<string, unknown> | null;
  viewSubmissionData?: {
    form?: Record<string, unknown>;
    attachmentFiles?: Record<string, unknown>;
    extraUploadFiles?: unknown[];
    currentStep?: number;
    completedSteps?: number[];
  } | null;
  /** Server row id when a draft exists (first save creates it; Continue restores it). */
  serverDraftSubmissionId?: number | null;
  /** Persists stepper state to the server (Save Progress). */
  persistDraft?: (body: {
    title: string;
    objectives: string;
    methodology: string;
    type: "thesis" | "publication";
    domain: "medical" | "non_medical";
    ethics: Record<string, unknown>;
    applicantProfile: {
      name: string;
      sapId: string;
      email: string;
      faculty: string;
      department: string;
      program: string;
    };
  }) => Promise<{ ok: boolean; submissionId?: number; error?: string }>;
  onServerDraftSaved?: (submissionId: number) => void;
  applicantProfile?: {
    name: string;
    regNo: string;
    email: string;
    faculty: string;
    department: string;
    program: string;
  };
  requiredForm?: RequiredForm | null;
  /** Scopes browser drafts to this account (e.g. SAP ID). Required for create-mode autosave. */
  userStorageId?: string;
  /**
   * Parent generates a new id for each new application. Drafts only restore when this
   * matches the id stored with the saved draft (same session / same in-progress form).
   */
  draftSessionId?: string | null;
};

const STEPS = [
  "Researcher & Project Information",
  "Ethical Considerations",
  "Biomedical & Pharmaceutical Aspects",
  "Data Management",
  "Institutional Approvals & Collaboration",
  "Attachments",
  "Declaration & Submission",
];

const FORM_1_STEPS = [
  "Researcher(s) and Thesis/Project Information",
  "Ethical Considerations",
  "Institutional Approvals & Collaboration",
  "Required Attachments",
  "Declaration and Submission",
];

const FORM_4_STEPS = [
  "Scholar's Information",
  "Ethical Considerations",
  "Data Integrity and Permissions",
  "Institutional Approvals & Collaboration",
  "Required Attachments",
  "Declaration and Submission",
];

const FORM_3_MEDICAL_THESIS_STEPS = [
  "Researcher(s) and Thesis/Project Information",
  "Ethical Considerations",
  "Biomedical & Pharmaceutical Aspects",
  "Data Management",
  "Institutional Approvals & Collaborations",
  "Required Attachments",
  "Declaration and Submission",
];

const FORM_2_RESEARCH_PUBLICATION_STEPS = [
  "Scholar's Information",
  "Ethical Considerations",
  "Institutional Approvals & Collaboration",
  "Required Attachments",
  "Declaration and Submission",
];

const FORM_5_RESEARCH_PUBLICATION_FACULTY_STAFF_STEPS = [
  "Scholar's Information",
  "Ethical Considerations",
  "Data Integrity and Permissions",
  "Institutional Approvals & Collaboration",
  "Required Attachments",
  "Declaration and Submission",
];

const FORM_6_RESEARCH_PUBLICATION_FACULTY_NON_MEDICAL_STEPS = [
  "Scholar's Information",
  "Ethical Considerations",
  "Institutional Approvals & Collaboration",
  "Required Attachments",
  "Declaration and Submission",
];


const FORM_2_MANDATORY_ATTACHMENT_LABELS: readonly string[] = [
  "Questionnaire/Interview Guide",
];

const FORM_6_MANDATORY_ATTACHMENT_LABELS: readonly string[] = [
  "Questionnaire/Interview Guide",
];

const FORM_5_REQUIRED_ATTACHMENT_LABELS: readonly string[] = [
  "Questionnaire/Interview Guide",
  "Participant Consent Form",
  "Other Institutional Approval Letter(s) (If applicable)",
];

/** Same wording as Form #3 medical thesis Step 7 declaration checkbox */
function buildMedicalEthicsDeclarationParagraph(declarationName: string): string {
  return `I ${declarationName} hereby certify that: I have read and understood the ethical guidelines for medical and health sciences research. The information provided in this application is accurate and complete to the best of my knowledge. I will conduct this research strictly according to the approved protocol. I will report all adverse events and protocol deviations to my supervisor and the IREB immediately. I will obtain updated approvals if any significant changes to the protocol are necessary. I will not proceed with data collection without formal ethical approval.`;
}

const INITIAL_FORM = {
  researcherName: "",
  discipline: "",
  supervisorName: "",
  coSupervisorName: "",
  projectTitle: "",
  projectObjectives: "",
  expectedResponseDays: "2",
  classification: "",
  recruitmentMethod: "",
  consentProcess: "",
  confidentiality: "",
  riskMitigation: "",
  biomedicalDetails: "",
  dataStorageMethod: "",
  cloudServices: "",
  retentionPeriod: "",
  accessToData: "",
  dataSecurity: "",
  futureDataUse: "",
  researchSetting: "",
  fundingSource: "",
  approvalsDetails: "",
  declaration: "",
  applicantName: "",
  submissionDate: "",
  scholarName: "",
  scholarSapId: "",
  scholarEmail: "",
  scholarFaculty: "",
  scholarDepartment: "",
  scholarProgram: "",
  supervisorSapId: "",
  supervisorEmail: "",
  supervisorFaculty: "",
  supervisorDepartment: "",
  coSupervisorType: "UOL",
  uolCoSupervisorSapId: "",
  uolCoSupervisorName: "",
  uolCoSupervisorEmail: "",
  uolCoSupervisorFaculty: "",
  uolCoSupervisorDepartment: "",
  externalCoSupervisorName: "",
  externalCoSupervisorRegNo: "",
  externalCoSupervisorEmail: "",
  externalUniversity: "",
  externalFaculty: "",
  externalDepartment: "",
  thesisTitle: "",
  expectedStartDate: "",
  expectedEndDate: "",
  researchLocations: "",
  researchObjective1: "",
  researchObjective2: "",
  researchObjective3: "",
  researchObjective4: "",
  researchPurpose: "",
  dataCollectionMethod: "",
  researchPopulation: "",
  methodology: "",
  participantsEstimate: "",
  sdgs: "",
  involveHumanParticipants: "",
  collectPii: "",
  piiTypes: "",
  recruitmentChannels: "",
  informedConsentType: "",
  preApprovalDataCollected: "",
  canWithdraw: "",
  compensation: "",
  confidentialityOptions: "",
  confidentialityOtherDetails: "",
  vulnerablePopulation: "",
  vulnerableSafeguards: "",
  sensitiveTopics: "",
  sensitiveTopicTypes: "",
  sensitiveTopicOtherDetails: "",
  potentialRisks: "",
  potentialRiskDetails: "",
  dataRetentionYears: "",
  longRetentionReason: "",
  conflictOfInterest: "",
  conflictManagement: "",
  recordsWithoutConsent: "",
  recordsWithoutConsentJustification: "",
  institutionalFunding: "",
  externalFunding: "",
  internationalCollaboration: "",
  internationalCollaborationDetails: "",
  conductedAbroad: "",
  requiredAttachments: "",
  declarationAccepted: "",
  coauthorSapId: "",
  coauthorName: "",
  coauthorEmail: "",
  coauthorFaculty: "",
  coauthorDepartment: "",
  publicationCoAuthor1Type: "UOL",
  publicationAuthor1UolSapId: "",
  publicationAuthor1UolName: "",
  publicationAuthor1UolEmail: "",
  publicationAuthor1UolFaculty: "",
  publicationAuthor1UolDepartment: "",
  publicationAuthor1ExternalName: "",
  publicationAuthor1ExternalEmail: "",
  publicationAuthor1ExternalUniversity: "",
  publicationAuthor1ExternalFaculty: "",
  publicationAuthor1ExternalDepartment: "",
  publicationCoAuthor2Type: "UOL",
  publicationAuthor2UolSapId: "",
  publicationAuthor2UolName: "",
  publicationAuthor2UolEmail: "",
  publicationAuthor2UolFaculty: "",
  publicationAuthor2UolDepartment: "",
  publicationAuthor2ExternalName: "",
  publicationAuthor2ExternalEmail: "",
  publicationAuthor2ExternalUniversity: "",
  publicationAuthor2ExternalFaculty: "",
  publicationAuthor2ExternalDepartment: "",
  publicationCoAuthor3Type: "UOL",
  publicationAuthor3UolSapId: "",
  publicationAuthor3UolName: "",
  publicationAuthor3UolEmail: "",
  publicationAuthor3UolFaculty: "",
  publicationAuthor3UolDepartment: "",
  publicationAuthor3ExternalName: "",
  publicationAuthor3ExternalEmail: "",
  publicationAuthor3ExternalUniversity: "",
  publicationAuthor3ExternalFaculty: "",
  publicationAuthor3ExternalDepartment: "",
  hasExternalResearcher: "",
  externalResearcherDetails: "",
  publicationTitle: "",
  publicationObjective1: "",
  publicationObjective2: "",
  publicationObjective3: "",
  publicationObjective4: "",
  publicationParticipantsEstimate: "",
  publicationPopulationType: "",
  publicationMethodology: "",
  publicationHumanSubjects: "",
  publicationRecruitmentChannels: "",
  publicationInformedConsent: "",
  publicationPreApprovalDataCollected: "",
  publicationCanWithdraw: "",
  publicationCompensation: "",
  publicationAnonymized: "",
  publicationSensitiveHealthTopics: "",
  publicationVulnerablePopulation: "",
  publicationVulnerableProtections: "",
  publicationBiologicalSpecimens: "",
  publicationBiologicalSpecimenDetails: "",
  publicationPharmaInterventions: "",
  publicationPharmaInterventionDetails: "",
  publicationAnimalSubjects: "",
  publicationAnimalWelfareDetails: "",
  publicationAnimalEthicsApproval: "",
  publicationConflictsUndisclosed: "",
  publicationConflictDisclosureDetails: "",
  publicationPotentialRisks: "",
  publicationSimultaneousJournals: "",
  publicationPreviouslyPublished: "",
  publicationDataAccurate: "",
  publicationReportingGuidelines: "",
  publicationAdverseEventsReported: "",
  publicationThirdPartyPermissions: "",
  publicationThirdPartyPermissionDetails: "",
  publicationDeclarationAccepted: "",
  researchDiscipline: "",
  researchClassification: "",
  piiName: "",
  piiEmailPhone: "",
  piiStudentEmployeeId: "",
  piiMedicalRecordNumber: "",
  piiAudioVideoRecordings: "",
  piiOther: "",
  vulnerableGroups: "",
  adverseEventsManagement: "",
  researchRiskLevel: "",
  researchRiskJustification: "",
  drugName: "",
  drugDosageFrequency: "",
  drugKnownSideEffects: "",
  drugRegulatoryApproval: "",
  drugAdministrationRoutes: "",
  monitoredAfterAdministration: "",
  followUpDuration: "",
  emergencyProcedures: "",
  dataProtectionOptions: "",
  dataProtectionOtherDetails: "",
  sharedWithThirdParties: "",
  thirdPartySharingDetails: "",
  cloudPlatformsUsed: "",
  cloudPlatformDetails: "",
  futureResearchDataUse: "",
  futureResearchDataUseConditions: "",
  healthcareExternalInstitutions: "",
  form3DeclarationAccepted: "",
  thesisBiologicalSpecimensInvolved: "",
  thesisBiologicalSpecimensDetails: "",
  thesisAnimalSubjectsUsed: "",
  thesisAnimalCareWelfareDetails: "",
  thesisAnimalEthicsCommitteeApproval: "",
};

const LEGACY_DRAFT_KEY = "approval-request-stepper-draft";

function getDraftStorageKey(userStorageId: string): string {
  return `approval-request-stepper-draft:v1:${encodeURIComponent(userStorageId)}`;
}

type PersistedAttachmentMeta = { fileName: string; storageKey: string };

type DraftData = {
  form: typeof INITIAL_FORM;
  currentStep: number;
  completedSteps: number[];
  attachmentFiles: Record<string, string>;
  extraUploadFiles: string[];
  attachmentPersistedMeta?: Record<string, PersistedAttachmentMeta>;
  extraUploadPersistedMeta?: Record<string, PersistedAttachmentMeta>;
  savedAt: string;
};

type StoredDraftPayload = DraftData & { draftSessionId: string };

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function parseStoredDraft(raw: string): StoredDraftPayload | null {
  try {
    const parsed = JSON.parse(raw) as StoredDraftPayload;
    if (typeof parsed.draftSessionId !== "string" || typeof parsed.savedAt !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export default function ApprovalRequestStepper({
  open,
  onClose,
  onSubmit,
  mode = "create",
  submissionMeta = null,
  viewSubmissionData = null,
  applicantProfile,
  requiredForm = null,
  userStorageId = "",
  draftSessionId = null,
  serverDraftSubmissionId = null,
  persistDraft,
  onServerDraftSaved,
}: ApprovalRequestStepperProps) {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [form, setForm] = useState(INITIAL_FORM);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<Record<string, string>>({});
  const [attachmentPersistedMeta, setAttachmentPersistedMeta] = useState<
    Record<string, PersistedAttachmentMeta>
  >({});
  const [extraUploadFiles, setExtraUploadFiles] = useState<string[]>([]);
  const [extraUploadPersistedMeta, setExtraUploadPersistedMeta] = useState<
    Record<number, PersistedAttachmentMeta>
  >({});
  const attachmentFileBlobsRef = useRef<Partial<Record<string, File>>>({});
  const extraUploadFileBlobsRef = useRef<Map<number, File>>(new Map());
  const formElementRef = useRef<HTMLFormElement | null>(null);
  const restoredDraftKeyRef = useRef<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [facultyOptions, setFacultyOptions] = useState<string[]>([]);
  const [departmentsByFaculty, setDepartmentsByFaculty] = useState<Record<string, string[]>>({});
  const [resolvedDraftSubmissionId, setResolvedDraftSubmissionId] = useState<number | null>(
    typeof serverDraftSubmissionId === "number" && serverDraftSubmissionId > 0
      ? serverDraftSubmissionId
      : null,
  );
  const isViewMode = mode === "view";
  const isPreloadedMode = mode === "view" || mode === "edit" || mode === "resume";
  const revisionOfSubmissionId = parsePositiveInt(submissionMeta?.revisionOfSubmissionId);
  const isRevisionMode = mode === "edit" || revisionOfSubmissionId != null;

  const resolvedFormId =
    requiredForm?.id ?? inferFormIdFromLegacyRequiredForm(requiredForm ?? null);
  const isForm1Thesis = resolvedFormId === "form1-thesis-non-medical";
  const isForm3MedicalThesis = resolvedFormId === "form3-thesis-medical";
  const isForm4ResearchPublicationMedical = resolvedFormId === "form4-publication-medical";
  const isForm2ResearchPublication = resolvedFormId === "form2-publication-non-medical";
  const isForm5ResearchPublicationFacultyStaff =
    resolvedFormId === "form5-publication-faculty-staff";
  const isForm6ResearchPublicationFacultyNonMedical =
    resolvedFormId === "form6-publication-faculty-non-medical";
  const isForm7ResearchPublicationFacultyStaffMedical =
    resolvedFormId === "form7-publication-faculty-staff-medical";
  const formMode:
    | "form1-thesis"
    | "form3-thesis-medical"
    | "form2-research-publication"
    | "form5-research-publication-faculty-staff"
    | "form6-research-publication-faculty-non-medical"
    | "form7-research-publication-faculty-staff-medical"
    | "form4-research-publication-medical"
    | "generic" =
    (() => {
      switch (true) {
        case isForm1Thesis:
          return "form1-thesis";
        case isForm3MedicalThesis:
          return "form3-thesis-medical";
        case isForm2ResearchPublication:
          return "form2-research-publication";
        case isForm5ResearchPublicationFacultyStaff:
          return "form5-research-publication-faculty-staff";
        case isForm6ResearchPublicationFacultyNonMedical:
          return "form6-research-publication-faculty-non-medical";
        case isForm7ResearchPublicationFacultyStaffMedical:
          return "form7-research-publication-faculty-staff-medical";
        case isForm4ResearchPublicationMedical:
          return "form4-research-publication-medical";
        default:
          return "generic";
      }
    })();
  const activeSteps =
    formMode === "form1-thesis"
      ? FORM_1_STEPS
      : formMode === "form3-thesis-medical"
        ? FORM_3_MEDICAL_THESIS_STEPS
      : formMode === "form2-research-publication"
        ? FORM_2_RESEARCH_PUBLICATION_STEPS
      : formMode === "form5-research-publication-faculty-staff"
        ? FORM_5_RESEARCH_PUBLICATION_FACULTY_STAFF_STEPS
      : formMode === "form6-research-publication-faculty-non-medical"
        ? FORM_6_RESEARCH_PUBLICATION_FACULTY_NON_MEDICAL_STEPS
      : formMode === "form7-research-publication-faculty-staff-medical"
        ? FORM_5_RESEARCH_PUBLICATION_FACULTY_STAFF_STEPS
      : formMode === "form4-research-publication-medical"
        ? FORM_4_STEPS
        : STEPS;
  const renderActiveFormWrapper = (children: ReactNode) =>
    formMode === "form3-thesis-medical" ? (
      <>
        <RequiredFieldsBanner variant="marked-required" />
        {children}
      </>
    ) : (
      <GenericApprovalForm>{children}</GenericApprovalForm>
    );

  const stepState = useMemo(
    () =>
      activeSteps.map((_, index) => ({
        isActive: currentStep === index,
        isDone: completedSteps.has(index),
      })),
    [activeSteps, completedSteps, currentStep],
  );

  const DRAFT_PLACEHOLDER = "(Draft)";

  const getCoreTextFields = (forDraftSave: boolean) => {
    let title =
      formMode === "form1-thesis" || formMode === "form3-thesis-medical"
        ? form.thesisTitle.trim()
        : formMode === "form4-research-publication-medical" ||
            formMode === "form2-research-publication" ||
            formMode === "form5-research-publication-faculty-staff" ||
            formMode === "form6-research-publication-faculty-non-medical" ||
            formMode === "form7-research-publication-faculty-staff-medical"
          ? form.publicationTitle.trim()
          : form.projectTitle.trim();
    let objectives =
      formMode === "form1-thesis" || formMode === "form3-thesis-medical"
        ? [
            form.researchObjective1.trim(),
            form.researchObjective2.trim(),
            form.researchObjective3.trim(),
            form.researchObjective4.trim(),
          ]
            .filter(Boolean)
            .join("\n")
        : formMode === "form4-research-publication-medical" ||
            formMode === "form2-research-publication" ||
            formMode === "form5-research-publication-faculty-staff" ||
            formMode === "form6-research-publication-faculty-non-medical" ||
            formMode === "form7-research-publication-faculty-staff-medical"
          ? [
              form.publicationObjective1.trim(),
              form.publicationObjective2.trim(),
              form.publicationObjective3.trim(),
              form.publicationObjective4.trim(),
            ]
              .filter(Boolean)
              .join("\n")
          : form.projectObjectives.trim();
    let methodology =
      formMode === "form1-thesis" || formMode === "form3-thesis-medical"
        ? form.methodology.trim()
        : formMode === "form4-research-publication-medical" ||
            formMode === "form2-research-publication" ||
            formMode === "form5-research-publication-faculty-staff" ||
            formMode === "form6-research-publication-faculty-non-medical" ||
            formMode === "form7-research-publication-faculty-staff-medical"
          ? form.publicationMethodology.trim()
          : form.biomedicalDetails.trim() ||
            form.riskMitigation.trim() ||
            "Methodology not provided";

    if (forDraftSave) {
      if (!title) title = DRAFT_PLACEHOLDER;
      if (!objectives) objectives = DRAFT_PLACEHOLDER;
      if (!methodology || methodology === "Methodology not provided") {
        methodology = DRAFT_PLACEHOLDER;
      }
    }

    const type: "thesis" | "publication" =
      formMode === "form1-thesis" || formMode === "form3-thesis-medical" ? "thesis" : "publication";
    const domain: "medical" | "non_medical" =
      resolvedFormId === "form3-thesis-medical" ||
      resolvedFormId === "form4-publication-medical" ||
      resolvedFormId === "form7-publication-faculty-staff-medical"
        ? "medical"
        : "non_medical";

    return { title, objectives, methodology, type, domain };
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!mounted || !open || isPreloadedMode) return;

    const uid = userStorageId.trim();
    const sid = draftSessionId?.trim();
    if (!uid || !sid) return;
    const restoreKey = `${uid}::${sid}`;
    if (restoredDraftKeyRef.current === restoreKey) return;
    restoredDraftKeyRef.current = restoreKey;

    try {
      localStorage.removeItem(LEGACY_DRAFT_KEY);
    } catch {
      /* ignore */
    }

    const rawDraft = localStorage.getItem(getDraftStorageKey(uid));
    if (!rawDraft) return;

    const draft = parseStoredDraft(rawDraft);
    if (!draft || draft.draftSessionId !== sid) return;

    setForm({ ...INITIAL_FORM, ...draft.form });
    setCurrentStep(
      Number.isInteger(draft.currentStep)
        ? Math.max(0, Math.min(activeSteps.length - 1, draft.currentStep))
        : 0,
    );
    setCompletedSteps(new Set(draft.completedSteps ?? []));
    setAttachmentFiles(
      draft.attachmentFiles && typeof draft.attachmentFiles === "object"
        ? draft.attachmentFiles
        : {},
    );
    setAttachmentPersistedMeta(
      draft.attachmentPersistedMeta && typeof draft.attachmentPersistedMeta === "object"
        ? draft.attachmentPersistedMeta
        : {},
    );
    setExtraUploadFiles(Array.isArray(draft.extraUploadFiles) ? draft.extraUploadFiles : []);
    setExtraUploadPersistedMeta(() => {
      const raw = draft.extraUploadPersistedMeta;
      if (!raw || typeof raw !== "object") return {};
      const out: Record<number, PersistedAttachmentMeta> = {};
      for (const [k, v] of Object.entries(raw)) {
        const idx = Number.parseInt(k, 10);
        if (!Number.isInteger(idx) || !v || typeof v !== "object") continue;
        const o = v as PersistedAttachmentMeta;
        if (typeof o.fileName === "string" && typeof o.storageKey === "string") {
          out[idx] = { fileName: o.fileName, storageKey: o.storageKey };
        }
      }
      return out;
    });
    const restoredMessage = `Restored draft from ${new Date(draft.savedAt).toLocaleString()}`;
    setSaveMessage(restoredMessage);
    toast.info(restoredMessage);
  }, [activeSteps.length, draftSessionId, isPreloadedMode, mounted, open, userStorageId]);

  useEffect(() => {
    if (open) return;
    restoredDraftKeyRef.current = null;
  }, [open]);

  useEffect(() => {
    if (!open || isPreloadedMode) return;

    const uid = userStorageId.trim();
    const sid = draftSessionId?.trim();
    if (!uid || !sid) return;

    // Autosave draft so a remount/navigation doesn't wipe progress (e.g., after file picker interactions).
    const timer = window.setTimeout(() => {
      const payload: StoredDraftPayload = {
        draftSessionId: sid,
        form,
        currentStep,
        completedSteps: Array.from(completedSteps),
        attachmentFiles,
        extraUploadFiles,
        attachmentPersistedMeta,
        extraUploadPersistedMeta: Object.fromEntries(
          Object.entries(extraUploadPersistedMeta).map(([k, v]) => [String(k), v]),
        ),
        savedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(getDraftStorageKey(uid), JSON.stringify(payload));
      } catch {
        /* ignore quota / private mode */
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    attachmentFiles,
    attachmentPersistedMeta,
    completedSteps,
    currentStep,
    draftSessionId,
    extraUploadFiles,
    extraUploadPersistedMeta,
    form,
    isPreloadedMode,
    open,
    userStorageId,
  ]);

  useEffect(() => {
    if (!open || !isPreloadedMode || !viewSubmissionData) return;

    const nextForm = {
      ...INITIAL_FORM,
      ...(viewSubmissionData.form ?? {}),
    } as typeof INITIAL_FORM;
    const nextMeta: Record<string, PersistedAttachmentMeta> = {};
    const nextAttachments: Record<string, string> = {};
    if (viewSubmissionData.attachmentFiles && typeof viewSubmissionData.attachmentFiles === "object") {
      for (const [key, value] of Object.entries(viewSubmissionData.attachmentFiles)) {
        if (typeof value === "string") {
          nextAttachments[key] = value;
        } else if (value && typeof value === "object" && !Array.isArray(value)) {
          const v = value as { fileName?: unknown; storageKey?: unknown };
          const fn = typeof v.fileName === "string" ? v.fileName.trim() : "";
          nextAttachments[key] = fn;
          if (
            fn &&
            typeof v.storageKey === "string" &&
            v.storageKey.trim()
          ) {
            nextMeta[key] = { fileName: fn, storageKey: v.storageKey.trim() };
          }
        }
      }
    }
    const nextExtraUploads: string[] = [];
    const nextExtraMeta: Record<number, PersistedAttachmentMeta> = {};
    if (Array.isArray(viewSubmissionData.extraUploadFiles)) {
      viewSubmissionData.extraUploadFiles.forEach((item, idx) => {
        if (typeof item === "string") {
          nextExtraUploads.push(item);
        } else if (item && typeof item === "object" && !Array.isArray(item)) {
          const v = item as { fileName?: unknown; storageKey?: unknown };
          const fn = typeof v.fileName === "string" ? v.fileName.trim() : "";
          nextExtraUploads.push(fn);
          if (fn && typeof v.storageKey === "string" && v.storageKey.trim()) {
            nextExtraMeta[idx] = { fileName: fn, storageKey: v.storageKey.trim() };
          }
        } else {
          nextExtraUploads.push("");
        }
      });
    }
    const safeStep = Number.isInteger(viewSubmissionData.currentStep)
      ? Math.max(0, Math.min(activeSteps.length - 1, viewSubmissionData.currentStep ?? 0))
      : 0;

    const doneFromServer = viewSubmissionData.completedSteps;
    const nextCompleted =
      Array.isArray(doneFromServer) && doneFromServer.length > 0
        ? new Set(
            doneFromServer.filter(
              (n) => typeof n === "number" && n >= 0 && n < activeSteps.length,
            ) as number[],
          )
        : new Set(Array.from({ length: safeStep }, (_, index) => index));

    setForm(nextForm);
    setAttachmentFiles(nextAttachments);
    setAttachmentPersistedMeta(nextMeta);
    setExtraUploadFiles(nextExtraUploads);
    setExtraUploadPersistedMeta(nextExtraMeta);
    attachmentFileBlobsRef.current = {};
    extraUploadFileBlobsRef.current.clear();
    setCurrentStep(safeStep);
    setCompletedSteps(nextCompleted);
    setSaveMessage(null);
    setSubmitError(null);
  }, [activeSteps.length, isPreloadedMode, open, viewSubmissionData]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/profile/faculty-departments", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          ok: boolean;
          faculties?: Array<{ name: string; departments: string[] }>;
        };
        if (!response.ok || !payload.ok || !Array.isArray(payload.faculties) || cancelled) return;
        const faculties = payload.faculties.map((item) => item.name).filter(Boolean);
        const map: Record<string, string[]> = {};
        for (const item of payload.faculties) {
          map[item.name] = item.departments ?? [];
        }
        setFacultyOptions(faculties);
        setDepartmentsByFaculty(map);
      } catch {
        if (cancelled) return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (
      !open ||
      isViewMode ||
      formMode === "generic" ||
      !applicantProfile
    ) {
      return;
    }
    setForm((prev) => {
      const nextScholar = {
        scholarName: applicantProfile.name,
        scholarSapId: applicantProfile.regNo,
        scholarEmail: applicantProfile.email,
        scholarFaculty: applicantProfile.faculty,
        scholarDepartment: applicantProfile.department,
        scholarProgram: applicantProfile.program,
      };
      const unchanged =
        prev.scholarName === nextScholar.scholarName &&
        prev.scholarSapId === nextScholar.scholarSapId &&
        prev.scholarEmail === nextScholar.scholarEmail &&
        prev.scholarFaculty === nextScholar.scholarFaculty &&
        prev.scholarDepartment === nextScholar.scholarDepartment &&
        prev.scholarProgram === nextScholar.scholarProgram;
      if (unchanged) return prev;
      return { ...prev, ...nextScholar };
    });
  }, [
    applicantProfile?.department,
    applicantProfile?.email,
    applicantProfile?.faculty,
    applicantProfile?.name,
    applicantProfile?.program,
    applicantProfile?.regNo,
    formMode,
    isViewMode,
    open,
  ]);

  useEffect(() => {
    if (!saveMessage) return;
    const timer = window.setTimeout(() => setSaveMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [saveMessage]);

  useEffect(() => {
    if (typeof serverDraftSubmissionId === "number" && serverDraftSubmissionId > 0) {
      setResolvedDraftSubmissionId(serverDraftSubmissionId);
      return;
    }
    setResolvedDraftSubmissionId(null);
  }, [serverDraftSubmissionId]);

  useEffect(() => {
    if (!open) return;
    if (isViewMode) return;
    const formElement = formElementRef.current;
    if (!formElement) return;

    const controls = Array.from(
      formElement.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        REQUIRED_CONTROL_SELECTOR,
      ),
    );
    controls.forEach((control) => {
      if (control instanceof HTMLInputElement) {
        if (
          control.type === "checkbox" ||
          control.type === "radio" ||
          control.type === "file" ||
          control.type === "hidden"
        ) {
          return;
        }
      }
      control.setAttribute("data-required-indicator", "true");
    });

    return () => {
      controls.forEach((control) => control.removeAttribute("data-required-indicator"));
    };
  }, [open, currentStep, formMode, isViewMode]);

  if (!mounted || !open) return null;

  const onFieldChange =
    (key: keyof typeof INITIAL_FORM) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => {
        const next = { ...prev, [key]: e.target.value };
        if (key === "supervisorFaculty") next.supervisorDepartment = "";
        if (key === "uolCoSupervisorFaculty") next.uolCoSupervisorDepartment = "";
        if (key === "externalFaculty") next.externalDepartment = "";
        if (key === "coauthorFaculty") next.coauthorDepartment = "";
        if (key === "publicationAuthor1UolFaculty") next.publicationAuthor1UolDepartment = "";
        if (key === "publicationAuthor1ExternalFaculty") next.publicationAuthor1ExternalDepartment = "";
        if (key === "publicationAuthor2UolFaculty") next.publicationAuthor2UolDepartment = "";
        if (key === "publicationAuthor2ExternalFaculty") next.publicationAuthor2ExternalDepartment = "";
        if (key === "publicationAuthor3UolFaculty") next.publicationAuthor3UolDepartment = "";
        if (key === "publicationAuthor3ExternalFaculty") next.publicationAuthor3ExternalDepartment = "";
        return next;
      });
      setSubmitError(null);
    };

  const getDepartmentsForFaculty = (facultyName: string): string[] =>
    departmentsByFaculty[facultyName] ?? [];

  const hasValue = (value: string) => value.trim().length > 0;
  const hasSelectedCsvValue = (value: string) =>
    value
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean).length > 0;
  const hasRequiredAttachmentUpload = (label: string) =>
    Boolean(
      attachmentFileBlobsRef.current[label] ?? attachmentPersistedMeta[label] ?? attachmentFiles[label],
    );
  const RequiredMark = () => (
    <span
      aria-hidden="true"
      className="ml-1 inline-flex items-center rounded  px-1.5 py-0.5 text-lg font-extrabold leading-none text-red-700  dark:text-red-600"
    >
      *
    </span>
  );

  const validateCurrentStep = (): string | null => {
    const formElement = formElementRef.current;
    const markedError = validateRequiredMarkFields(formElement);
    if (markedError) return markedError;

    if (formMode === "form2-research-publication" && currentStep === 3) {
      for (const label of FORM_2_MANDATORY_ATTACHMENT_LABELS) {
        if (!hasCsvOption("requiredAttachments", label)) {
          return `Required field: tick "${shortenToastLabel(label)}".`;
        }
        if (!hasRequiredAttachmentUpload(label)) {
          return `Required field: upload "${shortenToastLabel(label)}".`;
        }
      }
      return null;
    }

    if (formMode === "form4-research-publication-medical" && currentStep === 4) {
      for (const label of FORM_4_MANDATORY_ATTACHMENT_LABELS) {
        if (!hasCsvOption("requiredAttachments", label)) {
          return `Required field: tick "${shortenToastLabel(label)}".`;
        }
        if (!hasRequiredAttachmentUpload(label)) {
          return `Required field: upload "${shortenToastLabel(label)}".`;
        }
      }
      return null;
    }

    if (formMode === "form6-research-publication-faculty-non-medical" && currentStep === 3) {
      for (const label of FORM_6_MANDATORY_ATTACHMENT_LABELS) {
        if (!hasCsvOption("requiredAttachments", label)) {
          return `Required field: tick "${shortenToastLabel(label)}".`;
        }
        if (!hasRequiredAttachmentUpload(label)) {
          return `Required field: upload "${shortenToastLabel(label)}".`;
        }
      }
      return null;
    }

    if (formMode === "form7-research-publication-faculty-staff-medical" && currentStep === 4) {
      for (const label of FORM_5_REQUIRED_ATTACHMENT_LABELS) {
        if (!hasCsvOption("requiredAttachments", label)) {
          return `Required field: tick "${shortenToastLabel(label)}".`;
        }
        if (!hasRequiredAttachmentUpload(label)) {
          return `Required field: upload "${shortenToastLabel(label)}".`;
        }
      }
      return null;
    }

    if (formMode === "form5-research-publication-faculty-staff" && currentStep === 4) {
      for (const label of FORM_5_REQUIRED_ATTACHMENT_LABELS) {
        if (!hasCsvOption("requiredAttachments", label)) {
          return `Required field: tick "${shortenToastLabel(label)}".`;
        }
        if (!hasRequiredAttachmentUpload(label)) {
          return `Required field: upload "${shortenToastLabel(label)}".`;
        }
      }
      return null;
    }

    if (formMode === "form3-thesis-medical" && currentStep === 5) {
      for (const label of FORM_3_MANDATORY_ATTACHMENTS) {
        if (!hasCsvOption("requiredAttachments", label)) {
          return `Required field: tick "${shortenToastLabel(label)}".`;
        }
        if (!hasRequiredAttachmentUpload(label)) {
          return `Required field: upload "${shortenToastLabel(label)}".`;
        }
      }
      const selectedOptional = FORM_3_MEDICAL_ATTACHMENT_LABELS.filter((label) =>
        hasCsvOption("requiredAttachments", label),
      );
      for (const label of selectedOptional) {
        if (!hasRequiredAttachmentUpload(label)) {
          return `Required field: upload "${shortenToastLabel(label)}".`;
        }
      }
      return null;
    }

    if (formMode === "generic" && currentStep === 6) {
      if (form.form3DeclarationAccepted !== "yes") {
        return "Please accept the declaration in Declaration & Submission.";
      }
      if (![form.declaration, form.applicantName, form.submissionDate].every(hasValue)) {
        return "Please complete applicant name, submission date, and declaration.";
      }
      return null;
    }

    if (formMode !== "form1-thesis") return null;

    if (currentStep === 0) {
      const supervisorRequired = [
        form.supervisorSapId,
        form.supervisorName,
        form.supervisorEmail,
        form.supervisorFaculty,
        form.supervisorDepartment,
      ].every(hasValue);
      if (!supervisorRequired) {
        return "Please complete all required Supervisor(s)'s Information fields.";
      }

      // Co-supervisor is optional; validate completeness only when the user has
      // opened the "Add Co-Supervisor" section (i.e. any co-supervisor field has a value).
      if (hasForm1CoSupervisorEntry(form)) {
        const coSupervisorRequired =
          form.coSupervisorType === "UOL"
            ? [
                form.uolCoSupervisorSapId,
                form.uolCoSupervisorName,
                form.uolCoSupervisorEmail,
                form.uolCoSupervisorFaculty,
                form.uolCoSupervisorDepartment,
              ].every(hasValue)
            : form.coSupervisorType === "External"
              ? [
                  form.externalCoSupervisorName,
                  form.externalCoSupervisorRegNo,
                  form.externalCoSupervisorEmail,
                  form.externalUniversity,
                  form.externalFaculty,
                  form.externalDepartment,
                ].every(hasValue)
              : false;
        if (!coSupervisorRequired) {
          return "Please complete all required Co-supervisor fields.";
        }
      }

      const thesisDetailsRequired = [
        form.thesisTitle,
        form.expectedStartDate,
        form.expectedEndDate,
        form.researchLocations,
        form.researchObjective1,
      ].every(hasValue);
      if (!thesisDetailsRequired) {
        return "Please complete all required Thesis/Project Details fields.";
      }

      if (!hasSelectedCsvValue(form.sdgs)) {
        return "Please select at least one Sustainable Development Goal (f).";
      }
      if (!hasValue(form.dataCollectionMethod)) {
        return "Please select Data collection method (h).";
      }
      if (!hasValue(form.researchPopulation)) {
        return "Please select Research population (i).";
      }
      if (!hasValue(form.methodology)) {
        return "Please complete Research Methodology (j).";
      }
      if (!hasValue(form.participantsEstimate)) {
        return "Please select participants estimate (k).";
      }
      return null;
    }

    if (currentStep === 1) {
      const baseRequired = [
        form.involveHumanParticipants,
        form.collectPii,
        form.informedConsentType,
        form.preApprovalDataCollected,
        form.canWithdraw,
        form.compensation,
        form.vulnerablePopulation,
        form.sensitiveTopics,
        form.potentialRisks,
        form.dataRetentionYears,
        form.conflictOfInterest,
        form.recordsWithoutConsent,
      ].every(hasValue);
      if (!baseRequired) {
        return "Please complete all required fields in Step 2: Ethical Considerations.";
      }
      if (!hasSelectedCsvValue(form.recruitmentChannels)) {
        return "Please select at least one recruitment channel in Step 2.";
      }
      if (!hasSelectedCsvValue(form.confidentialityOptions)) {
        return "Please select at least one confidentiality option in Step 2.";
      }
      if (form.collectPii === "Yes" && !hasValue(form.piiTypes)) {
        return "Please provide PII types in Step 2.";
      }
      if (
        hasSelectedCsvValue(form.confidentialityOptions) &&
        hasCsvOption("confidentialityOptions", "Others") &&
        !hasValue(form.confidentialityOtherDetails)
      ) {
        return "Please provide details for confidentiality 'Others' option.";
      }
      if (form.vulnerablePopulation === "Yes" && !hasValue(form.vulnerableSafeguards)) {
        return "Please describe safeguards for vulnerable populations.";
      }
      if (form.sensitiveTopics === "Yes") {
        if (!hasSelectedCsvValue(form.sensitiveTopicTypes)) {
          return "Please select at least one sensitive topic type.";
        }
        if (
          hasSelectedCsvValue(form.sensitiveTopicTypes) &&
          hasCsvOption("sensitiveTopicTypes", "Others") &&
          !hasValue(form.sensitiveTopicOtherDetails)
        ) {
          return "Please provide details for sensitive topic 'Others' option.";
        }
      }
      if (form.potentialRisks === "Yes" && !hasValue(form.potentialRiskDetails)) {
        return "Please provide potential adverse effects details.";
      }
      if (form.dataRetentionYears === "More than 16 years" && !hasValue(form.longRetentionReason)) {
        return "Please explain the long data retention reason.";
      }
      if (form.conflictOfInterest === "Yes" && !hasValue(form.conflictManagement)) {
        return "Please provide conflict of interest management details.";
      }
      if (
        form.recordsWithoutConsent === "Yes" &&
        !hasValue(form.recordsWithoutConsentJustification)
      ) {
        return "Please justify access to records without consent.";
      }
      return null;
    }

    if (currentStep === 2) {
      const baseRequired = [
        form.institutionalFunding,
        form.externalFunding,
        form.internationalCollaboration,
        form.conductedAbroad,
      ].every(hasValue);
      if (!baseRequired) {
        return "Please complete all required fields in Step 3: Institutional Approvals & Collaboration.";
      }
      if (
        form.internationalCollaboration === "Yes" &&
        !hasValue(form.internationalCollaborationDetails)
      ) {
        return "Please provide international collaboration details.";
      }
      return null;
    }

    if (currentStep === 3) {
      const missingRequiredSelection = FORM_3_MANDATORY_ATTACHMENTS.some(
        (label) =>
          !hasCsvOption("requiredAttachments", label) && !hasRequiredAttachmentUpload(label),
      );
      if (missingRequiredSelection) {
        return "Please select all required attachment items in Step 4.";
      }
      const missingRequiredUpload = FORM_3_MANDATORY_ATTACHMENTS.some(
        (label) => !hasRequiredAttachmentUpload(label),
      );
      if (missingRequiredUpload) {
        return "Please upload files for all required attachment items in Step 4.";
      }
      const selectedLabels = FORM_1_REQUIRED_ATTACHMENTS.filter((label) =>
        hasCsvOption("requiredAttachments", label),
      );
      const missingUploadForSelectedOptional = selectedLabels.some(
        (label) => !hasRequiredAttachmentUpload(label),
      );
      if (missingUploadForSelectedOptional) {
        return "Please upload files for the attachment item(s) you selected in Step 4.";
      }
      return null;
    }

    if (currentStep === 4) {
      if (form.declarationAccepted !== "yes") {
        return "Please complete all required fields in Step 5: Declaration and Submission.";
      }
      return null;
    }

    return null;
  };

  const handleNext = (e?: MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!isViewMode) {
      const validationError = validateCurrentStep();
      if (validationError) {
        setSubmitError(validationError);
        toast.warning(validationError);
        return;
      }
    }
    setSubmitError(null);

    const nextStep = currentStep < activeSteps.length - 1 ? currentStep + 1 : currentStep;
    const nextCompleted = new Set(completedSteps);
    nextCompleted.add(currentStep);

    setCompletedSteps(nextCompleted);
    setCurrentStep(nextStep);

    if (!isViewMode) {
      const uid = userStorageId.trim();
      const sid = draftSessionId?.trim();
      if (uid && sid) {
        const payload: StoredDraftPayload = {
          draftSessionId: sid,
          form,
          currentStep: nextStep,
          completedSteps: Array.from(nextCompleted),
          attachmentFiles,
          extraUploadFiles,
          attachmentPersistedMeta,
          extraUploadPersistedMeta: Object.fromEntries(
            Object.entries(extraUploadPersistedMeta).map(([k, v]) => [String(k), v]),
          ),
          savedAt: new Date().toISOString(),
        };
        try {
          localStorage.setItem(getDraftStorageKey(uid), JSON.stringify(payload));
        } catch {
          /* ignore */
        }
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const resetAndClose = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setForm(INITIAL_FORM);
    setSaveMessage(null);
    setSubmitError(null);
    setIsSubmitting(false);
    setAttachmentFiles({});
    setAttachmentPersistedMeta({});
    setExtraUploadFiles([]);
    setExtraUploadPersistedMeta({});
    attachmentFileBlobsRef.current = {};
    extraUploadFileBlobsRef.current.clear();
    onClose();
  };

  const handleSaveProgress = () => {
    if (isViewMode) return;
    void (async () => {
      const uid = userStorageId.trim();
      const sid = draftSessionId?.trim();
      if (uid && sid) {
        const payload: StoredDraftPayload = {
          draftSessionId: sid,
          form,
          currentStep,
          completedSteps: Array.from(completedSteps),
          attachmentFiles,
          extraUploadFiles,
          attachmentPersistedMeta,
          extraUploadPersistedMeta: Object.fromEntries(
            Object.entries(extraUploadPersistedMeta).map(([k, v]) => [String(k), v]),
          ),
          savedAt: new Date().toISOString(),
        };
        try {
          localStorage.setItem(getDraftStorageKey(uid), JSON.stringify(payload));
        } catch {
          /* ignore */
        }
      }

      if (isRevisionMode) {
        const message = "Progress saved locally";
        setSaveMessage(message);
        toast.success(message);
        return;
      }

      if (!persistDraft || !applicantProfile) {
        const message = "Progress saved";
        setSaveMessage(message);
        toast.success(message);
        return;
      }

      const slotKeys = new Set([
        ...Object.keys(attachmentFiles),
        ...Object.keys(attachmentPersistedMeta),
      ]);
      const mergedAttachmentFiles: Record<string, unknown> = {};
      for (const label of slotKeys) {
        const blob = attachmentFileBlobsRef.current[label];
        if (blob) {
          mergedAttachmentFiles[label] = attachmentFiles[label] || blob.name;
        } else if (attachmentPersistedMeta[label]) {
          mergedAttachmentFiles[label] = attachmentPersistedMeta[label];
        } else {
          mergedAttachmentFiles[label] = attachmentFiles[label] ?? "";
        }
      }

      const mergedExtraUploadFiles: unknown[] = extraUploadFiles.map((name, idx) => {
        const blob = extraUploadFileBlobsRef.current.get(idx);
        if (blob) {
          return name || blob.name;
        }
        if (extraUploadPersistedMeta[idx]) {
          return extraUploadPersistedMeta[idx];
        }
        return name;
      });

      const { title, objectives, methodology, type, domain } = getCoreTextFields(true);
      const ethics: Record<string, unknown> = {
        form,
        attachmentFiles: mergedAttachmentFiles,
        extraUploadFiles: mergedExtraUploadFiles,
        requiredForm,
        currentStep,
        completedSteps: Array.from(completedSteps),
        ...(submissionMeta ?? {}),
      };

      setIsSavingDraft(true);
      const result = await persistDraft({
        title,
        objectives,
        methodology,
        type,
        domain,
        ethics,
        applicantProfile: {
          name: applicantProfile.name,
          sapId: applicantProfile.regNo,
          email: applicantProfile.email,
          faculty: applicantProfile.faculty,
          department: applicantProfile.department,
          program: applicantProfile.program,
        },
      });
      setIsSavingDraft(false);

      if (!result.ok) {
        const message = result.error ?? "Could not save to server";
        setSaveMessage(message);
        toast.error(message);
        return;
      }

      if (typeof result.submissionId === "number") {
        setResolvedDraftSubmissionId(result.submissionId);
        onServerDraftSaved?.(result.submissionId);
      }
      const message = "Progress saved";
      setSaveMessage(message);
      toast.success(message);
    })();
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void (async () => {
      if (isViewMode) return;
      // Prevent accidental submit from intermediate steps (e.g., while uploading files).
      if (currentStep < activeSteps.length - 1 || isSubmitting) return;
      if (isSavingDraft) {
        const message = "Please wait for draft save to finish, then submit.";
        setSubmitError(message);
        toast.warning(message);
        return;
      }

      const submissionStepError = validateCurrentStep();
      if (submissionStepError) {
        setSubmitError(submissionStepError);
        toast.warning(submissionStepError);
        return;
      }

      const { title, objectives, methodology, type, domain } = getCoreTextFields(false);

      if (!title || !objectives || !methodology) {
        const message = "Please complete the required submission fields before submitting.";
        setSubmitError(message);
        toast.warning(message);
        return;
      }

      if (formMode === "form4-research-publication-medical") {
        for (const label of FORM_4_MANDATORY_ATTACHMENT_LABELS) {
          if (!hasCsvOption("requiredAttachments", label)) {
            setSubmitError(
              `Please confirm the required attachment "${label}" in Step 5 (tick the checkbox).`,
            );
            return;
          }
          if (!hasRequiredAttachmentUpload(label)) {
            setSubmitError(`Please upload "${label}" in Step 5: Required Attachments.`);
            return;
          }
        }
      }

      setSubmitError(null);
      setIsSubmitting(true);

      const slotKeys = new Set([
        ...Object.keys(attachmentFiles),
        ...Object.keys(attachmentPersistedMeta),
      ]);
      const mergedAttachmentFiles: Record<string, unknown> = {};
      for (const label of slotKeys) {
        const blob = attachmentFileBlobsRef.current[label];
        if (blob) {
          mergedAttachmentFiles[label] = attachmentFiles[label] || blob.name;
        } else if (attachmentPersistedMeta[label]) {
          mergedAttachmentFiles[label] = attachmentPersistedMeta[label];
        } else {
          mergedAttachmentFiles[label] = attachmentFiles[label] ?? "";
        }
      }

      const mergedExtraUploadFiles: unknown[] = extraUploadFiles.map((name, idx) => {
        const blob = extraUploadFileBlobsRef.current.get(idx);
        if (blob) {
          return name || blob.name;
        }
        if (extraUploadPersistedMeta[idx]) {
          return extraUploadPersistedMeta[idx];
        }
        return name;
      });

      const requiredByLabel: Record<string, File> = {};
      for (const [label, file] of Object.entries(attachmentFileBlobsRef.current)) {
        if (file) {
          requiredByLabel[label] = file;
        }
      }
      const extraByIndex: Record<number, File> = {};
      extraUploadFileBlobsRef.current.forEach((file, idx) => {
        extraByIndex[idx] = file;
      });
      const fileBundle: SubmissionFileBundle | undefined =
        Object.keys(requiredByLabel).length > 0 || Object.keys(extraByIndex).length > 0
          ? { requiredByLabel, extraByIndex }
          : undefined;

      let draftId =
        typeof resolvedDraftSubmissionId === "number" && resolvedDraftSubmissionId > 0
          ? resolvedDraftSubmissionId
          : typeof serverDraftSubmissionId === "number" && serverDraftSubmissionId > 0
            ? serverDraftSubmissionId
            : undefined;

      if (isRevisionMode) {
        draftId = undefined;
      }

      const result = await onSubmit(
        {
          title,
          objectives,
          methodology,
          type,
          domain,
          ethics: {
            form,
            attachmentFiles: mergedAttachmentFiles,
            extraUploadFiles: mergedExtraUploadFiles,
            requiredForm,
            ...(submissionMeta ?? {}),
          },
          ...(draftId != null ? { draftSubmissionId: draftId } : {}),
        },
        fileBundle,
      );

      setIsSubmitting(false);

      if (!result.ok) {
        const message = result.error ?? "Unable to submit application. Please try again.";
        setSubmitError(message);
        toast.error(message);
        return;
      }

      const uid = userStorageId.trim();
      if (uid) {
        try {
          localStorage.removeItem(getDraftStorageKey(uid));
          localStorage.removeItem(LEGACY_DRAFT_KEY);
        } catch {
          /* ignore */
        }
      }
      toast.success("Application submitted successfully.");
      resetAndClose();
    })();
  };

  const toggleCsvOption = (key: keyof typeof INITIAL_FORM, value: string) => {
    setForm((prev) => {
      const current = prev[key]
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);
      const exists = current.includes(value);
      const updated = exists ? current.filter((item) => item !== value) : [...current, value];
      return { ...prev, [key]: updated.join("|") };
    });
  };

  const hasCsvOption = (key: keyof typeof INITIAL_FORM, value: string) =>
    form[key]
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean)
      .includes(value);

  const handleRequiredAttachmentUpload =
    (attachmentLabel: string) => (e: ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      setAttachmentFiles((prev) => ({
        ...prev,
        [attachmentLabel]: selectedFile?.name ?? "",
      }));
      // Keep checkbox state in sync with uploads so required labels don't fail as "unselected".
      setForm((prev) => {
        const current = prev.requiredAttachments
          .split("|")
          .map((item) => item.trim())
          .filter(Boolean);
        const hasLabel = current.includes(attachmentLabel);
        if (selectedFile && !hasLabel) {
          return { ...prev, requiredAttachments: [...current, attachmentLabel].join("|") };
        }
        if (!selectedFile && hasLabel) {
          return {
            ...prev,
            requiredAttachments: current.filter((item) => item !== attachmentLabel).join("|"),
          };
        }
        return prev;
      });
      if (selectedFile) {
        attachmentFileBlobsRef.current[attachmentLabel] = selectedFile;
        setAttachmentPersistedMeta((prev) => {
          const next = { ...prev };
          delete next[attachmentLabel];
          return next;
        });
      } else {
        delete attachmentFileBlobsRef.current[attachmentLabel];
      }
    };

  const handleExtraUploadChange =
    (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      setExtraUploadFiles((prev) =>
        prev.map((name, i) => (i === index ? selectedFile?.name ?? "" : name)),
      );
      if (selectedFile) {
        extraUploadFileBlobsRef.current.set(index, selectedFile);
        setExtraUploadPersistedMeta((prev) => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
      } else {
        extraUploadFileBlobsRef.current.delete(index);
      }
    };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-dark/60 px-4 py-6 backdrop-blur-[2px]">
      <div className="flex h-[min(92vh,980px)] w-full max-w-[1200px] flex-col overflow-hidden rounded-[12px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
        <div className="border-b border-stroke px-6 py-5 dark:border-dark-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-dark dark:text-white">
                Student Research Ethical Review Application
              </h2>
              <p className="mt-2 text-sm">
                Complete each step and submit your ethical review request.
              </p>
             
            </div>
            <button
              type="button"
              onClick={resetAndClose}
              className="rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
            >
              Close
            </button>
          </div>
        </div>

        <div className="border-b border-stroke bg-gray-1 p-4 dark:border-dark-3 dark:bg-dark-2">
          <div className="flex gap-2 overflow-x-auto">
            {activeSteps.map((title, index) => (
              <button
                key={title}
                type="button"
                disabled
                aria-disabled="true"
                className={cn(
                  "shrink-0 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition sm:text-sm",
                  stepState[index]?.isActive &&
                    "border-primary bg-primary text-white dark:border-primary dark:bg-primary",
                  stepState[index]?.isDone &&
                    !stepState[index]?.isActive &&
                    "border-green/60 bg-green/10 text-green",
                  !stepState[index]?.isActive &&
                    !stepState[index]?.isDone &&
                    "border-stroke bg-white text-dark hover:border-primary/50 dark:border-dark-3 dark:bg-gray-dark dark:text-white",
                  "cursor-not-allowed opacity-90",
                )}
              >
                {index + 1}. {title}
              </button>
            ))}
          </div>
        </div>

        <form ref={formElementRef} onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <fieldset disabled={isViewMode} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {renderActiveFormWrapper(
              <>
            {formMode === "form4-research-publication-medical" && (
              <Form4ResearchPublicationMedicalForm
                currentStep={currentStep}
                form={form}
                onFieldChange={onFieldChange as never}
                setForm={setForm as never}
                hasCsvOption={hasCsvOption as never}
                toggleCsvOption={toggleCsvOption as never}
                attachmentFiles={attachmentFiles}
                handleRequiredAttachmentUpload={handleRequiredAttachmentUpload}
                facultyOptions={facultyOptions}
                getDepartmentsForFaculty={getDepartmentsForFaculty}
                onClearSubmitError={() => setSubmitError(null)}
              />
            )}
            {formMode === "form1-thesis" && (
              <Form1ThesisForm
                currentStep={currentStep}
                form={form}
                onFieldChange={onFieldChange as never}
                setForm={setForm as never}
                hasCsvOption={hasCsvOption as never}
                toggleCsvOption={toggleCsvOption as never}
                attachmentFiles={attachmentFiles}
                handleRequiredAttachmentUpload={handleRequiredAttachmentUpload}
                extraUploadFiles={extraUploadFiles}
                setExtraUploadFiles={setExtraUploadFiles}
                handleExtraUploadChange={handleExtraUploadChange}
                facultyOptions={facultyOptions}
                getDepartmentsForFaculty={getDepartmentsForFaculty}
                onClearSubmitError={() => setSubmitError(null)}
              />
            )}

            {formMode === "form3-thesis-medical" && (
              <Form3ThesisMedicalForm
                currentStep={currentStep}
                form={form}
                onFieldChange={onFieldChange as never}
                setForm={setForm as never}
                hasCsvOption={hasCsvOption as never}
                toggleCsvOption={toggleCsvOption as never}
                attachmentFiles={attachmentFiles}
                handleRequiredAttachmentUpload={handleRequiredAttachmentUpload}
                extraUploadFiles={extraUploadFiles}
                setExtraUploadFiles={setExtraUploadFiles}
                handleExtraUploadChange={handleExtraUploadChange}
                facultyOptions={facultyOptions}
                getDepartmentsForFaculty={getDepartmentsForFaculty}
              />
            )}

            {formMode === "form2-research-publication" && (
              <Form2ResearchPublicationForm
                currentStep={currentStep}
                form={form}
                onFieldChange={onFieldChange as never}
                setForm={setForm as never}
                hasCsvOption={hasCsvOption as never}
                toggleCsvOption={toggleCsvOption as never}
                attachmentFiles={attachmentFiles}
                handleRequiredAttachmentUpload={handleRequiredAttachmentUpload}
                facultyOptions={facultyOptions}
                getDepartmentsForFaculty={getDepartmentsForFaculty}
              />
            )}

            {formMode === "form5-research-publication-faculty-staff" && (
              <Form5ResearchPublicationFacultyStaffForm
                currentStep={currentStep}
                form={form}
                onFieldChange={onFieldChange as never}
                setForm={setForm as never}
                hasCsvOption={hasCsvOption as never}
                toggleCsvOption={toggleCsvOption as never}
                attachmentFiles={attachmentFiles}
                handleRequiredAttachmentUpload={handleRequiredAttachmentUpload}
                facultyOptions={facultyOptions}
                getDepartmentsForFaculty={getDepartmentsForFaculty}
              />
            )}

            {formMode === "form6-research-publication-faculty-non-medical" && (
              <Form6ResearchPublicationFacultyNonMedicalForm
                currentStep={currentStep}
                form={form}
                onFieldChange={onFieldChange as never}
                setForm={setForm as never}
                hasCsvOption={hasCsvOption as never}
                toggleCsvOption={toggleCsvOption as never}
                attachmentFiles={attachmentFiles}
                handleRequiredAttachmentUpload={handleRequiredAttachmentUpload}
                facultyOptions={facultyOptions}
                getDepartmentsForFaculty={getDepartmentsForFaculty}
              />
            )}

            {formMode === "form7-research-publication-faculty-staff-medical" && (
              <Form7ResearchPublicationFacultyStaffMedicalSciencesForm
                currentStep={currentStep}
                form={form}
                onFieldChange={onFieldChange as never}
                setForm={setForm as never}
                hasCsvOption={hasCsvOption as never}
                toggleCsvOption={toggleCsvOption as never}
                attachmentFiles={attachmentFiles}
                handleRequiredAttachmentUpload={handleRequiredAttachmentUpload}
                facultyOptions={facultyOptions}
                getDepartmentsForFaculty={getDepartmentsForFaculty}
              />
            )}

            {false && formMode === "form3-thesis-medical" && currentStep === 0 && (
              <section className="grid gap-6">
                <h3 className="text-xl font-bold text-dark dark:text-white">Step 1: Researcher(s) and Thesis/Project Information</h3>
                <div className="grid gap-4 rounded-lg border border-stroke p-4 dark:border-dark-3">
                  <h4 className="font-semibold text-dark dark:text-white">1.1 Scholar&apos;s Information</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input value={form.scholarName} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Scholar's Name" />
                    <input value={form.scholarSapId} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="SAP ID / Reg. No" />
                    <input value={form.scholarEmail} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Email" />
                    <input value={form.scholarFaculty} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Faculty" />
                    <input value={form.scholarDepartment} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Department" />
                    <input value={form.scholarProgram} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Program" />
                  </div>
                </div>
                <div className="grid gap-4 rounded-lg border border-stroke p-4 dark:border-dark-3 md:grid-cols-2">
                  <h4 className="font-semibold text-dark dark:text-white md:col-span-2">1.2 Supervisor(s)&apos;s Information</h4>
                  <input value={form.supervisorSapId} onChange={onFieldChange("supervisorSapId")} placeholder="SAP ID" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.supervisorName} onChange={onFieldChange("supervisorName")} placeholder="Supervisor's Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.supervisorEmail} onChange={onFieldChange("supervisorEmail")} placeholder="Email" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.supervisorFaculty} onChange={onFieldChange("supervisorFaculty")} placeholder="Faculty" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.supervisorDepartment} onChange={onFieldChange("supervisorDepartment")} placeholder="Department" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                </div>
                <div className="grid gap-4 rounded-lg border border-stroke p-4 dark:border-dark-3">
                  <h4 className="font-semibold text-dark dark:text-white">1.3 Co-supervisor</h4>
                  <select value={form.coSupervisorType} onChange={onFieldChange("coSupervisorType")} className="max-w-xs rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="UOL">Option 1: UOL</option><option value="External">Option 2: External</option></select>
                  <div className="grid gap-4 md:grid-cols-2">
                    {form.coSupervisorType === "UOL" ? (
                      <>
                        <input value={form.uolCoSupervisorSapId} onChange={onFieldChange("uolCoSupervisorSapId")} placeholder="SAP ID" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.uolCoSupervisorName} onChange={onFieldChange("uolCoSupervisorName")} placeholder="Supervisor's Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.uolCoSupervisorEmail} onChange={onFieldChange("uolCoSupervisorEmail")} placeholder="Email" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.uolCoSupervisorFaculty} onChange={onFieldChange("uolCoSupervisorFaculty")} placeholder="Faculty" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.uolCoSupervisorDepartment} onChange={onFieldChange("uolCoSupervisorDepartment")} placeholder="Department" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                      </>
                    ) : (
                      <>
                        <input value={form.externalCoSupervisorName} onChange={onFieldChange("externalCoSupervisorName")} placeholder="Co-supervisor's Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.externalCoSupervisorRegNo} onChange={onFieldChange("externalCoSupervisorRegNo")} placeholder="Reg. No." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.externalCoSupervisorEmail} onChange={onFieldChange("externalCoSupervisorEmail")} placeholder="Email" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.externalUniversity} onChange={onFieldChange("externalUniversity")} placeholder="University" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.externalFaculty} onChange={onFieldChange("externalFaculty")} placeholder="Faculty" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.externalDepartment} onChange={onFieldChange("externalDepartment")} placeholder="Department" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                      </>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 rounded-lg border border-stroke p-4 dark:border-dark-3 md:grid-cols-2">
                  <h4 className="font-semibold text-dark dark:text-white md:col-span-2">1.4 Thesis/Project Details</h4>
                  <input value={form.thesisTitle} onChange={onFieldChange("thesisTitle")} placeholder="Thesis/Project Title" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <input value={form.researchDiscipline} onChange={onFieldChange("researchDiscipline")} placeholder="Research Discipline" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.fundingSource} onChange={onFieldChange("fundingSource")} placeholder="Funding Source (if applicable)" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input type="date" value={form.expectedStartDate} onChange={onFieldChange("expectedStartDate")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input type="date" value={form.expectedEndDate} onChange={onFieldChange("expectedEndDate")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.researchLocations} onChange={onFieldChange("researchLocations")} placeholder="Research Location(s)" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <textarea value={form.researchObjective1} onChange={onFieldChange("researchObjective1")} rows={2} placeholder="Describe" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <textarea value={form.researchObjective2} onChange={onFieldChange("researchObjective2")} rows={2} placeholder="Describe" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <textarea value={form.researchObjective3} onChange={onFieldChange("researchObjective3")} rows={2} placeholder="Describe" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <textarea value={form.researchObjective4} onChange={onFieldChange("researchObjective4")} rows={2} placeholder="Describe" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <textarea value={form.methodology} onChange={onFieldChange("methodology")} rows={4} placeholder="Research Methodology (Methods and Materials)" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <div><p className="mb-2 text-sm font-semibold text-dark dark:text-white">Participants Estimate</p><select value={form.participantsEstimate} onChange={onFieldChange("participantsEstimate")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Participants Estimate</option><option>1-20</option><option>21-50</option><option>51-100</option><option>101-150</option><option>151-200</option><option>201-300</option><option>301-400</option><option>401-500</option><option>501+</option></select></div>
                </div>
              </section>
            )}

            {false && formMode === "form3-thesis-medical" && currentStep === 1 && (
              <section className="grid gap-4 md:grid-cols-2">
                <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">Step 2: Ethical Considerations</h3>
                <select value={form.involveHumanParticipants} onChange={onFieldChange("involveHumanParticipants")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option></select>
                <select value={form.collectPii} onChange={onFieldChange("collectPii")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option></select>
                <div className="rounded-lg border border-stroke p-3 dark:border-dark-3 md:col-span-2"><p className="mb-2 text-sm font-semibold text-dark dark:text-white">2.3 Recruitment channels (multi-select)</p><div className="grid gap-2 sm:grid-cols-2">{["Emails","Google Forms/ Online Surveys","Social Media (Facebook, Instagram, etc.)","LinkedIn (professional networking platforms)","Institutional Mailing Lists","Online forms","Academic Networks","In-person","Other"].map((item) => (<label key={item} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasCsvOption("recruitmentChannels", item)} onChange={() => toggleCsvOption("recruitmentChannels", item)} /><span>{item}</span></label>))}</div></div>
                <select value={form.informedConsentType} onChange={onFieldChange("informedConsentType")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Oral informed consent (with witness)</option><option>Waiver of consent</option><option>Not applicable</option></select>
                <select value={form.preApprovalDataCollected} onChange={onFieldChange("preApprovalDataCollected")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option></select>
                <select value={form.canWithdraw} onChange={onFieldChange("canWithdraw")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option></select>
                <select value={form.compensation} onChange={onFieldChange("compensation")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option></select>
                <textarea value={form.adverseEventsManagement} onChange={onFieldChange("adverseEventsManagement")} rows={3} placeholder="2.9 Adverse events / complaint management" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                <select value={form.publicationBiologicalSpecimens} onChange={onFieldChange("publicationBiologicalSpecimens")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option></select>
                {form.publicationBiologicalSpecimens === "Yes" && <textarea value={form.publicationBiologicalSpecimenDetails} onChange={onFieldChange("publicationBiologicalSpecimenDetails")} rows={2} placeholder="Describe biosafety collection/storage/handling." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
                <select value={form.researchRiskLevel} onChange={onFieldChange("researchRiskLevel")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Minimal risk</option><option>Low risk</option><option>Moderate risk</option><option>High risk</option></select>
                {(form.researchRiskLevel === "Moderate risk" || form.researchRiskLevel === "High risk") && <textarea value={form.researchRiskJustification} onChange={onFieldChange("researchRiskJustification")} rows={2} placeholder="Justify selected risk level." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
                <textarea value={form.potentialRiskDetails} onChange={onFieldChange("potentialRiskDetails")} rows={2} placeholder="2.12 Potential risks and adverse effects" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                <select value={form.conflictOfInterest} onChange={onFieldChange("conflictOfInterest")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option><option>Undecided</option></select>
                {form.conflictOfInterest === "Yes" && <textarea value={form.conflictManagement} onChange={onFieldChange("conflictManagement")} rows={2} placeholder="Describe." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
              </section>
            )}

            {false && formMode === "form3-thesis-medical" && currentStep === 2 && (
              <section className="grid gap-4 md:grid-cols-2">
                <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">Step 3: Biomedical & Pharmaceutical Aspects</h3>
                <select value={form.publicationPharmaInterventions} onChange={onFieldChange("publicationPharmaInterventions")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option></select>
                <input value={form.drugName} onChange={onFieldChange("drugName")} placeholder="Enter Details" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <input value={form.drugDosageFrequency} onChange={onFieldChange("drugDosageFrequency")} placeholder="Enter..." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <input value={form.drugKnownSideEffects} onChange={onFieldChange("drugKnownSideEffects")} placeholder="Enter..." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                <select value={form.drugRegulatoryApproval} onChange={onFieldChange("drugRegulatoryApproval")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option><option>Pending</option><option>Not Applicable</option></select>
                <select value={form.monitoredAfterAdministration} onChange={onFieldChange("monitoredAfterAdministration")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option><option>Not Applicable</option></select>
                {form.monitoredAfterAdministration === "Yes" && <input value={form.followUpDuration} onChange={onFieldChange("followUpDuration")} placeholder="Follow-up duration" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />}
                <textarea value={form.emergencyProcedures} onChange={onFieldChange("emergencyProcedures")} rows={3} placeholder="3.6 Has regulatory and ethical approval been obtained for the pharmaceutical substance / investigational product?" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                <select value={form.publicationAnimalSubjects} onChange={onFieldChange("publicationAnimalSubjects")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option></select>
                <select value={form.publicationAnimalEthicsApproval} onChange={onFieldChange("publicationAnimalEthicsApproval")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option><option>Pending</option><option>Not Applicable</option></select>
              </section>
            )}

            {false && formMode === "form3-thesis-medical" && currentStep === 3 && (
              <section className="grid gap-4 md:grid-cols-2">
                <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">Step 4: Data Management</h3>
                <div className="rounded-lg border border-stroke p-3 dark:border-dark-3 md:col-span-2"><p className="mb-2 text-sm font-semibold text-dark dark:text-white">Select</p><div className="grid gap-2 sm:grid-cols-2">{["Anonymization/Pseudonymization","Secure Storage (Electronic/Physical)","Access Restrictions and Confidentiality Agreements","No Disclosure of Identity","Third-Party Agreement","Others"].map((item) => (<label key={item} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasCsvOption("dataProtectionOptions", item)} onChange={() => toggleCsvOption("dataProtectionOptions", item)} /><span>{item}</span></label>))}</div></div>
                <select value={form.sharedWithThirdParties} onChange={onFieldChange("sharedWithThirdParties")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option></select>
                {form.sharedWithThirdParties === "Yes" && <textarea value={form.thirdPartySharingDetails} onChange={onFieldChange("thirdPartySharingDetails")} rows={2} placeholder="Institution, purpose, safeguards." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
                <select value={form.cloudPlatformsUsed} onChange={onFieldChange("cloudPlatformsUsed")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option></select>
                {form.cloudPlatformsUsed === "Yes" && <input value={form.cloudPlatformDetails} onChange={onFieldChange("cloudPlatformDetails")} placeholder="Enter..." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />}
                <select value={form.futureResearchDataUse} onChange={onFieldChange("futureResearchDataUse")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option></select>
                {form.futureResearchDataUse === "Yes" && <textarea value={form.futureResearchDataUseConditions} onChange={onFieldChange("futureResearchDataUseConditions")} rows={2} placeholder="Specify conditions." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
                <select value={form.dataRetentionYears} onChange={onFieldChange("dataRetentionYears")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>1-5 years</option><option>6-10 years</option><option>11-15 years</option><option>More than 16 years</option></select>
                {form.dataRetentionYears === "More than 16 years" && <textarea value={form.longRetentionReason} onChange={onFieldChange("longRetentionReason")} rows={2} placeholder="Explain longer retention need." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />}
              </section>
            )}

            {false && formMode === "form3-thesis-medical" && currentStep === 4 && (
              <section className="grid gap-4 md:grid-cols-2">
                <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">Step 5: Institutional Approvals & Collaborations</h3>
                <select value={form.healthcareExternalInstitutions} onChange={onFieldChange("healthcareExternalInstitutions")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option></select>
                <select value={form.institutionalFunding} onChange={onFieldChange("institutionalFunding")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select </option><option>Yes</option><option>No</option></select>
                <select value={form.externalFunding} onChange={onFieldChange("externalFunding")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option></select>
                <select value={form.internationalCollaboration} onChange={onFieldChange("internationalCollaboration")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select </option><option>Yes</option><option>No</option></select>
                {form.internationalCollaboration === "Yes" && <textarea value={form.internationalCollaborationDetails} onChange={onFieldChange("internationalCollaborationDetails")} rows={3} placeholder="Provide collaboration details." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
                <select value={form.conductedAbroad} onChange={onFieldChange("conductedAbroad")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option></select>
              </section>
            )}

            {false && formMode === "form3-thesis-medical" && currentStep === 5 && (
              <section className="grid gap-4">
                <h3 className="text-xl font-bold text-dark dark:text-white">Step 6: Required Attachments</h3>
                <div className="grid gap-2">
                  {FORM_1_REQUIRED_ATTACHMENTS.map((item) => (
                    <div key={item} className="rounded border border-stroke px-3 py-2 dark:border-dark-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={hasCsvOption("requiredAttachments", item)} onChange={() => toggleCsvOption("requiredAttachments", item)} />
                          <span className="text-sm">{item}</span>
                        </label>
                        <label className="cursor-pointer rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10">Upload document<input type="file" className="hidden" onChange={handleRequiredAttachmentUpload(item)} /></label>
                      </div>
                      {attachmentFiles[item] && <p className="mt-2 text-xs text-body">Selected: {attachmentFiles[item]}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {false && formMode === "form3-thesis-medical" && currentStep === 6 && (
              <section className="grid gap-4">
                <h3 className="text-xl font-bold text-dark dark:text-white">Step 7: Declaration and Submission</h3>
                <input type="date" value={form.submissionDate} onChange={onFieldChange("submissionDate")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
              </section>
            )}

            {formMode === "generic" && currentStep === 0 && (
              <section className="grid gap-5">
                <h3 className="text-xl font-bold text-dark dark:text-white">
                  Researcher and Project Information
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={form.researcherName}
                    onChange={onFieldChange("researcherName")}
                    placeholder="Researcher Name"
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                  />
                  <input
                    value={form.discipline}
                    onChange={onFieldChange("discipline")}
                    placeholder="Discipline / Department"
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                  />
                  <input
                    value={form.supervisorName}
                    onChange={onFieldChange("supervisorName")}
                    placeholder="Supervisor Name"
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                  />
                  <input
                    value={form.coSupervisorName}
                    onChange={onFieldChange("coSupervisorName")}
                    placeholder="Co-Supervisor Name"
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                  />
                  <input
                    value={form.projectTitle}
                    onChange={onFieldChange("projectTitle")}
                    placeholder="Project Title"
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3 md:col-span-2"
                  />
                  <textarea
                    value={form.projectObjectives}
                    onChange={onFieldChange("projectObjectives")}
                    rows={4}
                    placeholder="Project Objectives"
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3 md:col-span-2"
                  />
                  <select
                    value={form.classification}
                    onChange={onFieldChange("classification")}
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                  >
                    <option value="">Research Classification</option>
                    <option>Social Sciences / Humanities</option>
                    <option>Medical Sciences</option>
                    <option>Interdisciplinary</option>
                  </select>
                  <input
                    value={form.expectedResponseDays}
                    onChange={onFieldChange("expectedResponseDays")}
                    type="number"
                    min={1}
                    placeholder="Expected Response (Days)"
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                  />
                </div>
              </section>
            )}

            {formMode === "generic" && currentStep === 1 && (
              <section className="grid gap-4">
                <h3 className="text-xl font-bold text-dark dark:text-white">Ethical Considerations</h3>
                <textarea
                  value={form.recruitmentMethod}
                  onChange={onFieldChange("recruitmentMethod")}
                  rows={4}
                  placeholder="Recruitment Method"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <textarea
                  value={form.sensitiveTopics}
                  onChange={onFieldChange("sensitiveTopics")}
                  rows={4}
                  placeholder="Sensitive Topics / Risks"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <textarea
                  value={form.consentProcess}
                  onChange={onFieldChange("consentProcess")}
                  rows={4}
                  placeholder="Will participants provide informed consent?"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <textarea
                  value={form.confidentiality}
                  onChange={onFieldChange("confidentiality")}
                  rows={4}
                  placeholder="Confidentiality Measures"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <textarea
                  value={form.riskMitigation}
                  onChange={onFieldChange("riskMitigation")}
                  rows={4}
                  placeholder="Risk Mitigation Plan"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
              </section>
            )}

            {formMode === "generic" && currentStep === 2 && (
              <section className="grid gap-4">
                <h3 className="text-xl font-bold text-dark dark:text-white">
                  Biomedical & Pharmaceutical Aspects
                </h3>
                <textarea
                  value={form.biomedicalDetails}
                  onChange={onFieldChange("biomedicalDetails")}
                  rows={6}
                  placeholder="Biomedical / Pharmaceutical Description"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
              </section>
            )}

            {formMode === "generic" && currentStep === 3 && (
              <section className="grid gap-4 md:grid-cols-2">
                <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">
                  Data Management
                </h3>
                <input
                  value={form.dataStorageMethod}
                  onChange={onFieldChange("dataStorageMethod")}
                  placeholder="Data Storage Method"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <input
                  value={form.cloudServices}
                  onChange={onFieldChange("cloudServices")}
                  placeholder="Cloud Services Used"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <input
                  value={form.retentionPeriod}
                  onChange={onFieldChange("retentionPeriod")}
                  placeholder="Retention Period"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <input
                  value={form.accessToData}
                  onChange={onFieldChange("accessToData")}
                  placeholder="Access to Data"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <textarea
                  value={form.dataSecurity}
                  onChange={onFieldChange("dataSecurity")}
                  rows={4}
                  placeholder="Data Security Measures"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3 md:col-span-2"
                />
                <textarea
                  value={form.futureDataUse}
                  onChange={onFieldChange("futureDataUse")}
                  rows={4}
                  placeholder="Data Sharing / Future Use"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3 md:col-span-2"
                />
              </section>
            )}

            {formMode === "generic" && currentStep === 4 && (
              <section className="grid gap-4 md:grid-cols-2">
                <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">
                  Institutional Approvals & Collaboration
                </h3>
                <input
                  value={form.researchSetting}
                  onChange={onFieldChange("researchSetting")}
                  placeholder="Research Setting / Institution"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <input
                  value={form.fundingSource}
                  onChange={onFieldChange("fundingSource")}
                  placeholder="Funding Source"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <textarea
                  value={form.approvalsDetails}
                  onChange={onFieldChange("approvalsDetails")}
                  rows={5}
                  placeholder="Approvals / Collaboration Details"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3 md:col-span-2"
                />
              </section>
            )}

            {formMode === "generic" && currentStep === 5 && (
              <section className="grid gap-4">
                <h3 className="text-xl font-bold text-dark dark:text-white">Attachments</h3>
                <p className="rounded-lg border border-dashed border-stroke p-4 text-sm dark:border-dark-3">
                  Attachment uploads can be integrated later. This step is included in the
                  workflow to preserve your ethical review structure.
                </p>
              </section>
            )}

            {formMode === "generic" && currentStep === 6 && (
              <section className="grid gap-4 md:grid-cols-2">
                <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">
                  Declaration & Submission <RequiredMark />
                </h3>
                <label className="flex items-start gap-2 rounded-lg border border-stroke px-3 py-2 outline-none focus-within:border-primary dark:border-dark-3 md:col-span-2">
                  <input
                    type="checkbox"
                    className="mt-1 shrink-0"
                    checked={form.form3DeclarationAccepted === "yes"}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm((prev) => {
                        const declarationName =
                          prev.scholarName.trim() ||
                          prev.researcherName.trim() ||
                          prev.applicantName.trim() ||
                          "_____________________";
                        return {
                          ...prev,
                          form3DeclarationAccepted: checked ? "yes" : "",
                          declaration: checked
                            ? buildMedicalEthicsDeclarationParagraph(declarationName)
                            : "",
                        };
                      });
                      setSubmitError(null);
                    }}
                  />
                  <span className="text-sm">
                    I{" "}
                    {form.scholarName.trim() ||
                      form.researcherName.trim() ||
                      form.applicantName.trim() ||
                      "_____________________"}{" "}
                    hereby certify that: I have read and understood the ethical guidelines for medical
                    and health sciences research. The information provided in this application is
                    accurate and complete to the best of my knowledge. I will conduct this research
                    strictly according to the approved protocol. I will report all adverse events
                    and protocol deviations to my supervisor and the IREB immediately. I will obtain
                    updated approvals if any significant changes to the protocol are necessary. I
                    will not proceed with data collection without formal ethical approval.
                    <RequiredMark />
                  </span>
                </label>
                <input
                  value={form.applicantName}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((prev) => {
                      const declarationName =
                        prev.scholarName.trim() ||
                        prev.researcherName.trim() ||
                        v.trim() ||
                        "_____________________";
                      return {
                        ...prev,
                        applicantName: v,
                        ...(prev.form3DeclarationAccepted === "yes"
                          ? { declaration: buildMedicalEthicsDeclarationParagraph(declarationName) }
                          : {}),
                      };
                    });
                    setSubmitError(null);
                  }}
                  placeholder="Applicant Name"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <input
                  type="date"
                  value={form.submissionDate}
                  onChange={onFieldChange("submissionDate")}
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
              </section>
            )}
              </>
            )}
          </div>
          </fieldset>

          <div className="flex items-center justify-between gap-3 border-t border-stroke px-6 py-4 dark:border-dark-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="rounded-lg border border-stroke px-4 py-2 font-medium text-dark transition hover:bg-gray-1 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              {submitError && <span className="text-xs text-red-600 dark:text-red-400">{submitError}</span>}
              {saveMessage && <span className="text-xs text-body dark:text-dark-6">{saveMessage}</span>}
              {!isViewMode && (
                <button
                  type="button"
                  onClick={handleSaveProgress}
                  disabled={isSubmitting || isSavingDraft}
                  className="rounded-lg border border-primary px-4 py-2 font-medium text-primary transition hover:bg-primary/10"
                >
                  {isSavingDraft ? "Saving..." : "Save Progress"}
                </button>
              )}
              {currentStep < activeSteps.length - 1 ? (
                <button
                  key={`next-step-${currentStep}`}
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-opacity-90"
                >
                  Next
                </button>
              ) : (
                isViewMode ? (
                  <button
                    key="close-view-mode"
                    type="button"
                    onClick={resetAndClose}
                    className="rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-opacity-90"
                  >
                    Close
                  </button>
                ) : (
                  <button
                    key="submit-application"
                    type="submit"
                    disabled={isSubmitting || isSavingDraft}
                    className="rounded-lg bg-green px-4 py-2 font-medium text-white hover:bg-green/90"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Application"}
                  </button>
                )
              )}
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
