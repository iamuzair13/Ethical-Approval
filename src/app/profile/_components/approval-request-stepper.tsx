"use client";

import { cn } from "@/lib/utils";
import { type ChangeEvent, type FormEvent, type MouseEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type RequestPayload = {
  title: string;
  objectives: string;
  methodology: string;
  type: "thesis" | "publication";
  domain: "medical" | "non_medical";
  ethics: Record<string, unknown>;
};

type ApprovalRequestStepperProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: RequestPayload) => Promise<{ ok: boolean; error?: string }>;
  mode?: "create" | "view" | "edit";
  submissionMeta?: Record<string, unknown> | null;
  viewSubmissionData?: {
    form?: Record<string, unknown>;
    attachmentFiles?: Record<string, unknown>;
    extraUploadFiles?: unknown[];
    currentStep?: number;
  } | null;
  applicantProfile?: {
    name: string;
    regNo: string;
    email: string;
    faculty: string;
    department: string;
    program: string;
  };
  requiredForm?: {
    label: string;
    href: string;
    applicationType: "thesis" | "research-publication";
  } | null;
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

const FORM_1_REQUIRED_ATTACHMENTS = [
  "Complete Research Proposal/Protocol",
  "Research Questionnaire/Interview Guide (i.e., focus group guide)",
  "Participant Information Letter (Cover Letter)",
  "Participant Consent Form (Qualitative and mix-methods research with selective participations)",
  "Participant Information Letter Only (Quantitative research)",
  "Approval from Board of Study (BOS) and Board of Faculty (BOF)",
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
};

const DRAFT_STORAGE_KEY = "approval-request-stepper-draft";

type DraftData = {
  form: typeof INITIAL_FORM;
  currentStep: number;
  completedSteps: number[];
  attachmentFiles: Record<string, string>;
  extraUploadFiles: string[];
  savedAt: string;
};

