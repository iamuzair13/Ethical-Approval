"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from "@/components/ui/table";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ConfirmDialogBase from "@/components/ui/confirm-dialog";
import ApprovalRequestStepperBase, {
  type SubmissionFileBundle,
} from "@/app/profile/_components/approval-request-stepper";
import {
  isMedicalPublicationFaculty,
  resolveRequiredFormByFaculty,
  type ApplicationType,
  type RequiredForm,
} from "@/app/profile/_components/forms/form-registry";

// --- Types & Interfaces (preserve your existing types) ---
interface Profile {
  name: string;
  regNo: string;
  department: string;
  email: string;
  degreeTitle: string;
  faculty: string;
}

interface RequestItem {
  id: string;
  applicationId: string;
  numericId: number;
  title: string;
  description: string;
  submittedOn: string;
  currentStage: string;
  isDraft: boolean;
  submissionType: "thesis" | "publication";
  latestFeedbackComment?: string | null;
}

interface RequestStats {
  inHod: number;
  inEthical: number;
  completed: number;
}

type ProfileSubmissionApiRow = {
  id: number;
  application_id: string;
  type: "thesis" | "publication";
  current_status:
    | "draft"
    | "submitted"
    | "under_hod_review"
    | "hod_approved"
    | "hod_rejected"
    | "under_admin_review"
    | "under_ireb_review"
    | "approved"
    | "rejected";
  submitted_at: string;
  title: string | null;
  objectives: string | null;
  latest_feedback_comment?: string | null;
  hod_name?: string | null;
};

function mapStatusToStage(status: ProfileSubmissionApiRow["current_status"], hodName?: string | null): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "submitted":
    case "under_hod_review":
      return hodName
        ? `Under Review by ${hodName}`
        : "HOD not Assigned";
    case "hod_approved":
      return "Approved by HOD";
    case "hod_rejected":
      return "Rejected by HOD";
    case "under_admin_review":
      return "Under Review by Administrator";
    case "under_ireb_review":
      return "Under Review by IREB";
    case "approved":
      return "Approved by IREB";
    case "rejected":
      return "Rejected by IREB";
    default:
      return "HOD not Assigned";
  }
}

function mapSubmissionsToRequests(rows: ProfileSubmissionApiRow[]): RequestItem[] {
  return (rows ?? []).map((row) => ({
    id: String(row.id),
    applicationId: row.application_id,
    numericId: row.id,
    title: row.title?.trim() || "Untitled submission",
    description: row.objectives?.trim() || "No objectives provided.",
    submittedOn: new Date(row.submitted_at).toLocaleDateString(),
    currentStage: mapStatusToStage(row.current_status, row.hod_name),
    isDraft: row.current_status === "draft",
    submissionType: (row.type === "publication" ? "publication" : "thesis") as "thesis" | "publication",
    latestFeedbackComment: row.latest_feedback_comment ?? null,
  }));
}

function buildSubmissionMultipartForm(
  payload: Record<string, unknown>,
  fileBundle?: SubmissionFileBundle,
): FormData {
  const fd = new FormData();
  fd.append("payload", JSON.stringify(payload));
  if (!fileBundle) return fd;
  let i = 0;
  for (const [label, file] of Object.entries(fileBundle.requiredByLabel)) {
    if (file instanceof File) {
      fd.append(`req_${i}`, file);
      fd.append(`req_${i}_label`, label);
      i += 1;
    }
  }
  let j = 0;
  const extraIndices = Object.keys(fileBundle.extraByIndex)
    .map((k) => Number.parseInt(k, 10))
    .filter((n) => Number.isInteger(n))
    .sort((a, b) => a - b);
  for (const idx of extraIndices) {
    const file = fileBundle.extraByIndex[idx];
    if (file instanceof File) {
      fd.append(`ext_${j}`, file);
      fd.append(`ext_${j}_index`, String(idx));
      j += 1;
    }
  }
  return fd;
}

/** Postgres BIGSERIAL ids often arrive as strings in JSON; normalize for draft/submit flows. */
function parsePositiveSubmissionId(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw)) {
    const n = Number.parseInt(raw, 10);
    return Number.isSafeInteger(n) && n > 0 ? n : undefined;
  }
  return undefined;
}

function newDraftSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

/** Shapes API submission row into stepper `viewSubmissionData` for resume (draft) / view. */
function buildStepperViewDataFromSubmission(submission: Record<string, unknown>): Record<string, unknown> {
  const ethics =
    submission.ethics_json && typeof submission.ethics_json === "object" && !Array.isArray(submission.ethics_json)
      ? (submission.ethics_json as Record<string, unknown>)
      : {};
  const formRaw = ethics.form;
  const form =
    formRaw && typeof formRaw === "object" && !Array.isArray(formRaw)
      ? (formRaw as Record<string, unknown>)
      : {};
  const out: Record<string, unknown> = { form };
  if (ethics.attachmentFiles && typeof ethics.attachmentFiles === "object" && !Array.isArray(ethics.attachmentFiles)) {
    out.attachmentFiles = ethics.attachmentFiles;
  }
  if (Array.isArray(ethics.extraUploadFiles)) {
    out.extraUploadFiles = ethics.extraUploadFiles;
  }
  if (typeof ethics.currentStep === "number" && Number.isInteger(ethics.currentStep)) {
    out.currentStep = ethics.currentStep;
  }
  if (Array.isArray(ethics.completedSteps)) {
    out.completedSteps = ethics.completedSteps;
  }
  return out;
}

