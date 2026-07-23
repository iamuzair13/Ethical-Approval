"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from "@/components/ui/table";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import BreadcrumbBase from "@/components/Breadcrumbs/Breadcrumb";
import ConfirmDialogBase from "@/components/ui/confirm-dialog";
import ApprovalRequestStepperBase, {
  type SubmissionFileBundle,
} from "@/app/profile/_components/approval-request-stepper";
import {
  AnimatedCounter,
  MagneticButton,
  SpotlightCard,
} from "@/app/profile/_components/profile-visuals";
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
  inSupervisor: number;
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
    | "under_supervisor_review"
    | "supervisor_approved"
    | "supervisor_rejected"
    | "under_ireb_review"
    | "approved"
    | "rejected";
  submitted_at: string;
  title: string | null;
  objectives: string | null;
  latest_feedback_comment?: string | null;
  supervisor_name?: string | null;
};

function mapStatusToStage(status: ProfileSubmissionApiRow["current_status"], supervisorName?: string | null): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "submitted":
    case "under_supervisor_review":
      return supervisorName
        ? `Under Review by ${supervisorName}`
        : "Supervisor not Assigned";
    case "supervisor_approved":
      return "Approved by Supervisor";
    case "supervisor_rejected":
      return "Rejected by Supervisor";
    case "under_ireb_review":
      return "Under Review by IREB";
    case "approved":
      return "Approved by IREB";
    case "rejected":
      return "Rejected by IREB";
    default:
      return "Supervisor not Assigned";
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
    currentStage: mapStatusToStage(row.current_status, row.supervisor_name),
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
const OrganicSkeleton = ({ className }: { className?: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className={cn(
      "relative overflow-hidden rounded-2xl border border-stroke bg-gray-2 backdrop-blur-sm dark:border-white/5 dark:bg-white/[0.02]",
      className
    )}
  >
    <motion.div
      className="absolute inset-0"
      animate={{
        background: [
          "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0) 100%)",
        ]
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      style={{
        backgroundSize: "200% 100%",
        animation: "shimmer 2s infinite"
      }}
    />
    <style jsx>{`
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `}</style>
  </motion.div>
);

// --- Status Badge ---
const StatusBadge = ({ stage, isDraft }: { stage: string; isDraft?: boolean }) => {
  if (isDraft) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Draft
      </span>
    );
  }
  
  const configs: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    "Rejected": { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", dot: "bg-red-500" },
    "Approved": { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-500" },
    "Under Review": { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", dot: "bg-blue-400" },
    "Pending": { bg: "bg-slate-500/10", border: "border-slate-500/20", text: "text-slate-400", dot: "bg-slate-400" },
  };

  const config = configs[stage] || configs["Pending"];
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border",
      config.bg, config.border, config.text
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
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
    <SpotlightCard className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h4 className="font-semibold text-dark truncate dark:text-white">{request.title}</h4>
            {request.isDraft && (
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                DRAFT
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-dark-6 dark:text-slate-500">{request.description}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className="ml-4 rounded-lg bg-gray-2 p-2 text-dark-6 transition-colors hover:bg-gray-3 hover:text-dark dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <motion.svg 
            animate={{ rotate: isOpen ? 180 : 0 }}
            className="w-4 h-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 border-t border-stroke pt-4 dark:border-white/5">
              {request.isDraft ? (
                <div className="flex items-center gap-3 rounded-xl bg-amber-500/5 border border-amber-500/10 px-4 py-3">
                  <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-amber-300">
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
                            state === "done" ? "bg-emerald-500/30" : "bg-gray-3 dark:bg-white/5"
                          )} />
                        )}
                        <div className={cn(
                          "relative z-10 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300",
                          state === "done" && "bg-emerald-500 text-white",
                          state === "active" && "bg-indigo-500 text-white ring-4 ring-indigo-500/20",
                          state === "pending" &&
                            "border border-stroke bg-gray-3 text-dark-6 dark:border-white/10 dark:bg-slate-800 dark:text-slate-500"
                        )}>
                          {state === "done" ? (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : state === "active" ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          ) : (
                            <span className="h-1 w-1 rounded-full bg-dark-5 dark:bg-slate-600" />
                          )}
                        </div>
                        <div className="pt-0.5">
                          <span className={cn(
                            "text-sm transition-colors",
                            state === "done" && "line-through text-dark-5 dark:text-slate-300",
                            state === "active" && "font-semibold text-dark dark:text-white",
                            state === "pending" && "text-dark-6 dark:text-slate-600"
                          )}>
                            {stage}
                          </span>
                          {state === "active" && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider border border-indigo-500/20">
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
          </motion.div>
        )}
      </AnimatePresence>
    </SpotlightCard>
  );
};

// --- Tooltip Component ---
const Tooltip = ({ content, children }: { content: string; children: React.ReactNode }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-stroke bg-white px-3 py-1.5 text-xs text-dark shadow-xl dark:border-white/10 dark:bg-slate-800 dark:text-white"
          >
            {content}
            <div className="absolute top-full left-1/2 -mt-1 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-stroke bg-white dark:border-white/10 dark:bg-slate-800" />
          </motion.div>
        )}
      </AnimatePresence>
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
  const handleOpenRevision = async (_r: RequestItem) => {};
  const handleViewSubmission = async (_id: number | null) => {};
  const handleSelectApplicationType = (_type: string) => {};
  const [discardConfirmRequest, setDiscardConfirmRequest] = useState<RequestItem | null>(null);
  const [discardingDraftId, setDiscardingDraftId] = useState<number | null>(null);
  const stepperViewSubmissionId: number | null = null;
  const setStepperViewSubmissionId = (_v: number | null) => {};
  const stepperViewData: any = null;
  const stepperSubmissionMeta: any = null;
  const setStepperSubmissionMeta = (_v: any) => {};
  const requiredForm: any = null;
  const setRequiredForm = (_v: any) => {};
  const [approvalDraftSessionId, setApprovalDraftSessionId] = useState("");
  const [serverDraftSubmissionId, setServerDraftSubmissionId] = useState<number | null>(null);
  const [feedbackModalRequest, setFeedbackModalRequest] = useState<RequestItem | null>(null);
  const ApprovalRequestStepper = ApprovalRequestStepperBase;
  const ConfirmDialog = ConfirmDialogBase;
  const Breadcrumb = BreadcrumbBase;
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
          "Under Review by Supervisor",
          "Approved by Supervisor",
          "Rejected by Supervisor",
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
    // Map dynamic supervisor review status to the static stage label for comparison
    const normalizedCurrent =
      current.startsWith("Under Review by") && !current.includes("IREB")
        ? "Under Review by Supervisor"
        : current === "Supervisor not Assigned"
          ? "Under Review by Supervisor"
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
      if (stage.startsWith("Under Review by") && !stage.includes("IREB")) acc.inSupervisor += 1;
      else if (stage === "Under Review by IREB") acc.inEthical += 1;
      else if (stage.includes("Approved") || stage.includes("Rejected")) acc.completed += 1;
      return acc;
    },
    { inSupervisor: 0, inEthical: 0, completed: 0 } as RequestStats,
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
      setLocalStepperViewData(payload.submission);
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

  // Container variants for stagger
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  return (
    <div className="min-h-screen bg-gray-2 font-sans selection:bg-indigo-500/30 text-dark dark:bg-slate-950 dark:text-white">
      {/* Global Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-violet-900/15 rounded-full blur-[120px]" />
        <div className="absolute top-[30%] left-[60%] w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[100px]" />
        <div className="absolute top-[60%] left-[20%] w-[300px] h-[300px] bg-emerald-900/10 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Breadcrumb pageName="Profile" />
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mt-6 grid gap-6"
        >
          {/* Profile Header - Glassmorphism Hero */}
          <motion.div variants={itemVariants}>
            <SpotlightCard className="p-8 lg:p-10">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
                <div className="flex items-start gap-5">
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 2 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/25 ring-2 ring-white/10 cursor-pointer"
                  >
                    {resolvedProfile.name?.charAt(0)?.toUpperCase() || "U"}
                    <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
                  </motion.div>

                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-dark tracking-tight dark:text-white">
                      {resolvedProfile.name}
                    </h1>

                    <motion.div 
                      className="flex flex-wrap items-center gap-2"
                      initial="hidden"
                      animate="visible"
                      variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
                      }}
                    >
                      <motion.span 
                        variants={itemVariants}
                        className="inline-flex items-center gap-2 rounded-full border border-stroke bg-gray-2 px-3 py-1.5 text-sm text-dark dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                      >
                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                        {resolvedProfile.regNo}
                      </motion.span>

                      <motion.span 
                        variants={itemVariants}
                        className="inline-flex items-center gap-2 rounded-full border border-stroke bg-gray-2 px-3 py-1.5 text-sm text-dark dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                      >
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {resolvedProfile.department}
                      </motion.span>

                      <motion.span 
                        variants={itemVariants}
                        className="inline-flex items-center gap-2 rounded-full border border-stroke bg-gray-2 px-3 py-1.5 text-sm text-dark-6 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                      >
                        <svg className="h-4 w-4 text-dark-5 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {resolvedProfile.email}
                      </motion.span>
                    </motion.div>

                    <motion.div 
                      className="flex flex-wrap items-center gap-2 mt-3"
                      initial="hidden"
                      animate="visible"
                      variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.3 } }
                      }}
                    >
                      {!isStudentEmail ? (
                        <>
                          <motion.div 
                            variants={itemVariants}
                            whileHover={{ scale: 1.02, borderColor: "rgba(255,255,255,0.2)" }}
                            className="group relative inline-flex cursor-pointer items-center gap-2 overflow-hidden rounded-xl border border-stroke bg-white/80 px-4 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="text-xs text-dark-6 dark:text-slate-500">Designation</span>
                            <span className="h-3 w-px bg-white/10" />
                            <span className="text-xs font-semibold text-dark dark:text-white">{resolvedProfile.degreeTitle}</span>
                          </motion.div>
                          <motion.div 
                            variants={itemVariants}
                            whileHover={{ scale: 1.02 }}
                            className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-white/80 px-4 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]"
                          >
                            <span className="text-xs text-dark-6 dark:text-slate-500">Department</span>
                            <span className="h-3 w-px bg-white/10" />
                            <span className="text-xs font-semibold text-dark dark:text-white">{resolvedProfile.department}</span>
                          </motion.div>
                        </>
                      ) : (
                        <>
                          <motion.div 
                            variants={itemVariants}
                            whileHover={{ scale: 1.02 }}
                            className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-white/80 px-4 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]"
                          >
                            <span className="text-xs text-dark-6 dark:text-slate-500">Faculty</span>
                            <span className="h-3 w-px bg-white/10" />
                            <span className="text-xs font-semibold text-dark dark:text-white">{resolvedProfile.faculty}</span>
                          </motion.div>
                          <motion.div 
                            variants={itemVariants}
                            whileHover={{ scale: 1.02 }}
                            className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-white/80 px-4 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]"
                          >
                            <span className="text-xs text-dark-6 dark:text-slate-500">Degree</span>
                            <span className="h-3 w-px bg-white/10" />
                            <span className="text-xs font-semibold text-dark dark:text-white">{resolvedProfile.degreeTitle}</span>
                          </motion.div>
                        </>
                      )}
                    </motion.div>
                  </div>
                </div>

              </div>
            </SpotlightCard>
          </motion.div>

          {/* Bento Grid Stats */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {/* Card 1: Supervisor Review - Large Span */}
            <SpotlightCard 
              className="lg:col-span-2 p-6 group" 
              glowColor="rgba(245,158,11,0.08)"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-dark-6 dark:text-slate-400">Under Review by Supervisor</p>
                  <p className="text-4xl font-bold tracking-tighter tabular-nums text-dark dark:text-white">
                    <AnimatedCounter value={effectiveRequestStats.inSupervisor} />
                  </p>
                </div>
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </motion.div>
              </div>

              <div className="relative mt-6 h-2 w-full overflow-hidden rounded-full bg-gray-3 dark:bg-slate-800/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${Math.min((effectiveRequestStats.inSupervisor / Math.max(effectiveRequestStats.inSupervisor + effectiveRequestStats.inEthical + effectiveRequestStats.completed, 1)) * 100, 100)}%` 
                  }}
                  transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                >
                  <div className="absolute inset-0 bg-white/30 blur-sm" />
                </motion.div>
              </div>
              <p className="mt-3 text-xs text-dark-6 dark:text-slate-500">
                {Math.round((effectiveRequestStats.inSupervisor / Math.max(effectiveRequestStats.inSupervisor + effectiveRequestStats.inEthical + effectiveRequestStats.completed, 1)) * 100)}% of total workflow
              </p>
            </SpotlightCard>

            {/* Card 2: IREB Review */}
            <SpotlightCard 
              className="p-6 group" 
              glowColor="rgba(99,102,241,0.08)"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-dark-6 dark:text-slate-400">Under Review by IREB</p>
                  <p className="text-3xl font-bold tracking-tighter tabular-nums text-dark dark:text-white">
                    <AnimatedCounter value={effectiveRequestStats.inEthical} />
                  </p>
                </div>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </motion.div>
              </div>

              <div className="relative mt-6 h-2 w-full overflow-hidden rounded-full bg-gray-3 dark:bg-slate-800/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${Math.min((effectiveRequestStats.inEthical / Math.max(effectiveRequestStats.inSupervisor + effectiveRequestStats.inEthical + effectiveRequestStats.completed, 1)) * 100, 100)}%` 
                  }}
                  transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
                >
                  <div className="absolute inset-0 bg-white/30 blur-sm" />
                </motion.div>
              </div>
            </SpotlightCard>

            {/* Card 3: Completed - Full Width */}
            <SpotlightCard 
              className="md:col-span-2 lg:col-span-3 p-6 group" 
              glowColor="rgba(16,185,129,0.08)"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </motion.div>
                  <div>
                    <p className="text-sm font-medium text-dark-6 dark:text-slate-400">Completed Decisions</p>
                    <p className="text-4xl font-bold tracking-tighter tabular-nums text-dark dark:text-white">
                      <AnimatedCounter value={effectiveRequestStats.completed} />
                    </p>
                  </div>
                </div>

                {/* Mini Chart */}
                <div className="flex items-end gap-1 h-12">
                  {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
                      className="w-3 bg-emerald-500/20 rounded-t-sm hover:bg-emerald-500/40 transition-colors"
                    />
                  ))}
                </div>
              </div>

              <div className="relative mt-6 h-2 w-full overflow-hidden rounded-full bg-gray-3 dark:bg-slate-800/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${Math.min((effectiveRequestStats.completed / Math.max(effectiveRequestStats.inSupervisor + effectiveRequestStats.inEthical + effectiveRequestStats.completed, 1)) * 100, 100)}%` 
                  }}
                  transition={{ duration: 1.2, delay: 0.7, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                >
                  <div className="absolute inset-0 bg-white/30 blur-sm" />
                </motion.div>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Skeleton Loading State */}
          {localIsLoadingRequests && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {[1, 2, 3].map((i) => (
                <OrganicSkeleton key={i} className="h-32" />
              ))}
            </motion.div>
          )}

          {/* Quick Action Card */}
          <motion.div variants={itemVariants}>
            <SpotlightCard 
              className="p-8 overflow-hidden" 
              glowColor="rgba(99,102,241,0.1)"
            >
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              
              <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-dark tracking-tight dark:text-white">
                      Create New Approval Request
                    </h3>
                    <p className="mt-1 max-w-xl text-sm leading-relaxed text-dark-6 dark:text-slate-400">
                      Start the multi-step ethical review form and submit your approval request to the review board.
                    </p>
                  </div>
                </div>
                <MagneticButton onClick={openNewApprovalFlow} className="self-start sm:self-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  New Application
                </MagneticButton>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Submissions Tracking */}
          <motion.div variants={itemVariants}>
            <SpotlightCard className="p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-stroke bg-gray-2 text-dark-5 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-dark tracking-tight dark:text-white">
                      Track Submitted Requests
                    </h3>
                    <p className="text-sm text-dark-6 dark:text-slate-500">
                      Monitor application status and manage drafts
                    </p>
                  </div>
                </div>
                
                {localIsLoadingRequests && (
                  <motion.span 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-gray-2 px-3 py-1.5 text-sm text-dark-6 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                  >
                    <svg className="animate-spin h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Refreshing...
                  </motion.span>
                )}
              </div>

              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-stroke hover:bg-transparent dark:border-white/10">
                      <TableHead className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wider text-dark-6 dark:text-slate-500">Application ID</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wider text-dark-6 dark:text-slate-500">Application Type</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-dark-6 dark:text-slate-500">Request</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wider text-dark-6 dark:text-slate-500">Submitted</TableHead>
                      <TableHead className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wider text-dark-6 dark:text-slate-500">Expected</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-dark-6 dark:text-slate-500">Stage</TableHead>
                      <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-dark-6 dark:text-slate-500">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localRequests.map((request, idx) => (
                      <motion.tr
                        key={request.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                      >
                        <TableCell className="whitespace-nowrap py-4">
                          <Tooltip content="Application Identifier">
                            <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-dark bg-gray-2 px-2.5 py-1 rounded-md border border-stroke cursor-help dark:text-white dark:bg-white/5 dark:border-white/10">
                              {request.applicationId}
                            </span>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-4">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                              request.submissionType === "thesis"
                                ? "border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200"
                                : "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
                            )}
                          >
                            {request.submissionType === "thesis" ? "Thesis" : "Research"}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <p className="font-semibold text-dark leading-tight dark:text-white">{request.title}</p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-4 text-sm text-dark-6 dark:text-slate-400">{request.submittedOn}</TableCell>
                        <TableCell className="whitespace-nowrap py-4 text-sm text-dark-6 dark:text-slate-400">
                          {request.isDraft ? (
                            <span className="inline-flex items-center gap-1.5 text-amber-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              Draft
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-dark-6 dark:text-slate-400">
                              <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              2 days
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          <StatusBadge stage={request.currentStage} isDraft={request.isDraft} />
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {request.isDraft ? (
                              <>
                                <MagneticButton variant="secondary" onClick={() => handleContinueDraft(request)} className="px-3 py-1.5 text-xs">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                  </svg>
                                  Continue
                                </MagneticButton>
                                <MagneticButton 
                                  variant="danger" 
                                  onClick={() => handleDiscardDraft(request)} 
                                  disabled={discardingDraftId === request.numericId}
                                  className="px-3 py-1.5 text-xs"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  {discardingDraftId === request.numericId ? "..." : "Discard"}
                                </MagneticButton>
                              </>
                            ) : request.currentStage.includes("Rejected") ? (
                              <>
                                <MagneticButton variant="secondary" onClick={() => handleOpenRevision(request)} className="px-3 py-1.5 text-xs">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  Revise
                                </MagneticButton>
                                {request.latestFeedbackComment && (
                                  <MagneticButton variant="secondary" onClick={() => setFeedbackModalRequest(request)} className="px-3 py-1.5 text-xs">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                    Feedback
                                  </MagneticButton>
                                )}
                              </>
                            ) : (
                              <>
                                <MagneticButton variant="secondary" onClick={() => void openSubmissionView(request.numericId)} className="px-3 py-1.5 text-xs">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View
                                </MagneticButton>
                                {request.latestFeedbackComment && (
                                  <MagneticButton variant="secondary" onClick={() => setFeedbackModalRequest(request)} className="px-3 py-1.5 text-xs">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                    Feedback
                                  </MagneticButton>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                    {localRequests.length === 0 && !localIsLoadingRequests && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center">
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center text-dark-6 dark:text-slate-500"
                          >
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-stroke bg-gray-2 dark:border-white/10 dark:bg-white/5">
                              <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <p className="text-sm font-medium text-dark-6 dark:text-slate-400">No submissions found yet.</p>
                            <p className="mt-1 text-xs text-dark-5 dark:text-slate-600">Create a new approval request to get started.</p>
                          </motion.div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {localSubmissionError && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {localSubmissionError}
                </motion.div>
              )}
            </SpotlightCard>
          </motion.div>

          {/* Timeline Section */}
          <motion.div variants={itemVariants}>
            <SpotlightCard className="p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-stroke bg-gray-2 dark:border-white/10 dark:bg-white/5">
                  <svg className="h-4 w-4 text-dark-6 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-dark-6 dark:text-slate-400">
                  Application Progress
                </h4>
              </div>

              <motion.div 
                className="grid gap-4 lg:grid-cols-2"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                }}
              >
                {localRequests.map((request) => (
                  <motion.div key={`${request.id}-timeline`} variants={itemVariants}>
                    <TimelineAccordion 
                      request={request} 
                      stages={effectiveStages} 
                      getStageState={resolveStageState} 
                    />
                  </motion.div>
                ))}
              </motion.div>
            </SpotlightCard>
          </motion.div>
        </motion.div>

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
        <AnimatePresence>
          {localIsApplicationPickerOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-md dark:bg-slate-950/80"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-lg rounded-2xl border border-stroke bg-white/95 backdrop-blur-xl p-8 shadow-2xl dark:border-white/10 dark:bg-slate-900/90 dark:shadow-black/50"
              >
                <h3 className="text-xl font-bold text-dark tracking-tight dark:text-white">
                  Select Application Type
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-dark-6 dark:text-slate-400">
                  Choose your application type. The required form will be selected automatically based on your faculty.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:items-start">
                  <div className="flex flex-col gap-2">
                    <MagneticButton
                      variant="secondary"
                      onClick={() => selectApplicationType("thesis")}
                      className="py-4 justify-center border-dashed hover:border-indigo-500/50 hover:bg-indigo-500/5"
                    >
                      <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Thesis
                    </MagneticButton>
                  </div>
                  <MagneticButton 
                    variant="secondary" 
                    onClick={() => selectApplicationType("research-publication")}
                    className="py-4 justify-center border-dashed hover:border-indigo-500/50 hover:bg-indigo-500/5"
                  >
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2 2H7m2 13a2 2 0 01-2-2H7m2 13a2 2 0 01-2 2H7m2 13a2 2 0 01-2-2H7m2 13a2 2 0 01-2 2H7" />
                    </svg>
                    Research Publication
                  </MagneticButton>
                </div>

                <div className="mt-6 flex justify-end">
                  <MagneticButton variant="ghost" onClick={() => setLocalIsApplicationPickerOpen(false)}>
                    Cancel
                  </MagneticButton>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback Modal */}
        <AnimatePresence>
          {feedbackModalRequest && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-md dark:bg-slate-950/80"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-2xl rounded-2xl border border-stroke bg-white/95 backdrop-blur-xl p-8 shadow-2xl dark:border-white/10 dark:bg-slate-900/90 dark:shadow-black/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-dark tracking-tight dark:text-white">
                      Application Feedback
                    </h3>
                    <p className="mt-1 text-sm text-dark-6 dark:text-slate-400">
                      Application ID {feedbackModalRequest.applicationId}
                    </p>
                  </div>
                  <MagneticButton variant="ghost" onClick={() => setFeedbackModalRequest(null)}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </MagneticButton>
                </div>

                <div className="mt-6 rounded-xl border border-stroke bg-gray-2 p-6 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-dark dark:text-slate-300">
                    {feedbackModalRequest.latestFeedbackComment}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
    </div>
  );
}