export default function ApprovalRequestStepper({
  open,
  onClose,
  onSubmit,
  mode = "create",
  submissionMeta = null,
  viewSubmissionData = null,
  applicantProfile,
  requiredForm = null,
}: ApprovalRequestStepperProps) {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [form, setForm] = useState(INITIAL_FORM);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<Record<string, string>>({});
  const [extraUploadFiles, setExtraUploadFiles] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isViewMode = mode === "view";
  const isPreloadedMode = mode === "view" || mode === "edit";

  const isForm1Thesis =
    requiredForm?.label === "Form 1 Thesis form Other than Medical Sciences.docx";
  const activeSteps = isForm1Thesis ? FORM_1_STEPS : STEPS;

  const stepState = useMemo(
    () =>
      activeSteps.map((_, index) => ({
        isActive: currentStep === index,
        isDone: completedSteps.has(index),
      })),
    [activeSteps, completedSteps, currentStep],
  );

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

    const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!rawDraft) return;

    try {
      const draft = JSON.parse(rawDraft) as DraftData;
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
      setExtraUploadFiles(Array.isArray(draft.extraUploadFiles) ? draft.extraUploadFiles : []);
      setSaveMessage(`Restored draft from ${new Date(draft.savedAt).toLocaleString()}`);
    } catch {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, [activeSteps.length, isPreloadedMode, mounted, open]);

  useEffect(() => {
    if (!open || isPreloadedMode) return;

    // Autosave draft so a remount/navigation doesn't wipe progress (e.g., after file picker interactions).
    const timer = window.setTimeout(() => {
      const payload: DraftData = {
        form,
        currentStep,
        completedSteps: Array.from(completedSteps),
        attachmentFiles,
        extraUploadFiles,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [attachmentFiles, completedSteps, currentStep, extraUploadFiles, form, isPreloadedMode, open]);

  useEffect(() => {
    if (!open || !isPreloadedMode || !viewSubmissionData) return;

    const nextForm = {
      ...INITIAL_FORM,
      ...(viewSubmissionData.form ?? {}),
    } as typeof INITIAL_FORM;
    const nextAttachments =
      viewSubmissionData.attachmentFiles && typeof viewSubmissionData.attachmentFiles === "object"
        ? Object.fromEntries(
            Object.entries(viewSubmissionData.attachmentFiles).map(([key, value]) => [
              key,
              typeof value === "string" ? value : String(value ?? ""),
            ]),
          )
        : {};
    const nextExtraUploads = Array.isArray(viewSubmissionData.extraUploadFiles)
      ? viewSubmissionData.extraUploadFiles.map((item) =>
          typeof item === "string" ? item : String(item ?? ""),
        )
      : [];
    const safeStep = Number.isInteger(viewSubmissionData.currentStep)
      ? Math.max(0, Math.min(activeSteps.length - 1, viewSubmissionData.currentStep ?? 0))
      : 0;

    setForm(nextForm);
    setAttachmentFiles(nextAttachments);
    setExtraUploadFiles(nextExtraUploads);
    setCurrentStep(safeStep);
    setCompletedSteps(new Set(Array.from({ length: safeStep }, (_, index) => index)));
    setSaveMessage(null);
    setSubmitError(null);
  }, [activeSteps.length, isPreloadedMode, open, viewSubmissionData]);

  useEffect(() => {
    if (!open || isViewMode || !isForm1Thesis || !applicantProfile) return;
    setForm((prev) => ({
      ...prev,
      scholarName: applicantProfile.name,
      scholarSapId: applicantProfile.regNo,
      scholarEmail: applicantProfile.email,
      scholarFaculty: applicantProfile.faculty,
      scholarDepartment: applicantProfile.department,
      scholarProgram: applicantProfile.program,
    }));
  }, [applicantProfile, isForm1Thesis, isViewMode, open]);

  useEffect(() => {
    if (!saveMessage) return;
    const timer = window.setTimeout(() => setSaveMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [saveMessage]);

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
      // Persist immediately so an unexpected remount doesn't bounce users back to an empty form.
      const payload: DraftData = {
        form,
        currentStep: nextStep,
        completedSteps: Array.from(nextCompleted),
        attachmentFiles,
        extraUploadFiles,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
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
    setExtraUploadFiles([]);
    onClose();
  };

  const handleSaveProgress = () => {
    if (isViewMode) return;
    const payload: DraftData = {
      form,
      currentStep,
      completedSteps: Array.from(completedSteps),
      attachmentFiles,
      extraUploadFiles,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    setSaveMessage("Progress saved");
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void (async () => {
      if (isViewMode) return;
      // Prevent accidental submit from intermediate steps (e.g., while uploading files).
      if (currentStep < activeSteps.length - 1 || isSubmitting) return;

      const title = isForm1Thesis ? form.thesisTitle.trim() : form.projectTitle.trim();
      const objectives = isForm1Thesis
        ? [
            form.researchObjective1.trim(),
            form.researchObjective2.trim(),
            form.researchObjective3.trim(),
            form.researchObjective4.trim(),
          ]
            .filter(Boolean)
            .join("\n")
        : form.projectObjectives.trim();
      const methodology = isForm1Thesis
        ? form.methodology.trim()
        : form.biomedicalDetails.trim() ||
          form.riskMitigation.trim() ||
          "Methodology not provided";

      if (!title || !objectives || !methodology) {
        setSubmitError("Please complete the required submission fields before submitting.");
        return;
      }

      setSubmitError(null);
      setIsSubmitting(true);

      const result = await onSubmit({
        title,
        objectives,
        methodology,
        type: isForm1Thesis ? "thesis" : "publication",
        domain:
          requiredForm?.label?.toLowerCase().includes("medical sciences") ||
          requiredForm?.label?.toLowerCase().includes("medical")
            ? "medical"
            : "non_medical",
        ethics: {
          form,
          attachmentFiles,
          extraUploadFiles,
          requiredForm,
          ...(submissionMeta ?? {}),
        },
      });

      setIsSubmitting(false);

      if (!result.ok) {
        setSubmitError(result.error ?? "Unable to submit application. Please try again.");
        return;
      }

      localStorage.removeItem(DRAFT_STORAGE_KEY);
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
    };

  const handleExtraUploadChange =
    (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      setExtraUploadFiles((prev) =>
        prev.map((name, i) => (i === index ? selectedFile?.name ?? "" : name)),
      );
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
            {isForm1Thesis && currentStep === 0 && (
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
                  <div>
                      <p className="mb-2 text-sm font-semibold text-dark dark:text-white">j) Participants Estimate</p>
                  <select value={form.participantsEstimate} onChange={onFieldChange("participantsEstimate")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Participants Estimate</option><option>1-20</option><option>21-50</option><option>51-100</option><option>101-150</option><option>151-200</option><option>201-300</option><option>301-400</option><option>401-500</option><option>501+</option></select>
                  </div>
                  <textarea value={form.methodology} onChange={onFieldChange("methodology")} rows={4} placeholder="Research Methodology (Methods and Materials)" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
                </div>
              </section>
            )}

            {isForm1Thesis && currentStep === 1 && (
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

            {isForm1Thesis && currentStep === 2 && (
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

            {isForm1Thesis && currentStep === 3 && (
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

            {isForm1Thesis && currentStep === 4 && (
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

            {!isForm1Thesis && currentStep === 0 && (
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

            {!isForm1Thesis && currentStep === 1 && (
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

            {!isForm1Thesis && currentStep === 2 && (
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

            {!isForm1Thesis && currentStep === 3 && (
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

            {!isForm1Thesis && currentStep === 4 && (
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

            {!isForm1Thesis && currentStep === 5 && (
              <section className="grid gap-4">
                <h3 className="text-xl font-bold text-dark dark:text-white">Attachments</h3>
                <p className="rounded-lg border border-dashed border-stroke p-4 text-sm dark:border-dark-3">
                  Attachment uploads can be integrated later. This step is included in the
                  workflow to preserve your ethical review structure.
                </p>
              </section>
            )}

            {!isForm1Thesis && currentStep === 6 && (
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
                  disabled={isSubmitting}
                  className="rounded-lg border border-primary px-4 py-2 font-medium text-primary transition hover:bg-primary/10"
                >
                  Save Progress
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
                    disabled={isSubmitting}
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