// --- Skeleton Loader ---
const SkeletonCard = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "animate-pulse rounded-[10px] border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark",
      className
    )}
  />
);

// --- Status Badge ---
const StatusBadge = ({ stage, isDraft }: { stage: string; isDraft?: boolean }) => {
  if (isDraft) {
    return (
      <span className="inline-block rounded px-2.5 py-1 text-xs font-semibold capitalize bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
        Draft
      </span>
    );
  }

  const configs: Record<string, string> = {
    "Rejected": "bg-[#FB5454]/[0.08] text-red",
    "Approved": "bg-[#10B981]/[0.08] text-green",
    "Under Review": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    "Pending": "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-slate-400",
  };

  const cls = configs[stage] || configs["Pending"];

  return (
    <span className={cn(
      "inline-block rounded px-2.5 py-1 text-xs font-semibold capitalize",
      cls
    )}>
      {stage}
    </span>
  );
};

// --- Accordion Timeline Item ---
const TimelineAccordion = ({
  request,
  stages,
  getStageState
}: {
  request: RequestItem;
  stages: string[];
  getStageState: (current: string, stage: string) => "done" | "active" | "pending";
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-stroke p-5 dark:border-dark-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h4 className="font-semibold text-dark truncate dark:text-white">{request.title}</h4>
            {request.isDraft && (
              <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                DRAFT
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-body">{request.description}</p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="ml-4 rounded-lg border border-stroke p-2 text-body transition-colors hover:bg-gray-2 dark:border-dark-3 dark:hover:bg-white/5"
        >
          <svg
            className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 border-t border-stroke pt-4 dark:border-dark-3">
          {request.isDraft ? (
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-50 px-4 py-3 dark:bg-amber-900/10">
              <svg className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Draft not submitted. Continue in the table above to finish.
              </p>
            </div>
          ) : (
            <div className="relative pl-2">
              {stages.map((stage, idx) => {
                const state = getStageState(request.currentStage, stage);
                const isLast = idx === stages.length - 1;

                return (
                  <div key={stage} className="relative flex items-start gap-3 pb-4 last:pb-0">
                    {!isLast && (
                      <div className={cn(
                        "absolute left-[9px] top-5 w-px h-full",
                        state === "done" ? "bg-green/30" : "bg-stroke dark:bg-dark-3"
                      )} />
                    )}
                    <div className={cn(
                      "relative z-10 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center",
                      state === "done" && "bg-green text-white",
                      state === "active" && "bg-primary text-white",
                      state === "pending" &&
                        "border border-stroke bg-gray-2 text-body dark:border-dark-3 dark:bg-white/5"
                    )}>
                      {state === "done" ? (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : state === "active" ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      ) : (
                        <span className="h-1 w-1 rounded-full bg-body" />
                      )}
                    </div>
                    <div className="pt-0.5">
                      <span className={cn(
                        "text-sm",
                        state === "done" && "text-body",
                        state === "active" && "font-semibold text-dark dark:text-white",
                        state === "pending" && "text-body"
                      )}>
                        {stage}
                      </span>
                      {state === "active" && (
                        <span className="ml-2 inline-flex items-center rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                          Current
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Main Component ---
export default function ProfileDashboard() {
  const profile: Profile = {
    name: "User",
    regNo: "—",
    department: "—",
    email: "",
    degreeTitle: "—",
    faculty: "—",
  };
  const requests: RequestItem[] = [];
  const isLoadingRequests = false;
  const submissionError: string | null = null;
  const STAGES: string[] = [];
  const getStageState = (_current: string, _stage: string) => "pending" as const;
  const handleOpenApplicationFlow = () => {};
  const handleViewSubmission = async (_id: number | null) => {};
  const handleSelectApplicationType = (_type: string) => {};
  const [discardConfirmRequest, setDiscardConfirmRequest] = useState<RequestItem | null>(null);
  const [discardingDraftId, setDiscardingDraftId] = useState<number | null>(null);
  const stepperViewSubmissionId: number | null = null;
  const setStepperViewSubmissionId = (_v: number | null) => {};
  const stepperViewData: any = null;
  const [stepperSubmissionMeta, setStepperSubmissionMeta] = useState<{
    revisionOfSubmissionId?: number;
    revisionNumber?: number;
  } | null>(null);
  const requiredForm: any = null;
  const setRequiredForm = (_v: any) => {};
  const [approvalDraftSessionId, setApprovalDraftSessionId] = useState("");
  const [serverDraftSubmissionId, setServerDraftSubmissionId] = useState<number | null>(null);
  const [feedbackModalRequest, setFeedbackModalRequest] = useState<RequestItem | null>(null);
  const ApprovalRequestStepper = ApprovalRequestStepperBase;
  const ConfirmDialog = ConfirmDialogBase;
  const router = useRouter();
  const { data: session } = useSession();
  const sessionUser = session?.user as {
    name?: string;
    email?: string;
    sapId?: string;
    facultyDepartment?: string;
    facultyDesignation?: string;
    studentRecord?: {
      Name?: string;
      SapNo?: string;
      RegNo?: string;
      DeptName?: string;
      FacultyName?: string;
      Faculty?: string;
      DegrTitle?: string;
    };
  } | null;
  const sessionEmail = (sessionUser?.email ?? "").trim();
  const normalizedSessionEmail = sessionEmail.toLowerCase();
  const isStudentSession =
    normalizedSessionEmail.endsWith("@student.uol.edu.pk") || normalizedSessionEmail.includes("student");
  const studentRecord = sessionUser?.studentRecord;
  const resolvedProfile: Profile =
    sessionUser && sessionEmail
      ? isStudentSession
        ? {
            name: studentRecord?.Name?.trim() || sessionUser.name?.trim() || profile.name,
            regNo:
              studentRecord?.SapNo?.trim() ||
              studentRecord?.RegNo?.trim() ||
              sessionUser.sapId?.trim() ||
              profile.regNo,
            department: studentRecord?.DeptName?.trim() || profile.department,
            email: sessionEmail,
            degreeTitle: studentRecord?.DegrTitle?.trim() || profile.degreeTitle,
            faculty:
              studentRecord?.FacultyName?.trim() ||
              studentRecord?.Faculty?.trim() ||
              profile.faculty,
          }
        : {
            name: sessionUser.name?.trim() || profile.name,
            regNo: sessionUser.sapId?.trim() ? `SAP ${sessionUser.sapId.trim()}` : profile.regNo,
            department: sessionUser.facultyDepartment?.trim() || profile.department,
            email: sessionEmail,
            degreeTitle: sessionUser.facultyDesignation?.trim() || profile.degreeTitle,
            faculty: profile.faculty,
          }
      : profile;
  const userStorageId = sessionUser?.sapId?.trim() ?? "";
  const normalizedEmail = resolvedProfile.email.toLowerCase();
  const isStudentEmail =
    normalizedEmail.endsWith("@student.uol.edu.pk") || normalizedEmail.includes("student");
  const [localIsStepperOpen, setLocalIsStepperOpen] = useState(false);
  const [localIsApplicationPickerOpen, setLocalIsApplicationPickerOpen] = useState(false);
  const [localStepperMode, setLocalStepperMode] = useState<"create" | "view" | "edit" | "resume">("create");
  const [localRequiredForm, setLocalRequiredForm] = useState<RequiredForm | null>(requiredForm ?? null);
  const [localStepperViewData, setLocalStepperViewData] = useState<any>(stepperViewData);
  const [localRequests, setLocalRequests] = useState<RequestItem[]>(requests);
  const [localIsLoadingRequests, setLocalIsLoadingRequests] = useState<boolean>(isLoadingRequests);
  const [localSubmissionError, setLocalSubmissionError] = useState<string | null>(submissionError);
  const effectiveStages =
    STAGES.length > 0
      ? STAGES
      : [
          "Under Review by HOD",
          "Approved by HOD",
          "Rejected by HOD",
          "Under Review by IREB",
          "Rejected by IREB",
          "Approved by IREB",
        ];
  const resolveStageState = (
    current: string,
    stage: string,
  ): "done" | "active" | "pending" => {
    const fromProps = getStageState(current, stage);
    if (fromProps !== "pending") {
      return fromProps;
    }
    // Map dynamic hod review status to the static stage label for comparison
    const normalizedCurrent =
      current.startsWith("Under Review by") &&
      !current.includes("IREB") &&
      !current.includes("Administrator")
        ? "Under Review by HOD"
        : current === "HOD not Assigned"
          ? "Under Review by HOD"
          : current;
    const currentIndex = effectiveStages.indexOf(normalizedCurrent);
    const stageIndex = effectiveStages.indexOf(stage);
    if (currentIndex === -1 || stageIndex === -1) {
      return stage === current || stage === normalizedCurrent ? "active" : "pending";
    }
    if (stageIndex < currentIndex) return "done";
    if (stageIndex === currentIndex) return "active";
    return "pending";
  };
  const computedRequestStats = localRequests.reduce(
    (acc, request) => {
      const stage = request.currentStage;
      if (
        stage.startsWith("Under Review by") &&
        !stage.includes("IREB") &&
        !stage.includes("Administrator")
      ) {
        acc.inHod += 1;
      } else if (
        stage === "Under Review by IREB" ||
        stage === "Under Review by Administrator"
      ) {
        acc.inEthical += 1;
      } else if (stage.includes("Approved") || stage.includes("Rejected")) {
        acc.completed += 1;
      }
      return acc;
    },
    { inHod: 0, inEthical: 0, completed: 0 } as RequestStats,
  );
  const effectiveRequestStats = computedRequestStats;
  const facultyPublicationForm: RequiredForm = isMedicalPublicationFaculty(
    resolvedProfile.faculty || resolvedProfile.department || "",
  )
    ? {
        id: "form7-publication-faculty-staff-medical",
        label: "Research Publication (Faculty/Staff Medical Sciences)",
        href: "#",
        applicationType: "research-publication",
      }
    : {
        id: "form6-publication-faculty-non-medical",
        label: "Research Publication (Faculty Non-Medical)",
        href: "#",
        applicationType: "research-publication",
      };
  const openNewApprovalFlow = () => {
    handleOpenApplicationFlow();
    if (!isStudentEmail) {
      setApprovalDraftSessionId(newDraftSessionId());
      setRequiredForm(facultyPublicationForm);
      setLocalRequiredForm(facultyPublicationForm);
      setLocalIsApplicationPickerOpen(false);
      setLocalStepperMode("create");
      setLocalIsStepperOpen(true);
      return;
    }
    if (!localIsApplicationPickerOpen && !localIsStepperOpen) {
      setApprovalDraftSessionId(newDraftSessionId());
      setLocalIsApplicationPickerOpen(true);
    }
  };
  const selectApplicationType = (type: string) => {
    handleSelectApplicationType(type);
    const selected = resolveRequiredFormByFaculty(
      type as ApplicationType,
      resolvedProfile.faculty || resolvedProfile.department || "",
    );
    setRequiredForm(selected);
    setLocalRequiredForm(selected);
    if (!localIsStepperOpen) {
      setLocalIsApplicationPickerOpen(false);
      setLocalStepperMode("create");
      setLocalIsStepperOpen(true);
    }
  };

  const openSubmissionView = async (submissionId: number | null) => {
    await handleViewSubmission(submissionId);
    if (!submissionId) return;
    try {
      const response = await fetch(`/api/profile/submissions/${submissionId}`, { cache: "no-store" });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        submission?: Record<string, unknown>;
      };
      if (!response.ok || !payload.ok || !payload.submission) {
        throw new Error(payload.error || "Unable to load application details.");
      }
      const sub = payload.submission;
      // Resolve requiredForm from ethics_json so the correct form layout renders.
      const ethics =
        sub.ethics_json && typeof sub.ethics_json === "object" && !Array.isArray(sub.ethics_json)
          ? (sub.ethics_json as Record<string, unknown>)
          : {};
      const reqForm = ethics.requiredForm;
      if (reqForm && typeof reqForm === "object" && !Array.isArray(reqForm)) {
        setLocalRequiredForm(reqForm as RequiredForm);
      }
      setLocalStepperViewData(buildStepperViewDataFromSubmission(sub));
      setLocalStepperMode("view");
      setLocalIsStepperOpen(true);
    } catch (error) {
      setLocalSubmissionError(
        error instanceof Error ? error.message : "Network error while loading application details.",
      );
    }
  };

  useEffect(() => {
    if (!sessionUser?.sapId) return;
    let cancelled = false;

    const loadSubmissions = async () => {
      setLocalIsLoadingRequests(true);
      setLocalSubmissionError(null);
      try {
        const response = await fetch("/api/profile/submissions", { cache: "no-store" });
        const payload = (await response.json()) as {
          ok?: boolean;
          error?: string;
          submissions?: ProfileSubmissionApiRow[];
        };

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "Failed to load submissions.");
        }

        const mapped = mapSubmissionsToRequests(payload.submissions ?? []);

        if (!cancelled) {
          setLocalRequests(mapped);
        }
      } catch (error) {
        if (!cancelled) {
          setLocalSubmissionError(
            error instanceof Error ? error.message : "Network error while loading submissions.",
          );
        }
      } finally {
        if (!cancelled) {
          setLocalIsLoadingRequests(false);
        }
      }
    };

    void loadSubmissions();
    return () => {
      cancelled = true;
    };
  }, [sessionUser?.sapId]);

  const refreshSubmissionsList = useCallback(async () => {
    if (!sessionUser?.sapId) return;
    try {
      const response = await fetch("/api/profile/submissions", { cache: "no-store" });
      const payload = (await response.json()) as {
        ok?: boolean;
        submissions?: ProfileSubmissionApiRow[];
      };
      if (response.ok && payload.ok) {
        setLocalRequests(mapSubmissionsToRequests(payload.submissions ?? []));
      }
    } catch {
      /* ignore */
    }
  }, [sessionUser?.sapId]);

  const handleCreateRequest = useCallback(
    async (
      data: {
        title: string;
        objectives: string;
        methodology: string;
        type: "thesis" | "publication";
        domain: "medical" | "non_medical";
        ethics: Record<string, unknown>;
        draftSubmissionId?: number;
      },
      fileBundle?: SubmissionFileBundle,
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!sessionUser?.sapId) {
        return { ok: false, error: "You must be signed in to submit an application." };
      }
      const applicantProfile = {
        name: (resolvedProfile.name || sessionUser.name || "Student").trim(),
        sapId: sessionUser.sapId.trim(),
        email: (resolvedProfile.email || sessionUser.email || "").trim(),
        faculty: (resolvedProfile.faculty || "Unknown Faculty").trim(),
        department: (resolvedProfile.department || "Unknown Department").trim(),
        program: (resolvedProfile.degreeTitle || "").trim(),
      };
      if (!applicantProfile.email) {
        return { ok: false, error: "Applicant email is required." };
      }
      const payload: Record<string, unknown> = {
        title: data.title,
        objectives: data.objectives,
        methodology: data.methodology,
        type: data.type,
        domain: data.domain,
        ethics: data.ethics,
        applicantProfile,
      };
      if (typeof data.draftSubmissionId === "number" && data.draftSubmissionId > 0) {
        payload.draftSubmissionId = data.draftSubmissionId;
      }
      const hasFiles =
        !!fileBundle &&
        (Object.keys(fileBundle.requiredByLabel).length > 0 ||
          Object.keys(fileBundle.extraByIndex).length > 0);

      try {
        const response = hasFiles
          ? await fetch("/api/profile/submissions", {
              method: "POST",
              body: buildSubmissionMultipartForm(payload, fileBundle),
            })
          : await fetch("/api/profile/submissions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
        const json = (await response.json()) as { ok?: boolean; error?: string };
        if (!response.ok || !json.ok) {
          return {
            ok: false,
            error: json.error ?? `Submission failed (${response.status}).`,
          };
        }
        await refreshSubmissionsList();
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error while submitting." };
      }
    },
    [sessionUser, resolvedProfile, refreshSubmissionsList],
  );

  const handlePersistDraft = useCallback(
    async (body: {
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
    }): Promise<{ ok: boolean; submissionId?: number; error?: string }> => {
      if (!sessionUser?.sapId) {
        return { ok: false, error: "You must be signed in to save progress." };
      }
      const payload = {
        ...body,
        applicantProfile: {
          ...body.applicantProfile,
          sapId: sessionUser.sapId.trim(),
        },
      };
      const isUpdate =
        typeof serverDraftSubmissionId === "number" && serverDraftSubmissionId > 0;
      const url = isUpdate
        ? `/api/profile/submissions/${serverDraftSubmissionId}`
        : "/api/profile/submissions/draft";
      const method = isUpdate ? "PATCH" : "POST";
      try {
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await response.json()) as {
          ok?: boolean;
          error?: string;
          submission?: { id: unknown };
        };
        if (!response.ok || !json.ok) {
          return { ok: false, error: json.error ?? "Could not save to server" };
        }
        const newId = parsePositiveSubmissionId(json.submission?.id);
        await refreshSubmissionsList();
        if (!isUpdate && newId != null) {
          return { ok: true, submissionId: newId };
        }
        if (isUpdate && serverDraftSubmissionId != null) {
          return { ok: true, submissionId: serverDraftSubmissionId };
        }
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error while saving draft." };
      }
    },
    [sessionUser?.sapId, serverDraftSubmissionId, refreshSubmissionsList],
  );

  const handleDiscardDraft = useCallback((request: RequestItem) => {
    if (!request.isDraft) return;
    setDiscardConfirmRequest(request);
  }, []);

  const confirmDiscardDraft = useCallback(async () => {
    const target = discardConfirmRequest;
    if (!target) return;
    if (discardingDraftId != null) return;
    setDiscardingDraftId(target.numericId);
    try {
      const res = await fetch(`/api/profile/submissions/${target.numericId}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Could not discard this draft.");
      }
      await refreshSubmissionsList();
      setDiscardConfirmRequest(null);
    } catch (error) {
      setLocalSubmissionError(
        error instanceof Error ? error.message : "Network error while discarding draft.",
      );
    } finally {
      setDiscardingDraftId(null);
    }
  }, [discardConfirmRequest, discardingDraftId, refreshSubmissionsList]);

  const handleContinueDraft = useCallback(
    async (request: RequestItem) => {
      if (!request.isDraft || !sessionUser?.sapId) return;
      setLocalSubmissionError(null);
      try {
        const res = await fetch(`/api/profile/submissions/${request.numericId}`, { cache: "no-store" });
        const payload = (await res.json()) as {
          ok?: boolean;
          error?: string;
          submission?: Record<string, unknown>;
        };
        if (!res.ok || !payload.ok || !payload.submission) {
          throw new Error(payload.error ?? "Unable to load this draft.");
        }
        const sub = payload.submission;
        const ethics =
          sub.ethics_json && typeof sub.ethics_json === "object" && !Array.isArray(sub.ethics_json)
            ? (sub.ethics_json as Record<string, unknown>)
            : {};
        const reqForm = ethics.requiredForm;
        if (reqForm && typeof reqForm === "object" && !Array.isArray(reqForm)) {
          setLocalRequiredForm(reqForm as RequiredForm);
        } else {
          const appType: ApplicationType =
            sub.type === "publication" ? "research-publication" : "thesis";
          setLocalRequiredForm(
            resolveRequiredFormByFaculty(
              appType,
              resolvedProfile.faculty || resolvedProfile.department || "",
            ),
          );
        }
        const sid = parsePositiveSubmissionId(sub.id);
        if (sid != null) {
          setServerDraftSubmissionId(sid);
        }
        setApprovalDraftSessionId(newDraftSessionId());
        setLocalStepperViewData(buildStepperViewDataFromSubmission(sub));
        setLocalStepperMode("resume");
        setLocalIsStepperOpen(true);
      } catch (error) {
        setLocalSubmissionError(
          error instanceof Error ? error.message : "Could not open this draft.",
        );
      }
    },
    [sessionUser?.sapId, resolvedProfile.faculty, resolvedProfile.department],
  );

  const handleOpenRevision = useCallback(
    async (request: RequestItem) => {
      if (!sessionUser?.sapId) return;
      setLocalSubmissionError(null);
      try {
        const res = await fetch(`/api/profile/submissions/${request.numericId}`, { cache: "no-store" });
        const payload = (await res.json()) as {
          ok?: boolean;
          error?: string;
          submission?: Record<string, unknown>;
        };
        if (!res.ok || !payload.ok || !payload.submission) {
          throw new Error(payload.error ?? "Unable to load this submission for revision.");
        }
        const sub = payload.submission;
        const ethics =
          sub.ethics_json && typeof sub.ethics_json === "object" && !Array.isArray(sub.ethics_json)
            ? (sub.ethics_json as Record<string, unknown>)
            : {};
        const reqForm = ethics.requiredForm;
        if (reqForm && typeof reqForm === "object" && !Array.isArray(reqForm)) {
          setLocalRequiredForm(reqForm as RequiredForm);
        } else {
          const appType: ApplicationType =
            sub.type === "publication" ? "research-publication" : "thesis";
          setLocalRequiredForm(
            resolveRequiredFormByFaculty(
              appType,
              resolvedProfile.faculty || resolvedProfile.department || "",
            ),
          );
        }
        // Increment revision number if this submission was already revised before.
        const prevRevisionNumber =
          typeof ethics.revisionNumber === "number" ? ethics.revisionNumber : 0;
        setStepperSubmissionMeta({
          revisionOfSubmissionId: request.numericId,
          revisionNumber: prevRevisionNumber + 1,
        });
        setApprovalDraftSessionId(newDraftSessionId());
        setLocalStepperViewData(buildStepperViewDataFromSubmission(sub));
        setLocalStepperMode("edit");
        setLocalIsStepperOpen(true);
      } catch (error) {
        setLocalSubmissionError(
          error instanceof Error ? error.message : "Could not open this submission for revision.",
        );
      }
    },
    [sessionUser?.sapId, resolvedProfile.faculty, resolvedProfile.department],
  );

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6">
        {/* Profile Header */}
        <section className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-primary text-lg font-bold text-white">
                  {resolvedProfile.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <h1 className="text-heading-5 font-bold text-dark dark:text-white">
                  {resolvedProfile.name}
                </h1>
              </div>

              <dl className="mt-5 grid gap-4 border-t border-stroke pt-5 dark:border-dark-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-body">SAP ID</dt>
                  <dd className="mt-1 font-mono text-dark dark:text-white">{resolvedProfile.regNo}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-body">Email</dt>
                  <dd className="mt-1 break-all text-dark dark:text-white">
                    <a className="hover:underline" href={`mailto:${resolvedProfile.email}`}>
                      {resolvedProfile.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-body">
                    {isStudentEmail ? "Faculty" : "Designation"}
                  </dt>
                  <dd className="mt-1 text-dark dark:text-white">
                    {isStudentEmail ? resolvedProfile.faculty : resolvedProfile.degreeTitle}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-body">Department</dt>
                  <dd className="mt-1 text-dark dark:text-white">{resolvedProfile.department}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-body">Under Review by HOD</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-dark dark:text-white">
              {effectiveRequestStats.inHod}
            </p>
          </div>
          <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-body">Under Review by IREB</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-dark dark:text-white">
              {effectiveRequestStats.inEthical}
            </p>
          </div>
          <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-body">Completed Decisions</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-dark dark:text-white">
              {effectiveRequestStats.completed}
            </p>
          </div>
        </div>

        {/* Skeleton Loading State */}
        {localIsLoadingRequests && (
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} className="h-28" />
            ))}
          </div>
        )}

        {/* Quick Action */}
        <section className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-heading-6 font-bold text-dark dark:text-white">
                Initiate New Approval Request
              </h2>
              <p className="mt-1 max-w-xl text-sm text-body">
                Initiate the multi-step ethical review form and submit your approval request to the review board.
              </p>
            </div>
            <button
              onClick={openNewApprovalFlow}
              className="inline-flex shrink-0 items-center gap-2 rounded-[10px] bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Initiate Application
            </button>
          </div>
        </section>

        {/* Submissions Tracking */}
        <section className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-heading-6 font-bold text-dark dark:text-white">
                Track Submitted Requests
              </h2>
              <p className="text-sm text-body">Monitor application status and manage drafts</p>
            </div>
            {localIsLoadingRequests && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-gray-2 px-3 py-1.5 text-sm text-body dark:border-dark-3 dark:bg-white/5">
                <svg className="h-4 w-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Refreshing...
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-stroke hover:bg-transparent dark:border-dark-3">
                  <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-body">Application ID</TableHead>
                  <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-body">Type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-body">Request</TableHead>
                  <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-body">Submitted</TableHead>
                  <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-body">Expected</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-body">Stage</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-body">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localRequests.map((request) => (
                  <TableRow
                    key={request.id}
                    className="border-b border-stroke transition-colors hover:bg-gray-2 dark:border-dark-3 dark:hover:bg-white/[0.02]"
                  >
                    <TableCell className="whitespace-nowrap py-4">
                      <span className="font-mono text-sm font-semibold text-dark dark:text-white">
                        {request.applicationId}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-4">
                      <span
                        className={cn(
                          "inline-block rounded px-2.5 py-1 text-xs font-semibold",
                          request.submissionType === "thesis"
                            ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
                        )}
                      >
                        {request.submissionType === "thesis" ? "Thesis" : "Research"}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <p className="font-semibold leading-tight text-dark dark:text-white">{request.title}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-4 text-sm text-body">{request.submittedOn}</TableCell>
                    <TableCell className="whitespace-nowrap py-4 text-sm text-body">
                      {request.isDraft ? (
                        <span className="font-medium text-amber-600 dark:text-amber-400">Draft</span>
                      ) : (
                        <span>2 days</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <StatusBadge stage={request.currentStage} isDraft={request.isDraft} />
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {request.isDraft ? (
                          <>
                            <button
                              onClick={() => handleContinueDraft(request)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-stroke px-3 py-1.5 text-xs font-semibold text-dark transition-colors hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-white/5"
                            >
                              Continue
                            </button>
                            <button
                              onClick={() => handleDiscardDraft(request)}
                              disabled={discardingDraftId === request.numericId}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#FB5454]/30 bg-[#FB5454]/[0.08] px-3 py-1.5 text-xs font-semibold text-red transition-colors hover:bg-[#FB5454]/[0.15] disabled:opacity-50"
                            >
                              {discardingDraftId === request.numericId ? "..." : "Discard"}
                            </button>
                          </>
                        ) : request.currentStage.includes("Rejected") ? (
                          <>
                            <button
                              onClick={() => handleOpenRevision(request)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-stroke px-3 py-1.5 text-xs font-semibold text-dark transition-colors hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-white/5"
                            >
                              Revise
                            </button>
                            {request.latestFeedbackComment && (
                              <button
                                onClick={() => setFeedbackModalRequest(request)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-stroke px-3 py-1.5 text-xs font-semibold text-dark transition-colors hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-white/5"
                              >
                                Feedback
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => void openSubmissionView(request.numericId)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-stroke px-3 py-1.5 text-xs font-semibold text-dark transition-colors hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-white/5"
                            >
                              View
                            </button>
                            {request.latestFeedbackComment && (
                              <button
                                onClick={() => setFeedbackModalRequest(request)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-stroke px-3 py-1.5 text-xs font-semibold text-dark transition-colors hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-white/5"
                              >
                                Feedback
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {localRequests.length === 0 && !localIsLoadingRequests && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-body">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[10px] border border-stroke bg-gray-2 dark:border-dark-3 dark:bg-white/5">
                          <svg className="h-7 w-7 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-body">No submissions found yet.</p>
                        <p className="mt-1 text-xs text-body">Create a new approval request to get started.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {localSubmissionError && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#FB5454]/20 bg-[#FB5454]/[0.05] px-4 py-3 text-sm text-red">
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {localSubmissionError}
            </div>
          )}
        </section>

        {/* Application Progress */}
        <section className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h2 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">
            Application Progress
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {localRequests.map((request) => (
              <TimelineAccordion
                key={`${request.id}-timeline`}
                request={request}
                stages={effectiveStages}
                getStageState={resolveStageState}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Stepper Modal */}
      <ApprovalRequestStepper
        key={
          localStepperMode === "create"
            ? `create-${approvalDraftSessionId}-${localRequiredForm?.id ?? "none"}`
            : localStepperMode === "resume"
              ? `resume-${stepperViewSubmissionId ?? serverDraftSubmissionId ?? 0}-${localRequiredForm?.id ?? "none"}`
              : localStepperMode === "edit"
                ? `edit-${(stepperSubmissionMeta as { revisionOfSubmissionId?: number } | null)?.revisionOfSubmissionId ?? 0}-${(stepperSubmissionMeta as { revisionNumber?: number } | null)?.revisionNumber ?? 0}`
                : `view-${stepperViewSubmissionId ?? 0}`
        }
        open={localIsStepperOpen}
        onClose={() => {
          setLocalIsStepperOpen(false);
          setStepperViewSubmissionId(null);
          if (localStepperMode === "create") {
            setServerDraftSubmissionId(null);
            setApprovalDraftSessionId("");
          }
          if (localStepperMode === "view" || localStepperMode === "edit") {
            setLocalStepperViewData(null);
            setStepperSubmissionMeta(null);
            setLocalStepperMode("create");
            setRequiredForm(null);
            setLocalRequiredForm(null);
          }
          if (localStepperMode === "resume") {
            setLocalStepperViewData(null);
            setLocalStepperMode("create");
            setRequiredForm(null);
            setLocalRequiredForm(null);
            setServerDraftSubmissionId(null);
          }
        }}
        onSubmit={handleCreateRequest}
        mode={localStepperMode}
        submissionMeta={stepperSubmissionMeta}
        viewSubmissionData={localStepperViewData}
        requiredForm={localRequiredForm}
        userStorageId={userStorageId}
        draftSessionId={
          localStepperMode === "create" || localStepperMode === "resume"
            ? approvalDraftSessionId.trim() || null
            : null
        }
        serverDraftSubmissionId={serverDraftSubmissionId}
        persistDraft={handlePersistDraft}
        onServerDraftSaved={(id) => {
          const n = parsePositiveSubmissionId(id);
          if (n != null) setServerDraftSubmissionId(n);
        }}
        applicantProfile={{
          name: resolvedProfile.name,
          regNo: resolvedProfile.regNo,
          email: resolvedProfile.email,
          faculty: resolvedProfile.faculty,
          department: resolvedProfile.department,
          program: resolvedProfile.degreeTitle,
        }}
      />

      {/* Application Picker Modal */}
      {localIsApplicationPickerOpen && (
        <div
          className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/40 px-4 py-6 dark:bg-slate-950/80"
          onClick={() => setLocalIsApplicationPickerOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-[10px] border border-stroke bg-white p-8 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-dark dark:text-white">
              Select Application Type
            </h3>
            <p className="mt-2 text-sm text-body">
              Choose your application type. The required form will be selected automatically based on your faculty.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => selectApplicationType("thesis")}
                className="flex flex-col items-center gap-2 rounded-[10px] border border-dashed border-stroke py-6 text-sm font-semibold text-dark transition-colors hover:border-primary hover:bg-primary/[0.03] dark:border-dark-3 dark:text-white"
              >
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Thesis
              </button>
              <button
                onClick={() => selectApplicationType("research-publication")}
                className="flex flex-col items-center gap-2 rounded-[10px] border border-dashed border-stroke py-6 text-sm font-semibold text-dark transition-colors hover:border-primary hover:bg-primary/[0.03] dark:border-dark-3 dark:text-white"
              >
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2 2H7m2 13a2 2 0 01-2-2H7m2 13a2 2 0 01-2 2H7m2 13a2 2 0 01-2-2H7m2 13a2 2 0 01-2 2H7" />
                </svg>
                Research Publication
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setLocalIsApplicationPickerOpen(false)}
                className="rounded-lg border border-stroke px-4 py-2 text-sm font-semibold text-body transition-colors hover:bg-gray-2 dark:border-dark-3 dark:hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModalRequest && (
        <div
          className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/40 px-4 py-6 dark:bg-slate-950/80"
          onClick={() => setFeedbackModalRequest(null)}
        >
          <div
            className="w-full max-w-2xl rounded-[10px] border border-stroke bg-white p-8 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-dark dark:text-white">
                  Application Feedback
                </h3>
                <p className="mt-1 text-sm text-body">
                  Application ID {feedbackModalRequest.applicationId}
                </p>
              </div>
              <button
                onClick={() => setFeedbackModalRequest(null)}
                className="rounded-lg p-1 text-body transition-colors hover:bg-gray-2 dark:hover:bg-white/5"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 rounded-lg border border-stroke bg-gray-2 p-6 dark:border-dark-3 dark:bg-white/[0.03]">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-dark dark:text-slate-300">
                {feedbackModalRequest.latestFeedbackComment}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={discardConfirmRequest != null}
        title="Discard Draft Application"
        description={
          discardConfirmRequest
            ? `Discard draft application ${discardConfirmRequest.applicationId}? This action cannot be undone.`
            : undefined
        }
        confirmLabel="Discard"
        cancelLabel="Cancel"
        confirmVariant="danger"
        isConfirming={discardConfirmRequest != null && discardingDraftId === discardConfirmRequest.numericId}
        onCancel={() => {
          if (discardingDraftId != null) return;
          setDiscardConfirmRequest(null);
        }}
        onConfirm={() => {
          void confirmDiscardDraft();
        }}
      />
    </div>
  );
}