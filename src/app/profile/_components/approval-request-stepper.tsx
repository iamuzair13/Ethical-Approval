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
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Form1ThesisForm } from "./forms/form1-thesis-form";
import { Form4ResearchPublicationMedicalForm } from "./forms/form4-research-publication-medical-form";
import { GenericApprovalForm } from "./forms/generic-approval-form";
import { Form3ThesisMedicalForm } from "./forms/form3-thesis-medical-form";
import { Form2ResearchPublicationForm } from "./forms/form2-research-publication-form";
import { Form5ResearchPublicationFacultyStaffForm } from "./forms/form5-research-publication-faculty-staff";

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

const FORM_1_REQUIRED_ATTACHMENTS = [
  "Complete Research Proposal/Protocol",
  "Research Questionnaire/Interview Guide (i.e., focus group guide)",
  "Participant Information Letter (Cover Letter)",
  "Participant Consent Form (Qualitative and mix-methods research with selective participations)",
  "Participant Information Letter Only (Quantitative research)",
  "Approval from Board of Study (BOS) and Board of Faculty (BOF)",
  "Other Institutional Approval Letter(s) (If applicable)",
];

const FORM_4_REQUIRED_ATTACHMENTS = [
  "Questionnaire/Interview Guide",
  "Participant Consent Form",
  "Participant Information Letter Only",
  "Other Institutional Approval Letter(s) (If applicable)",
];

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
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
  const formMode:
    | "form1-thesis"
    | "form3-thesis-medical"
    | "form2-research-publication"
    | "form5-research-publication-faculty-staff"
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
      : formMode === "form4-research-publication-medical"
        ? FORM_4_STEPS
        : STEPS;
  const ActiveFormWrapper =
    formMode === "form1-thesis" || formMode === "form3-thesis-medical"
      ? Form1ThesisForm
      : formMode === "form4-research-publication-medical"
        ? Form4ResearchPublicationMedicalForm
        : GenericApprovalForm;

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
            formMode === "form5-research-publication-faculty-staff"
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
            formMode === "form5-research-publication-faculty-staff"
          ? [
              form.publicationObjective1.trim(),
              form.publicationObjective2.trim(),
              form.publicationObjective3.trim(),
            ]
              .filter(Boolean)
              .join("\n")
          : form.projectObjectives.trim();
    let methodology =
      formMode === "form1-thesis" || formMode === "form3-thesis-medical"
        ? form.methodology.trim()
        : formMode === "form4-research-publication-medical" ||
            formMode === "form2-research-publication" ||
            formMode === "form5-research-publication-faculty-staff"
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
      resolvedFormId === "form3-thesis-medical" || resolvedFormId === "form4-publication-medical"
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
    setSaveMessage(`Restored draft from ${new Date(draft.savedAt).toLocaleString()}`);
  }, [activeSteps.length, draftSessionId, isPreloadedMode, mounted, open, userStorageId]);

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
    if (
      !open ||
      isViewMode ||
      formMode === "generic" ||
      !applicantProfile
    ) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      scholarName: applicantProfile.name,
      scholarSapId: applicantProfile.regNo,
      scholarEmail: applicantProfile.email,
      scholarFaculty: applicantProfile.faculty,
      scholarDepartment: applicantProfile.department,
      scholarProgram: applicantProfile.program,
    }));
  }, [applicantProfile, formMode, isViewMode, open]);

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

  if (!mounted || !open) return null;

  const onFieldChange =
    (key: keyof typeof INITIAL_FORM) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const handleNext = (e?: MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();

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
        setSaveMessage("Progress saved locally");
        return;
      }

      if (!persistDraft || !applicantProfile) {
        setSaveMessage("Progress saved");
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
        setSaveMessage(result.error ?? "Could not save to server");
        return;
      }

      if (typeof result.submissionId === "number") {
        setResolvedDraftSubmissionId(result.submissionId);
        onServerDraftSaved?.(result.submissionId);
      }
      setSaveMessage("Progress saved");
    })();
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void (async () => {
      if (isViewMode) return;
      // Prevent accidental submit from intermediate steps (e.g., while uploading files).
      if (currentStep < activeSteps.length - 1 || isSubmitting) return;
      if (isSavingDraft) {
        setSubmitError("Please wait for draft save to finish, then submit.");
        return;
      }

      const { title, objectives, methodology, type, domain } = getCoreTextFields(false);

      if (!title || !objectives || !methodology) {
        setSubmitError("Please complete the required submission fields before submitting.");
        return;
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
        setSubmitError(result.error ?? "Unable to submit application. Please try again.");
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
                onClick={() => setCurrentStep(index)}
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
                )}
              >
                {index + 1}. {title}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <fieldset disabled={isViewMode} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <ActiveFormWrapper>
            {formMode === "form1-thesis" && currentStep === 0 && (
              <section className="grid gap-6">
                <h3 className="text-xl font-bold text-dark dark:text-white">
                  Step 1: Researcher (s) and Thesis/Project Information
                </h3>

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
                  <select value={form.coSupervisorType} onChange={onFieldChange("coSupervisorType")} className="max-w-xs rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
                    <option value="UOL">Option 1: UOL</option>
                    <option value="External">Option 2: External</option>
                  </select>
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
                  <input value={form.thesisTitle} onChange={onFieldChange("thesisTitle")} placeholder="Thesis / Project Title" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <input type="date" value={form.expectedStartDate} onChange={onFieldChange("expectedStartDate")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input type="date" value={form.expectedEndDate} onChange={onFieldChange("expectedEndDate")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.researchLocations} onChange={onFieldChange("researchLocations")} placeholder="Research Location(s)" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <textarea value={form.researchObjective1} onChange={onFieldChange("researchObjective1")} placeholder="Research Objective 1" rows={2} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <textarea value={form.researchObjective2} onChange={onFieldChange("researchObjective2")} placeholder="Research Objective 2" rows={2} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <textarea value={form.researchObjective3} onChange={onFieldChange("researchObjective3")} placeholder="Research Objective 3" rows={2} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <textarea value={form.researchObjective4} onChange={onFieldChange("researchObjective4")} placeholder="Research Objective 4" rows={2} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <div className="rounded-lg border border-stroke p-3 dark:border-dark-3 md:col-span-2">
                    <p className="mb-2 text-sm font-semibold text-dark dark:text-white">
                      f) Sustainable Development Goals (multi-select)
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        "No Poverty",
                        "Zero Hunger",
                        "Good Health and Well-Being",
                        "Quality Education",
                        "Gender Equality",
                        "Clean Water and Sanitation",
                        "Affordable and Clean Energy",
                        "Decent Work and Economic Growth",
                        "Industry, Innovation, and Infrastructure",
                        "Reduced Inequalities",
                        "Sustainable Cities and Communities",
                        "Responsible Consumption and Production",
                        "Climate Action",
                        "Life Below Water",
                        "Life on Land",
                        "Peace, Justice and Strong Institutions",
                        "Partnership for the Goals",
                      ].map((item) => (
                        <label key={item} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={hasCsvOption("sdgs", item)}
                            onChange={() => toggleCsvOption("sdgs", item)}
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-stroke p-3 dark:border-dark-3 md:col-span-2">
                    <p className="mb-2 text-sm font-semibold text-dark dark:text-white">
                      g) Purpose of research (multi-select)
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        "Research",
                        "Scholarship and/or Pedagogical Research",
                        "Inter-disciplinary research",
                        "Educational qualification",
                        "Educational research and evaluation",
                        "Health Services Evaluation",
                        "Other (specify in methodology)",
                      ].map((item) => (
                        <label key={item} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={hasCsvOption("researchPurpose", item)}
                            onChange={() => toggleCsvOption("researchPurpose", item)}
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-stroke p-3 dark:border-dark-3">
                    <p className="mb-2 text-sm font-semibold text-dark dark:text-white">
                      h) Data collection method (single-select)
                    </p>
                    <div className="grid gap-2">
                      {[
                        "Interview (one-on-one, semi-structured, structured)",
                        "Focus group",
                        "Self-completion (questionnaire, dairies, survey apps)",
                        "Through observation",
                        "Through autoethnographic research",
                        "Through experiments/user-testing",
                        "Other (specify in methodology)",
                      ].map((item) => (
                        <label key={item} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="dataCollectionMethod"
                            checked={form.dataCollectionMethod === item}
                            onChange={() =>
                              setForm((prev) => ({ ...prev, dataCollectionMethod: item }))
                            }
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-stroke p-3 dark:border-dark-3">
                    <p className="mb-2 text-sm font-semibold text-dark dark:text-white">
                      i) Research population (single-select)
                    </p>
                    <div className="grid gap-2">
                      {[
                        "University students",
                        "Faculty members",
                        "Librarians, Patients/healthcare workers",
                        "Children/minors, General adults",
                        "Employees/staff members",
                        "Other (specify in methodology)",
                      ].map((item) => (
                        <label key={item} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="researchPopulation"
                            checked={form.researchPopulation === item}
                            onChange={() =>
                              setForm((prev) => ({ ...prev, researchPopulation: item }))
                            }
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <p className="mb-2 text-sm font-semibold text-dark dark:text-white">
                      j) Research Methodology (Methods and Materials)
                    </p>
                    <textarea
                      value={form.methodology}
                      onChange={onFieldChange("methodology")}
                      rows={4}
                      placeholder="Research Methodology (Methods and Materials)"
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <p className="mb-2 text-sm font-semibold text-dark dark:text-white">
                      k) How many participants will you be recruiting? (estimated range)
                    </p>
                    <select
                      value={form.participantsEstimate}
                      onChange={onFieldChange("participantsEstimate")}
                      className="w-full max-w-md rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
                    >
                      <option value="">Select range</option>
                      <option>1-20</option>
                      <option>21-50</option>
                      <option>51-100</option>
                      <option>101-150</option>
                      <option>151-200</option>
                      <option>201-300</option>
                      <option>301-400</option>
                      <option>401-500</option>
                      <option>501+</option>
                    </select>
                  </div>
                </div>
              </section>
            )}

            {formMode === "form1-thesis" && currentStep === 1 && (
              <section className="grid gap-4">
                <h3 className="text-xl font-bold text-dark dark:text-white">Step 2: Ethical Considerations</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <select value={form.involveHumanParticipants} onChange={onFieldChange("involveHumanParticipants")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.1 Human participants?</option><option>Yes</option><option>No</option></select>
                  <select value={form.collectPii} onChange={onFieldChange("collectPii")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.2 Collect PII?</option><option>Yes</option><option>No</option></select>
                  {form.collectPii === "Yes" && (
                    <textarea
                      value={form.piiTypes}
                      onChange={onFieldChange("piiTypes")}
                      rows={2}
                      placeholder="PII Types (Name, Email, ID, MRN, Audio/Video, Other)"
                      className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2"
                    />
                  )}
                  <div className="rounded-lg border border-stroke p-3 dark:border-dark-3 md:col-span-2">
                    <p className="mb-2 text-sm font-semibold text-dark dark:text-white">
                      2.3 How will participants be recruited? (multi-select)
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        "Emails",
                        "Google Forms/ Online Surveys",
                        "Social Media (Facebook, Instagram, etc.)",
                        "LinkedIn (professional networking platforms)",
                        "Institutional Mailing Lists",
                        "Online forms",
                        "Academic Networks",
                        "In-person",
                        "Other",
                      ].map((item) => (
                        <label key={item} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={hasCsvOption("recruitmentChannels", item)}
                            onChange={() => toggleCsvOption("recruitmentChannels", item)}
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <select value={form.informedConsentType} onChange={onFieldChange("informedConsentType")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.4 Informed consent type</option><option>Written Consent</option><option>Oral Consent</option><option>Waived</option><option>N/A</option></select>
                  <select value={form.preApprovalDataCollected} onChange={onFieldChange("preApprovalDataCollected")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.5 Data collected before approval?</option><option>Yes</option><option>No</option></select>
                  {form.preApprovalDataCollected === "Yes" && (
                    <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200 md:col-span-2">
                      Note: Please attach the participant information letter (cover letter)
                      and participant consent form in the attachments section.
                    </p>
                  )}
                  <select value={form.canWithdraw} onChange={onFieldChange("canWithdraw")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.6 Participants can withdraw?</option><option>Yes</option><option>No</option></select>
                  <select value={form.compensation} onChange={onFieldChange("compensation")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.7 Compensation for participants?</option><option>Yes</option><option>No</option></select>
                  <div className="rounded-lg border border-stroke p-3 dark:border-dark-3 md:col-span-2">
                    <p className="mb-2 text-sm font-semibold text-dark dark:text-white">
                      2.8 Confidentiality and data privacy (multi-select)
                    </p>
                    <div className="grid gap-2">
                      {[
                        "Anonymization/Pseudonymization",
                        "Secure Storage (Electronic/Physical)",
                        "Access Restrictions and Confidentiality Agreements",
                        "No Disclosure of Identity",
                        "Others",
                      ].map((item) => (
                        <label key={item} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={hasCsvOption("confidentialityOptions", item)}
                            onChange={() => toggleCsvOption("confidentialityOptions", item)}
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                    {hasCsvOption("confidentialityOptions", "Others") && (
                      <input
                        value={form.confidentialityOtherDetails}
                        onChange={onFieldChange("confidentialityOtherDetails")}
                        placeholder="Others, please specify"
                        className="mt-3 w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
                      />
                    )}
                  </div>
                  <select value={form.vulnerablePopulation} onChange={onFieldChange("vulnerablePopulation")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.9 Vulnerable populations?</option><option>Yes</option><option>No</option></select>
                  {form.vulnerablePopulation === "Yes" && (
                    <textarea
                      value={form.vulnerableSafeguards}
                      onChange={onFieldChange("vulnerableSafeguards")}
                      rows={2}
                      placeholder="If yes, describe special protections and ethical safeguards."
                      className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2"
                    />
                  )}
                  <select value={form.sensitiveTopics} onChange={onFieldChange("sensitiveTopics")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.10 Sensitive topics?</option><option>Yes</option><option>No</option></select>
                  {form.sensitiveTopics === "Yes" && (
                    <div className="rounded-lg border border-stroke p-3 dark:border-dark-3 md:col-span-2">
                      <p className="mb-2 text-sm font-semibold text-dark dark:text-white">
                        If yes, select all applicable sensitive topics
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          "Trauma/PTSD",
                          "Physical/Emotional/Psychological Abuse",
                          "Assault",
                          "Mental Health",
                          "Domestic Abuse",
                          "Stigmatized Health Conditions",
                          "Immigration/Refugee Status",
                          "Others",
                        ].map((item) => (
                          <label key={item} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={hasCsvOption("sensitiveTopicTypes", item)}
                              onChange={() => toggleCsvOption("sensitiveTopicTypes", item)}
                            />
                            <span>{item}</span>
                          </label>
                        ))}
                      </div>
                      {hasCsvOption("sensitiveTopicTypes", "Others") && (
                        <input
                          value={form.sensitiveTopicOtherDetails}
                          onChange={onFieldChange("sensitiveTopicOtherDetails")}
                          placeholder="Others, please specify"
                          className="mt-3 w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
                        />
                      )}
                    </div>
                  )}
                  <select value={form.potentialRisks} onChange={onFieldChange("potentialRisks")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.11 Potential adverse effects?</option><option>Yes</option><option>No</option></select>
                  {form.potentialRisks === "Yes" && (
                    <textarea
                      value={form.potentialRiskDetails}
                      onChange={onFieldChange("potentialRiskDetails")}
                      rows={2}
                      placeholder="If yes, further elaborate."
                      className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2"
                    />
                  )}
                  <select value={form.dataRetentionYears} onChange={onFieldChange("dataRetentionYears")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.12 Data retention period</option><option>1-5 years</option><option>6-10 years</option><option>11-15 years</option><option>More than 16 years</option></select>
                  {form.dataRetentionYears === "More than 16 years" && (
                    <textarea
                      value={form.longRetentionReason}
                      onChange={onFieldChange("longRetentionReason")}
                      rows={2}
                      placeholder="If More than 16 years is selected, explain why longer retention is needed."
                      className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
                    />
                  )}
                  <select value={form.conflictOfInterest} onChange={onFieldChange("conflictOfInterest")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.13 Conflict of interest</option><option>Yes</option><option>No</option><option>Undecided</option></select>
                  {form.conflictOfInterest === "Yes" && (
                    <textarea
                      value={form.conflictManagement}
                      onChange={onFieldChange("conflictManagement")}
                      rows={2}
                      placeholder="If yes, explain and describe how it will be managed."
                      className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
                    />
                  )}
                  <select value={form.recordsWithoutConsent} onChange={onFieldChange("recordsWithoutConsent")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.14 Access records without consent?</option><option>Yes</option><option>No</option></select>
                  {form.recordsWithoutConsent === "Yes" && (
                    <textarea
                      value={form.recordsWithoutConsentJustification}
                      onChange={onFieldChange("recordsWithoutConsentJustification")}
                      rows={2}
                      placeholder="If yes, justify and provide institutional approval documentation."
                      className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2"
                    />
                  )}
                </div>
              </section>
            )}

            {formMode === "form1-thesis" && currentStep === 2 && (
              <section className="grid gap-4 md:grid-cols-2">
                <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">
                  Step 3: Institutional Approvals & Collaboration
                </h3>
                <select value={form.institutionalFunding} onChange={onFieldChange("institutionalFunding")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">3.1 Institutional funding?</option><option>Yes</option><option>No</option></select>
                <select value={form.externalFunding} onChange={onFieldChange("externalFunding")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">3.2 External funding?</option><option>Yes</option><option>No</option></select>
                <select value={form.internationalCollaboration} onChange={onFieldChange("internationalCollaboration")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">3.3 International collaboration?</option><option>Yes</option><option>No</option></select>
                <select value={form.conductedAbroad} onChange={onFieldChange("conductedAbroad")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">3.4 Conducted abroad?</option><option>Yes</option><option>No</option></select>
                {form.conductedAbroad === "Yes" && (
                  <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200 md:col-span-2">
                    Note: If yes, the concerned institute&apos;s ethical approval form must
                    be attached in the concerned section.
                  </p>
                )}
                {form.internationalCollaboration === "Yes" && (
                  <textarea
                    value={form.internationalCollaborationDetails}
                    onChange={onFieldChange("internationalCollaborationDetails")}
                    rows={4}
                    placeholder="If yes, give international collaboration details (if not provided in Step 1)."
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2"
                  />
                )}
              </section>
            )}

            {formMode === "form1-thesis" && currentStep === 3 && (
              <section className="grid gap-4">
                <h3 className="text-xl font-bold text-dark dark:text-white">Step 4: Required Attachments</h3>
                <p className="text-sm">
                  Please attach the following documents (check all that apply):
                </p>
                <div className="grid gap-2">
                  {FORM_1_REQUIRED_ATTACHMENTS.map((item) => (
                    <div
                      key={item}
                      className="rounded border border-stroke px-3 py-2 dark:border-dark-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={hasCsvOption("requiredAttachments", item)}
                            onChange={() => toggleCsvOption("requiredAttachments", item)}
                          />
                          <span className="text-sm">{item}</span>
                        </label>
                        <label className="cursor-pointer rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10">
                          Upload document
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleRequiredAttachmentUpload(item)}
                          />
                        </label>
                      </div>
                      {attachmentFiles[item] && (
                        <p className="mt-2 text-xs text-body">Selected: {attachmentFiles[item]}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="rounded border border-dashed border-stroke p-3 dark:border-dark-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-dark dark:text-white">
                      Additional Documents
                    </p>
                    <button
                      type="button"
                      onClick={() => setExtraUploadFiles((prev) => [...prev, ""])}
                      className="inline-flex size-8 items-center justify-center rounded-full border border-primary text-lg font-bold text-primary transition hover:bg-primary/10"
                      aria-label="Add additional upload"
                    >
                      +
                    </button>
                  </div>
                  <div className="grid gap-3">
                    {extraUploadFiles.map((fileName, index) => (
                      <div key={`${index}-extra-upload`} className="rounded border border-stroke px-3 py-2 dark:border-dark-3">
                        <label className="inline-block cursor-pointer rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10">
                          Upload document
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleExtraUploadChange(index)}
                          />
                        </label>
                        {fileName && (
                          <p className="mt-2 text-xs text-body">Selected: {fileName}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {formMode === "form1-thesis" && currentStep === 4 && (
              <section className="grid gap-4">
                <h3 className="text-xl font-bold text-dark dark:text-white">Step 5: Declaration and Submission</h3>
                <textarea
                  value={form.declaration}
                  onChange={onFieldChange("declaration")}
                  rows={5}
                  placeholder="Declaration text / acknowledgement"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
                />
                <label className="flex items-center gap-2 rounded border border-stroke px-3 py-2 dark:border-dark-3">
                  <input
                    type="checkbox"
                    checked={form.declarationAccepted === "yes"}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        declarationAccepted: e.target.checked ? "yes" : "",
                      }))
                    }
                  />
                  <span className="text-sm">I certify the information is accurate and I will follow approved protocols.</span>
                </label>
                <input
                  value={form.applicantName}
                  onChange={onFieldChange("applicantName")}
                  placeholder="Applicant Name"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
                />
                <input
                  type="date"
                  value={form.submissionDate}
                  onChange={onFieldChange("submissionDate")}
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
                />
              </section>
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
                  <textarea value={form.researchObjective1} onChange={onFieldChange("researchObjective1")} rows={2} placeholder="Research Objective 1" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <textarea value={form.researchObjective2} onChange={onFieldChange("researchObjective2")} rows={2} placeholder="Research Objective 2" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <textarea value={form.researchObjective3} onChange={onFieldChange("researchObjective3")} rows={2} placeholder="Research Objective 3" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <textarea value={form.researchObjective4} onChange={onFieldChange("researchObjective4")} rows={2} placeholder="Research Objective 4" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <textarea value={form.methodology} onChange={onFieldChange("methodology")} rows={4} placeholder="Research Methodology (Methods and Materials)" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <div><p className="mb-2 text-sm font-semibold text-dark dark:text-white">Participants Estimate</p><select value={form.participantsEstimate} onChange={onFieldChange("participantsEstimate")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Participants Estimate</option><option>1-20</option><option>21-50</option><option>51-100</option><option>101-150</option><option>151-200</option><option>201-300</option><option>301-400</option><option>401-500</option><option>501+</option></select></div>
                </div>
              </section>
            )}

            {false && formMode === "form3-thesis-medical" && currentStep === 1 && (
              <section className="grid gap-4 md:grid-cols-2">
                <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">Step 2: Ethical Considerations</h3>
                <select value={form.involveHumanParticipants} onChange={onFieldChange("involveHumanParticipants")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.1 Human subjects/patients?</option><option>Yes</option><option>No</option></select>
                <select value={form.collectPii} onChange={onFieldChange("collectPii")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.2 Collect PII?</option><option>Yes</option><option>No</option></select>
                <div className="rounded-lg border border-stroke p-3 dark:border-dark-3 md:col-span-2"><p className="mb-2 text-sm font-semibold text-dark dark:text-white">2.3 Recruitment channels (multi-select)</p><div className="grid gap-2 sm:grid-cols-2">{["Emails","Google Forms/ Online Surveys","Social Media (Facebook, Instagram, etc.)","LinkedIn (professional networking platforms)","Institutional Mailing Lists","Online forms","Academic Networks","In-person","Other"].map((item) => (<label key={item} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasCsvOption("recruitmentChannels", item)} onChange={() => toggleCsvOption("recruitmentChannels", item)} /><span>{item}</span></label>))}</div></div>
                <select value={form.informedConsentType} onChange={onFieldChange("informedConsentType")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.4 Informed consent</option><option>Written informed consent</option><option>Oral informed consent (with witness)</option><option>Waiver of consent</option><option>Not applicable</option></select>
                <select value={form.preApprovalDataCollected} onChange={onFieldChange("preApprovalDataCollected")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.5 Data collected before approval?</option><option>Yes</option><option>No</option></select>
                <select value={form.canWithdraw} onChange={onFieldChange("canWithdraw")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.7 Can withdraw at any time?</option><option>Yes</option><option>No</option></select>
                <select value={form.compensation} onChange={onFieldChange("compensation")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.8 Receive compensation?</option><option>Yes</option><option>No</option></select>
                <textarea value={form.adverseEventsManagement} onChange={onFieldChange("adverseEventsManagement")} rows={3} placeholder="2.9 Adverse events / complaint management" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                <select value={form.publicationBiologicalSpecimens} onChange={onFieldChange("publicationBiologicalSpecimens")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.10 Biological specimens involved?</option><option>Yes</option><option>No</option></select>
                {form.publicationBiologicalSpecimens === "Yes" && <textarea value={form.publicationBiologicalSpecimenDetails} onChange={onFieldChange("publicationBiologicalSpecimenDetails")} rows={2} placeholder="Describe biosafety collection/storage/handling." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
                <select value={form.researchRiskLevel} onChange={onFieldChange("researchRiskLevel")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.11 Risk level</option><option>Minimal risk</option><option>Low risk</option><option>Moderate risk</option><option>High risk</option></select>
                {(form.researchRiskLevel === "Moderate risk" || form.researchRiskLevel === "High risk") && <textarea value={form.researchRiskJustification} onChange={onFieldChange("researchRiskJustification")} rows={2} placeholder="Justify selected risk level." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
                <textarea value={form.potentialRiskDetails} onChange={onFieldChange("potentialRiskDetails")} rows={2} placeholder="2.12 Potential risks and adverse effects" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                <select value={form.conflictOfInterest} onChange={onFieldChange("conflictOfInterest")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.13 Conflict of interest?</option><option>Yes</option><option>No</option><option>Undecided</option></select>
                {form.conflictOfInterest === "Yes" && <textarea value={form.conflictManagement} onChange={onFieldChange("conflictManagement")} rows={2} placeholder="Provide full disclosure." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
              </section>
            )}

            {false && formMode === "form3-thesis-medical" && currentStep === 2 && (
              <section className="grid gap-4 md:grid-cols-2">
                <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">Step 3: Biomedical & Pharmaceutical Aspects</h3>
                <select value={form.publicationPharmaInterventions} onChange={onFieldChange("publicationPharmaInterventions")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">3.1 Involve pharmaceutical substances/drug administration?</option><option>Yes</option><option>No</option></select>
                <input value={form.drugName} onChange={onFieldChange("drugName")} placeholder="3.2 Drug name/classification" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <input value={form.drugDosageFrequency} onChange={onFieldChange("drugDosageFrequency")} placeholder="Dosage and frequency" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <input value={form.drugKnownSideEffects} onChange={onFieldChange("drugKnownSideEffects")} placeholder="Known side effects" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                <select value={form.drugRegulatoryApproval} onChange={onFieldChange("drugRegulatoryApproval")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">3.3 Regulatory/ethical approval</option><option>Yes</option><option>No</option><option>Pending</option><option>Not Applicable</option></select>
                <select value={form.monitoredAfterAdministration} onChange={onFieldChange("monitoredAfterAdministration")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">3.5 Monitor delayed adverse effects?</option><option>Yes</option><option>No</option><option>Not Applicable</option></select>
                {form.monitoredAfterAdministration === "Yes" && <input value={form.followUpDuration} onChange={onFieldChange("followUpDuration")} placeholder="Follow-up duration" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />}
                <textarea value={form.emergencyProcedures} onChange={onFieldChange("emergencyProcedures")} rows={3} placeholder="3.6 Emergency procedures and monitoring notes" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                <select value={form.publicationAnimalSubjects} onChange={onFieldChange("publicationAnimalSubjects")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">3.7 Animal subjects used?</option><option>Yes</option><option>No</option></select>
                <select value={form.publicationAnimalEthicsApproval} onChange={onFieldChange("publicationAnimalEthicsApproval")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">3.8 Ethics committee approval for animal studies</option><option>Yes</option><option>No</option><option>Pending</option><option>Not Applicable</option></select>
              </section>
            )}

            {false && formMode === "form3-thesis-medical" && currentStep === 3 && (
              <section className="grid gap-4 md:grid-cols-2">
                <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">Step 4: Data Management</h3>
                <div className="rounded-lg border border-stroke p-3 dark:border-dark-3 md:col-span-2"><p className="mb-2 text-sm font-semibold text-dark dark:text-white">4.1 Data protection (multi-select)</p><div className="grid gap-2 sm:grid-cols-2">{["Anonymization/Pseudonymization","Secure Storage (Electronic/Physical)","Access Restrictions and Confidentiality Agreements","No Disclosure of Identity","Third-Party Agreement","Others"].map((item) => (<label key={item} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasCsvOption("dataProtectionOptions", item)} onChange={() => toggleCsvOption("dataProtectionOptions", item)} /><span>{item}</span></label>))}</div></div>
                <select value={form.sharedWithThirdParties} onChange={onFieldChange("sharedWithThirdParties")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">4.2 Share with third parties?</option><option>Yes</option><option>No</option></select>
                {form.sharedWithThirdParties === "Yes" && <textarea value={form.thirdPartySharingDetails} onChange={onFieldChange("thirdPartySharingDetails")} rows={2} placeholder="Institution, purpose, safeguards." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
                <select value={form.cloudPlatformsUsed} onChange={onFieldChange("cloudPlatformsUsed")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">4.3 Use cloud/online platforms?</option><option>Yes</option><option>No</option></select>
                {form.cloudPlatformsUsed === "Yes" && <input value={form.cloudPlatformDetails} onChange={onFieldChange("cloudPlatformDetails")} placeholder="Specify platform(s)" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />}
                <select value={form.futureResearchDataUse} onChange={onFieldChange("futureResearchDataUse")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">4.4 Future data use?</option><option>Yes</option><option>No</option></select>
                {form.futureResearchDataUse === "Yes" && <textarea value={form.futureResearchDataUseConditions} onChange={onFieldChange("futureResearchDataUseConditions")} rows={2} placeholder="Specify conditions." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
                <select value={form.dataRetentionYears} onChange={onFieldChange("dataRetentionYears")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">4.5 Data retention period</option><option>1-5 years</option><option>6-10 years</option><option>11-15 years</option><option>More than 16 years</option></select>
                {form.dataRetentionYears === "More than 16 years" && <textarea value={form.longRetentionReason} onChange={onFieldChange("longRetentionReason")} rows={2} placeholder="Explain longer retention need." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />}
              </section>
            )}

            {false && formMode === "form3-thesis-medical" && currentStep === 4 && (
              <section className="grid gap-4 md:grid-cols-2">
                <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">Step 5: Institutional Approvals & Collaborations</h3>
                <select value={form.healthcareExternalInstitutions} onChange={onFieldChange("healthcareExternalInstitutions")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">5.1 Conducted at healthcare/external institutions?</option><option>Yes</option><option>No</option></select>
                <select value={form.institutionalFunding} onChange={onFieldChange("institutionalFunding")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">5.2 Institutional funding?</option><option>Yes</option><option>No</option></select>
                <select value={form.externalFunding} onChange={onFieldChange("externalFunding")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">5.3 External funding?</option><option>Yes</option><option>No</option></select>
                <select value={form.internationalCollaboration} onChange={onFieldChange("internationalCollaboration")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">5.4 International collaboration?</option><option>Yes</option><option>No</option></select>
                {form.internationalCollaboration === "Yes" && <textarea value={form.internationalCollaborationDetails} onChange={onFieldChange("internationalCollaborationDetails")} rows={3} placeholder="Provide collaboration details." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
                <select value={form.conductedAbroad} onChange={onFieldChange("conductedAbroad")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">5.5 Conducted overseas/abroad?</option><option>Yes</option><option>No</option></select>
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
                <textarea value={form.declaration} onChange={onFieldChange("declaration")} rows={6} placeholder="I certify all details are accurate, I will follow approved protocol, and no data collection will start without ethical approval." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <label className="flex items-center gap-2 rounded border border-stroke px-3 py-2 dark:border-dark-3"><input type="checkbox" checked={form.form3DeclarationAccepted === "yes"} onChange={(e) => setForm((prev) => ({ ...prev, form3DeclarationAccepted: e.target.checked ? "yes" : "" }))} /><span className="text-sm">I agree with this declaration.</span></label>
                <input value={form.applicantName} onChange={onFieldChange("applicantName")} placeholder="Applicant Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <input type="date" value={form.submissionDate} onChange={onFieldChange("submissionDate")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
              </section>
            )}

            {formMode === "form4-research-publication-medical" && currentStep === 0 && (
              <section className="grid gap-6">
                <h3 className="text-xl font-bold text-dark dark:text-white">
                  Step 1: Scholar&apos;s Information
                </h3>
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
                  <h4 className="font-semibold text-dark dark:text-white md:col-span-2">1.2 Coauthor&apos;s Information</h4>
                  <input value={form.coauthorSapId} onChange={onFieldChange("coauthorSapId")} placeholder="SAP ID" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.coauthorName} onChange={onFieldChange("coauthorName")} placeholder="Coauthor's Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.coauthorEmail} onChange={onFieldChange("coauthorEmail")} placeholder="Email" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.coauthorFaculty} onChange={onFieldChange("coauthorFaculty")} placeholder="Faculty" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.coauthorDepartment} onChange={onFieldChange("coauthorDepartment")} placeholder="Department" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                </div>
                <div className="grid gap-4 rounded-lg border border-stroke p-4 dark:border-dark-3">
                  <h4 className="font-semibold text-dark dark:text-white">1.3 Co-supervisor (Author 1)</h4>
                  <select value={form.publicationCoAuthor1Type} onChange={onFieldChange("publicationCoAuthor1Type")} className="max-w-xs rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
                    <option value="UOL">Option 1: UOL</option>
                    <option value="External">Option 2: External</option>
                  </select>
                  <div className="grid gap-4 md:grid-cols-2">
                    {form.publicationCoAuthor1Type === "UOL" ? (
                      <>
                        <input value={form.publicationAuthor1UolSapId} onChange={onFieldChange("publicationAuthor1UolSapId")} placeholder="SAP ID" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.publicationAuthor1UolName} onChange={onFieldChange("publicationAuthor1UolName")} placeholder="Coauthor's Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.publicationAuthor1UolEmail} onChange={onFieldChange("publicationAuthor1UolEmail")} placeholder="Email" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.publicationAuthor1UolFaculty} onChange={onFieldChange("publicationAuthor1UolFaculty")} placeholder="Faculty" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.publicationAuthor1UolDepartment} onChange={onFieldChange("publicationAuthor1UolDepartment")} placeholder="Department" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                      </>
                    ) : (
                      <>
                        <input value={form.publicationAuthor1ExternalName} onChange={onFieldChange("publicationAuthor1ExternalName")} placeholder="Co-author Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.publicationAuthor1ExternalEmail} onChange={onFieldChange("publicationAuthor1ExternalEmail")} placeholder="Email" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.publicationAuthor1ExternalUniversity} onChange={onFieldChange("publicationAuthor1ExternalUniversity")} placeholder="University Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.publicationAuthor1ExternalFaculty} onChange={onFieldChange("publicationAuthor1ExternalFaculty")} placeholder="Faculty" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.publicationAuthor1ExternalDepartment} onChange={onFieldChange("publicationAuthor1ExternalDepartment")} placeholder="Department" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                      </>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 rounded-lg border border-stroke p-4 dark:border-dark-3">
                  <h4 className="font-semibold text-dark dark:text-white">Add another co-supervisor</h4>
                  <select value={form.publicationCoAuthor2Type} onChange={onFieldChange("publicationCoAuthor2Type")} className="max-w-xs rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
                    <option value="UOL">Option 1: UOL</option>
                    <option value="External">Option 2: External</option>
                  </select>
                  <div className="grid gap-4 md:grid-cols-2">
                    {form.publicationCoAuthor2Type === "UOL" ? (
                      <>
                        <input value={form.publicationAuthor2UolSapId} onChange={onFieldChange("publicationAuthor2UolSapId")} placeholder="SAP ID" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.publicationAuthor2UolName} onChange={onFieldChange("publicationAuthor2UolName")} placeholder="Coauthor's Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.publicationAuthor2UolEmail} onChange={onFieldChange("publicationAuthor2UolEmail")} placeholder="Email" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.publicationAuthor2UolFaculty} onChange={onFieldChange("publicationAuthor2UolFaculty")} placeholder="Faculty" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.publicationAuthor2UolDepartment} onChange={onFieldChange("publicationAuthor2UolDepartment")} placeholder="Department" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                      </>
                    ) : (
                      <>
                        <input value={form.publicationAuthor2ExternalName} onChange={onFieldChange("publicationAuthor2ExternalName")} placeholder="Co-author Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.publicationAuthor2ExternalEmail} onChange={onFieldChange("publicationAuthor2ExternalEmail")} placeholder="Email" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.publicationAuthor2ExternalUniversity} onChange={onFieldChange("publicationAuthor2ExternalUniversity")} placeholder="University Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.publicationAuthor2ExternalFaculty} onChange={onFieldChange("publicationAuthor2ExternalFaculty")} placeholder="Faculty" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                        <input value={form.publicationAuthor2ExternalDepartment} onChange={onFieldChange("publicationAuthor2ExternalDepartment")} placeholder="Department" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                      </>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 rounded-lg border border-stroke p-4 dark:border-dark-3">
                  <h4 className="font-semibold text-dark dark:text-white">1.3 External researcher in team?</h4>
                  <select value={form.hasExternalResearcher} onChange={onFieldChange("hasExternalResearcher")} className="max-w-xs rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Select</option><option>Yes</option><option>No</option></select>
                  {form.hasExternalResearcher === "Yes" && (
                    <textarea value={form.externalResearcherDetails} onChange={onFieldChange("externalResearcherDetails")} rows={3} placeholder="Provide names, qualifications and affiliations." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  )}
                </div>
                <div className="grid gap-4 rounded-lg border border-stroke p-4 dark:border-dark-3 md:grid-cols-2">
                  <h4 className="font-semibold text-dark dark:text-white md:col-span-2">1.4 Research Details</h4>
                  <input value={form.publicationTitle} onChange={onFieldChange("publicationTitle")} placeholder="Research Title" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <textarea value={form.publicationObjective1} onChange={onFieldChange("publicationObjective1")} rows={2} placeholder="Research Objective 1" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <textarea value={form.publicationObjective2} onChange={onFieldChange("publicationObjective2")} rows={2} placeholder="Research Objective 2" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <textarea value={form.publicationObjective3} onChange={onFieldChange("publicationObjective3")} rows={2} placeholder="Research Objective 3" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                  <div className="rounded-lg border border-stroke p-3 dark:border-dark-3 md:col-span-2">
                    <p className="mb-2 text-sm font-semibold text-dark dark:text-white">Sustainable Development Goals (multi-select)</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {["No Poverty","Zero Hunger","Good Health and Well-Being","Quality Education","Gender Equality","Clean Water and Sanitation","Affordable and Clean Energy","Decent Work and Economic Growth","Industry, Innovation, and Infrastructure","Reduced Inequalities","Sustainable Cities and Communities","Responsible Consumption and Production","Climate Action","Life Below Water","Life on Land","Peace, Justice and Strong Institutions","Partnership for the Goals"].map((item) => (
                        <label key={item} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={hasCsvOption("sdgs", item)} onChange={() => toggleCsvOption("sdgs", item)} />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <select value={form.publicationParticipantsEstimate} onChange={onFieldChange("publicationParticipantsEstimate")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Participants Estimate</option><option>1-20</option><option>21-50</option><option>51-100</option><option>101-150</option><option>151-200</option><option>201-300</option><option>301-400</option><option>401-500</option><option>501+</option></select>
                  <select value={form.publicationPopulationType} onChange={onFieldChange("publicationPopulationType")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
                    <option value="">Research Population (type)</option>
                    <option>University students</option><option>Faculty members</option><option>Researchers/Laboratory staff</option><option>Patients/clinical participants</option><option>Specific disease groups/diagnosed patients</option><option>Patients/healthcare workers</option><option>Children/minors</option><option>General adults</option><option>Employees/staff members</option><option>Other (specify in methodology)</option>
                  </select>
                  <textarea value={form.publicationMethodology} onChange={onFieldChange("publicationMethodology")} rows={4} placeholder="Study Design and Methodology" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                </div>
              </section>
            )}

            {formMode === "form4-research-publication-medical" && currentStep === 1 && (
              <section className="grid gap-4 md:grid-cols-2">
                <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">Step 2: Ethical Considerations</h3>
                <select value={form.publicationHumanSubjects} onChange={onFieldChange("publicationHumanSubjects")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.1 Human subjects involved?</option><option>Yes</option><option>No</option></select>
                <div className="rounded-lg border border-stroke p-3 dark:border-dark-3 md:col-span-2">
                  <p className="mb-2 text-sm font-semibold text-dark dark:text-white">2.2 Recruitment channels (multi-select)</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {["Emails","Google Forms/ Online Surveys","Social Media (Facebook, Instagram, etc.)","LinkedIn (professional networking platforms)","Institutional Mailing Lists","Online forms","Academic Networks","In-person","Other"].map((item) => (
                      <label key={item} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={hasCsvOption("publicationRecruitmentChannels", item)} onChange={() => toggleCsvOption("publicationRecruitmentChannels", item)} />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <select value={form.publicationInformedConsent} onChange={onFieldChange("publicationInformedConsent")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.3 Informed consent</option><option>Written informed consent</option><option>Oral informed consent</option><option>Waived consent</option><option>Not applicable</option></select>
                <select value={form.publicationPreApprovalDataCollected} onChange={onFieldChange("publicationPreApprovalDataCollected")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.4 Data collected before approval?</option><option>Yes</option><option>No</option><option>Not applicable</option></select>
                {form.publicationPreApprovalDataCollected === "Yes" && <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200 md:col-span-2">Note: Please attach participant information letter and participant consent form.</p>}
                <select value={form.publicationCanWithdraw} onChange={onFieldChange("publicationCanWithdraw")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.5 Participants can withdraw?</option><option>Yes</option><option>No</option></select>
                <select value={form.publicationCompensation} onChange={onFieldChange("publicationCompensation")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.6 Compensation?</option><option>Yes</option><option>No</option></select>
                <select value={form.publicationAnonymized} onChange={onFieldChange("publicationAnonymized")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.7 Identities anonymized?</option><option>Yes</option><option>No</option><option>Partially</option><option>N/A</option></select>
                <select value={form.publicationSensitiveHealthTopics} onChange={onFieldChange("publicationSensitiveHealthTopics")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.8 Sensitive health topics?</option><option>Yes</option><option>No</option></select>
                <select value={form.publicationVulnerablePopulation} onChange={onFieldChange("publicationVulnerablePopulation")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.9 Vulnerable populations?</option><option>Yes</option><option>No</option><option>N/A</option></select>
                {form.publicationVulnerablePopulation === "Yes" && <textarea value={form.publicationVulnerableProtections} onChange={onFieldChange("publicationVulnerableProtections")} rows={2} placeholder="Confirm ethical protections in place." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
                <select value={form.publicationBiologicalSpecimens} onChange={onFieldChange("publicationBiologicalSpecimens")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.10 Biological specimens involved?</option><option>Yes</option><option>No</option></select>
                {form.publicationBiologicalSpecimens === "Yes" && <textarea value={form.publicationBiologicalSpecimenDetails} onChange={onFieldChange("publicationBiologicalSpecimenDetails")} rows={2} placeholder="Describe collection, storage and biosafety measures." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
                <select value={form.publicationPharmaInterventions} onChange={onFieldChange("publicationPharmaInterventions")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.11 Pharmacological/therapeutic interventions?</option><option>Yes</option><option>No</option></select>
                {form.publicationPharmaInterventions === "Yes" && <textarea value={form.publicationPharmaInterventionDetails} onChange={onFieldChange("publicationPharmaInterventionDetails")} rows={2} placeholder="Provide drug names, dosages, adverse effects and approval details." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
                <select value={form.publicationAnimalSubjects} onChange={onFieldChange("publicationAnimalSubjects")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.12 Animal subjects used?</option><option>Yes</option><option>No</option></select>
                {form.publicationAnimalSubjects === "Yes" && <textarea value={form.publicationAnimalWelfareDetails} onChange={onFieldChange("publicationAnimalWelfareDetails")} rows={2} placeholder="Justify animal use and describe welfare measures." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
                <select value={form.publicationAnimalEthicsApproval} onChange={onFieldChange("publicationAnimalEthicsApproval")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.13 Animal ethics committee approval?</option><option>Yes</option><option>No</option><option>Pending</option><option>Not Applicable</option></select>
                <select value={form.publicationConflictsUndisclosed} onChange={onFieldChange("publicationConflictsUndisclosed")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.14 Undisclosed conflicts/funding?</option><option>Yes</option><option>No</option><option>Undecided</option></select>
                {form.publicationConflictsUndisclosed === "Yes" && <textarea value={form.publicationConflictDisclosureDetails} onChange={onFieldChange("publicationConflictDisclosureDetails")} rows={2} placeholder="Provide complete disclosure details." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
                <textarea value={form.publicationPotentialRisks} onChange={onFieldChange("publicationPotentialRisks")} rows={2} placeholder="2.15 Potential risks and adverse effects." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                <select value={form.publicationSimultaneousJournals} onChange={onFieldChange("publicationSimultaneousJournals")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.16 Submitted to multiple journals?</option><option>Yes</option><option>No</option></select>
                <select value={form.publicationPreviouslyPublished} onChange={onFieldChange("publicationPreviouslyPublished")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.17 Previously published?</option><option>Yes</option><option>No</option></select>
              </section>
            )}

            {formMode === "form4-research-publication-medical" && currentStep === 2 && (
              <section className="grid gap-4 md:grid-cols-2">
                <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">Step 3: Data Integrity and Permissions</h3>
                <select value={form.publicationDataAccurate} onChange={onFieldChange("publicationDataAccurate")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">3.1 Data presented accurately and completely?</option><option>Yes</option><option>No</option><option>Partial disclosure</option></select>
                <select value={form.publicationReportingGuidelines} onChange={onFieldChange("publicationReportingGuidelines")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">3.2 Reporting guidelines followed?</option><option>Yes</option><option>No</option><option>Not applicable</option></select>
                <select value={form.publicationAdverseEventsReported} onChange={onFieldChange("publicationAdverseEventsReported")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">3.3 Adverse events accurately reported?</option><option>Yes</option><option>No</option><option>Not applicable</option></select>
                <select value={form.publicationThirdPartyPermissions} onChange={onFieldChange("publicationThirdPartyPermissions")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">3.4 Third-party permissions required?</option><option>Yes</option><option>No</option></select>
                {form.publicationThirdPartyPermissions === "Yes" && <textarea value={form.publicationThirdPartyPermissionDetails} onChange={onFieldChange("publicationThirdPartyPermissionDetails")} rows={3} placeholder="Confirm all required permissions are obtained." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
              </section>
            )}

            {formMode === "form4-research-publication-medical" && currentStep === 3 && (
              <section className="grid gap-4 md:grid-cols-2">
                <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">Step 4: Institutional Approvals & Collaboration</h3>
                <select value={form.institutionalFunding} onChange={onFieldChange("institutionalFunding")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">4.1 Institutional funding?</option><option>Yes</option><option>No</option></select>
                <select value={form.externalFunding} onChange={onFieldChange("externalFunding")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">4.2 External funding?</option><option>Yes</option><option>No</option></select>
                <select value={form.internationalCollaboration} onChange={onFieldChange("internationalCollaboration")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">4.3 International collaboration?</option><option>Yes</option><option>No</option></select>
                <select value={form.conductedAbroad} onChange={onFieldChange("conductedAbroad")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">4.4 Conducted overseas/abroad?</option><option>Yes</option><option>No</option></select>
                {form.internationalCollaboration === "Yes" && <textarea value={form.internationalCollaborationDetails} onChange={onFieldChange("internationalCollaborationDetails")} rows={3} placeholder="Provide international collaboration details." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />}
                {form.conductedAbroad === "Yes" && <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200 md:col-span-2">Note: Attach the concerned institute's ethical approval form in required attachments.</p>}
              </section>
            )}

            {formMode === "form4-research-publication-medical" && currentStep === 4 && (
              <section className="grid gap-4">
                <h3 className="text-xl font-bold text-dark dark:text-white">Step 5: Required Attachments</h3>
                <div className="grid gap-2">
                  {FORM_4_REQUIRED_ATTACHMENTS.map((item) => (
                    <div key={item} className="rounded border border-stroke px-3 py-2 dark:border-dark-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={hasCsvOption("requiredAttachments", item)} onChange={() => toggleCsvOption("requiredAttachments", item)} />
                          <span className="text-sm">{item}</span>
                        </label>
                        <label className="cursor-pointer rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10">
                          Upload document
                          <input type="file" className="hidden" onChange={handleRequiredAttachmentUpload(item)} />
                        </label>
                      </div>
                      {attachmentFiles[item] && <p className="mt-2 text-xs text-body">Selected: {attachmentFiles[item]}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {formMode === "form4-research-publication-medical" && currentStep === 5 && (
              <section className="grid gap-4">
                <h3 className="text-xl font-bold text-dark dark:text-white">Step 6: Declaration and Submission</h3>
                <textarea value={form.declaration} onChange={onFieldChange("declaration")} rows={6} placeholder="Declaration statement covering originality, ethics approval, anonymization, disclosure and author approval." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <label className="flex items-center gap-2 rounded border border-stroke px-3 py-2 dark:border-dark-3">
                  <input type="checkbox" checked={form.publicationDeclarationAccepted === "yes"} onChange={(e) => setForm((prev) => ({ ...prev, publicationDeclarationAccepted: e.target.checked ? "yes" : "" }))} />
                  <span className="text-sm">I/We certify all statements above are true and complete.</span>
                </label>
                <input value={form.applicantName} onChange={onFieldChange("applicantName")} placeholder="Applicant Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
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
                  placeholder="Informed Consent Process"
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
                  Declaration & Submission
                </h3>
                <textarea
                  value={form.declaration}
                  onChange={onFieldChange("declaration")}
                  rows={4}
                  placeholder="Declaration of Accuracy and Compliance"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3 md:col-span-2"
                />
                <input
                  value={form.applicantName}
                  onChange={onFieldChange("applicantName")}
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
            </ActiveFormWrapper>
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
