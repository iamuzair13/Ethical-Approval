"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ApprovalRequestStepper, {
  type SubmissionFileBundle,
} from "@/app/profile/_components/approval-request-stepper";
import {
  type ApplicationType,
  type RequiredForm,
  resolveRequiredFormByFaculty,
} from "@/app/profile/_components/forms/form-registry";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { inferFacultyFromDepartment } from "@/lib/faculty-by-department";
import { cn } from "@/lib/utils";
import { signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";

type RequestStage =
  | "Draft"
  | "Under Review by Dean"
  | "Approved by Dean"
  | "Rejected by Dean"
  | "Under Review by IREB"
  | "Approved by IREB"
  | "Rejected by IREB";

type ApprovalRequest = {
  id: string;
  /** 6-digit application reference shown to applicants and admins */
  applicationId: string;
  numericId: number;
  revisionNumber: number;
  title: string;
  submittedOn: string;
  currentStage: RequestStage;
  description: string;
  isDraft: boolean;
  latestFeedbackComment: string | null;
};

type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_dean_review"
  | "dean_approved"
  | "dean_rejected"
  | "under_ireb_review"
  | "approved"
  | "rejected";

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

type ProfileSubmissionApiRow = {
  id: number;
  application_id: string;
  current_status: SubmissionStatus;
  submitted_at: string;
  title: string | null;
  objectives: string | null;
  ethics_json?: unknown;
  latest_feedback_comment?: string | null;
};

type ProfileSubmissionDetail = {
  id: number;
  application_id: string;
  type: "thesis" | "publication";
  domain: "medical" | "non_medical";
  current_status: SubmissionStatus;
  submitted_at: string;
  title: string | null;
  objectives: string | null;
  methodology: string | null;
  participants_range: string | null;
  research_population: string | null;
  applicant_name: string;
  applicant_email: string;
  applicant_faculty: string;
  applicant_department: string;
  applicant_program: string | null;
  ethics_json: unknown;
};

const STAGES: RequestStage[] = [
  "Under Review by Dean",
  "Approved by Dean",
  "Rejected by Dean",
  "Under Review by IREB",
  "Approved by IREB",
  "Rejected by IREB",
];

function mapStatusToStage(status: SubmissionStatus): RequestStage {
  switch (status) {
    case "draft":
      return "Draft";
    case "submitted":
    case "under_dean_review":
      return "Under Review by Dean";
    case "dean_approved":
      return "Approved by Dean";
    case "dean_rejected":
      return "Rejected by Dean";
    case "under_ireb_review":
      return "Under Review by IREB";
    case "approved":
      return "Approved by IREB";
    case "rejected":
      return "Rejected by IREB";
    default:
      return "Under Review by Dean";
  }
}

function newApprovalDraftSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export default function Page() {
  const { data: session, status } = useSession();

  const profile = useMemo(() => {
    const rec = session?.user?.studentRecord;
    const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const getStringField = (keys: string[]): string | null => {
      if (!rec || typeof rec !== "object") return null;
      const record = rec as Record<string, unknown>;
      for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }
      }
      const normalizedLookup = new Map<string, string>();
      for (const [key, value] of Object.entries(record)) {
        if (typeof value === "string" && value.trim()) {
          normalizedLookup.set(normalizeKey(key), value.trim());
        }
      }
      for (const key of keys) {
        const match = normalizedLookup.get(normalizeKey(key));
        if (match) return match;
      }
      return null;
    };

    const dept =
      getStringField(["DeptName", "Dept", "Department"]) ?? "—";
    const facultyFromRecord =
      getStringField([
        "Faculty",
        "FacName",
        "FacultyName",
        "Campus",
        "faculty",
        "fac_name",
        "faculty_name",
      ]) ?? null;
    const inferredFaculty = dept !== "—" ? inferFacultyFromDepartment(dept) : null;
    // Business rule: faculty must be derived from department mapping first.
    const faculty = inferredFaculty ?? facultyFromRecord ?? "—";
    const degreeTitle =
      getStringField(["DegrTitle", "DegreeTitle", "Degree"]) ?? "—";
    const reg =
      rec && typeof rec === "object" && "RegNo" in rec && typeof (rec as { RegNo?: string }).RegNo === "string"
        ? (rec as { RegNo: string }).RegNo
        : session?.user?.sapId
          ? `SAP ${session.user.sapId}`
          : "—";

    return {
      name: session?.user?.name ?? "Student",
      regNo: reg,
      email: session?.user?.email ?? "—",
      department: dept,
      faculty,
      degreeTitle,
    };
  }, [session]);

  const [isStepperOpen, setIsStepperOpen] = useState(false);
  const [stepperMode, setStepperMode] = useState<"create" | "view" | "edit" | "resume">("create");
  const [stepperSubmissionMeta, setStepperSubmissionMeta] = useState<Record<string, unknown> | null>(null);
  const [stepperViewData, setStepperViewData] = useState<{
    form?: Record<string, unknown>;
    attachmentFiles?: Record<string, unknown>;
    extraUploadFiles?: unknown[];
    currentStep?: number;
    completedSteps?: number[];
  } | null>(null);
  const [isApplicationPickerOpen, setIsApplicationPickerOpen] = useState(false);
  const [requiredForm, setRequiredForm] = useState<RequiredForm | null>(null);
  const [approvalDraftSessionId, setApprovalDraftSessionId] = useState(() =>
    newApprovalDraftSessionId(),
  );
  const [stepperViewSubmissionId, setStepperViewSubmissionId] = useState<number | null>(null);
  const [serverDraftSubmissionId, setServerDraftSubmissionId] = useState<number | null>(null);

  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isLoadingSubmission, setIsLoadingSubmission] = useState(false);
  const [discardingDraftId, setDiscardingDraftId] = useState<number | null>(null);
  const [discardConfirmRequest, setDiscardConfirmRequest] = useState<ApprovalRequest | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [feedbackModalRequest, setFeedbackModalRequest] = useState<ApprovalRequest | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!session?.user?.sapId) {
      setRequests([]);
      return;
    }

    setIsLoadingRequests(true);
    try {
      const response = await fetch("/api/profile/submissions", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) return;

      const payload = (await response.json()) as {
        ok: boolean;
        submissions?: ProfileSubmissionApiRow[];
      };

      if (!payload.ok || !payload.submissions) return;

      const mapped: ApprovalRequest[] = payload.submissions.map((item) => {
        const revisionNumber =
          item.ethics_json &&
          typeof item.ethics_json === "object" &&
          typeof (item.ethics_json as Record<string, unknown>).revisionNumber === "number"
            ? ((item.ethics_json as Record<string, unknown>).revisionNumber as number)
            : 0;
        return {
          id: revisionNumber > 0 ? `REQ-${item.id} (rev-${revisionNumber})` : `REQ-${item.id}`,
          applicationId: item.application_id,
          numericId: item.id,
          revisionNumber,
          title: item.title?.trim() || `Submission #${item.id}`,
          description: item.objectives?.trim() || "No objectives provided.",
          submittedOn: new Date(item.submitted_at).toISOString().slice(0, 10),
          currentStage: mapStatusToStage(item.current_status),
          isDraft: item.current_status === "draft",
          latestFeedbackComment: item.latest_feedback_comment?.trim() || null,
        };
      });
      setRequests(mapped);
    } finally {
      setIsLoadingRequests(false);
    }
  }, [session?.user?.sapId]);

  useEffect(() => {
    if (!session?.user?.sapId) {
      setRequests([]);
      return;
    }

    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    void (async () => {
      if (isMounted) await fetchRequests();
    })();
    intervalId = setInterval(() => {
      void fetchRequests();
    }, 15000);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [session?.user?.sapId, fetchRequests]);

  const handleCreateRequest = (
    {
      title,
      objectives,
      methodology,
      type,
      domain,
      ethics,
      draftSubmissionId,
    }: {
      title: string;
      objectives: string;
      methodology: string;
      type: "thesis" | "publication";
      domain: "medical" | "non_medical";
      ethics: Record<string, unknown>;
      draftSubmissionId?: number;
    },
    fileBundle?: SubmissionFileBundle,
  ) => {
    return (async () => {
      try {
        const revisionSubmissionId = parsePositiveInt(ethics?.revisionOfSubmissionId);
        const sanitizedEthics: Record<string, unknown> =
          revisionSubmissionId != null ? { ...ethics } : ethics;
        if (revisionSubmissionId != null) {
          delete sanitizedEthics.draftSubmissionId;
        }

        const effectiveDraftSubmissionId =
          revisionSubmissionId != null
            ? null
            : typeof draftSubmissionId === "number" && draftSubmissionId > 0
            ? draftSubmissionId
            : typeof sanitizedEthics?.draftSubmissionId === "number" &&
                sanitizedEthics.draftSubmissionId > 0
              ? (sanitizedEthics.draftSubmissionId as number)
            : serverDraftSubmissionId;

        const baseBody = {
          title,
          objectives,
          methodology,
          type,
          domain,
          ethics: sanitizedEthics,
          applicantProfile: {
            name: profile.name,
            sapId: session?.user?.sapId ?? "",
            email: profile.email,
            faculty: profile.faculty,
            department: profile.department,
            program: profile.degreeTitle,
          },
          ...(effectiveDraftSubmissionId != null && effectiveDraftSubmissionId > 0
            ? { draftSubmissionId: effectiveDraftSubmissionId }
            : {}),
        };

        const hasMultipartFiles =
          fileBundle &&
          (Object.keys(fileBundle.requiredByLabel).length > 0 ||
            Object.keys(fileBundle.extraByIndex).length > 0);

        const response = hasMultipartFiles
          ? await (() => {
              const fd = new FormData();
              fd.append("payload", JSON.stringify(baseBody));
              let i = 0;
              for (const [label, file] of Object.entries(fileBundle!.requiredByLabel)) {
                fd.append(`req_${i}`, file);
                fd.append(`req_${i}_label`, label);
                i++;
              }
              let j = 0;
              for (const [idxStr, file] of Object.entries(fileBundle!.extraByIndex)) {
                fd.append(`ext_${j}`, file);
                fd.append(`ext_${j}_index`, idxStr);
                j++;
              }
              return fetch("/api/profile/submissions", {
                method: "POST",
                body: fd,
              });
            })()
          : await fetch("/api/profile/submissions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(baseBody),
            });

        const payload = (await response.json()) as {
          ok: boolean;
          error?: string;
          submission?: {
            id: number;
            application_id: string;
            current_status: SubmissionStatus;
            submitted_at: string;
            title?: string | null;
            objectives?: string | null;
            revision_number?: number;
          };
        };

        if (!response.ok || !payload.ok || !payload.submission) {
          return {
            ok: false,
            error: payload.error ?? "Failed to save submission.",
          };
        }

        const rev =
          typeof payload.submission.revision_number === "number"
            ? payload.submission.revision_number
            : 0;
        const savedRequest: ApprovalRequest = {
          id:
            rev > 0
              ? `REQ-${payload.submission.id} (rev-${rev})`
              : `REQ-${payload.submission.id}`,
          applicationId: payload.submission.application_id,
          numericId: payload.submission.id,
          revisionNumber: rev,
          title: payload.submission.title?.trim() || title,
          description: payload.submission.objectives?.trim() || objectives,
          submittedOn: new Date(payload.submission.submitted_at).toISOString().slice(0, 10),
          currentStage: mapStatusToStage(payload.submission.current_status),
          isDraft: payload.submission.current_status === "draft",
          latestFeedbackComment: null,
        };

        setServerDraftSubmissionId(null);
        setRequests((prev) => [
          savedRequest,
          ...prev.filter((item) => item.numericId !== savedRequest.numericId),
        ]);
        await fetchRequests();
        return { ok: true };
      } catch {
        return {
          ok: false,
          error: "Network error while saving submission.",
        };
      }
    })();
  };

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
    }) => {
      try {
        const targetId = serverDraftSubmissionId;
        const isUpdate = targetId != null && targetId > 0;
        const response = await fetch(
          isUpdate ? `/api/profile/submissions/${targetId}` : "/api/profile/submissions/draft",
          {
            method: isUpdate ? "PATCH" : "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          },
        );
        const payload = (await response.json()) as {
          ok: boolean;
          error?: string;
          submission?: { id: number; application_id: string; current_status: SubmissionStatus };
        };

        if (!response.ok || !payload.ok || !payload.submission) {
          return {
            ok: false as const,
            error: payload.error ?? "Failed to save draft.",
          };
        }

        setServerDraftSubmissionId(payload.submission.id);
        await fetchRequests();
        return { ok: true as const, submissionId: payload.submission.id };
      } catch {
        return { ok: false as const, error: "Network error while saving draft." };
      }
    },
    [serverDraftSubmissionId, fetchRequests],
  );

  const requestStats = useMemo(() => {
    const active = requests.filter((r) => !r.isDraft);
    const inDean = active.filter((r) =>
      r.currentStage.includes("Dean") && !r.currentStage.includes("Approved") && !r.currentStage.includes("Rejected"),
    ).length;
    const inEthical = active.filter((r) =>
      r.currentStage.includes("IREB") && !r.currentStage.includes("Approved") && !r.currentStage.includes("Rejected"),
    ).length;
    const completed = active.filter((r) =>
      r.currentStage.includes("Approved") || r.currentStage.includes("Rejected"),
    ).length;

    return { inDean, inEthical, completed };
  }, [requests]);

  const getStageState = (currentStage: RequestStage, stage: RequestStage) => {
    const currentIndex = STAGES.indexOf(currentStage);
    const stageIndex = STAGES.indexOf(stage);

    if (stageIndex < currentIndex) return "done";
    if (stageIndex === currentIndex) return "active";
    return "pending";
  };

  const isStudentEmail = (session?.user?.email ?? "")
    .toLowerCase()
    .endsWith("@student.uol.edu.pk");

  const userStorageId =
    (typeof session?.user?.sapId === "string" && session.user.sapId.trim()) ||
    (session?.user?.email?.trim() ?? "") ||
    (profile.email !== "—" ? profile.email.trim() : "");

  const handleOpenApplicationFlow = () => {
    setApprovalDraftSessionId(newApprovalDraftSessionId());
    setStepperMode("create");
    setStepperSubmissionMeta(null);
    setStepperViewData(null);
    setStepperViewSubmissionId(null);
    setServerDraftSubmissionId(null);
    if (isStudentEmail) {
      setIsApplicationPickerOpen(true);
      return;
    }

    setRequiredForm(null);
    setIsStepperOpen(true);
  };

  const handleSelectApplicationType = (applicationType: ApplicationType) => {
    setApprovalDraftSessionId(newApprovalDraftSessionId());
    setStepperMode("create");
    setStepperSubmissionMeta(null);
    setStepperViewData(null);
    setStepperViewSubmissionId(null);
    setServerDraftSubmissionId(null);
    setRequiredForm(resolveRequiredFormByFaculty(applicationType, profile.faculty));
    setIsApplicationPickerOpen(false);
    setIsStepperOpen(true);
  };

  const handleOpenRevision = async (request: ApprovalRequest) => {
    setIsLoadingSubmission(true);
    setSubmissionError(null);

    try {
      const response = await fetch(`/api/profile/submissions/${request.numericId}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        submission?: ProfileSubmissionDetail;
      };

      if (!response.ok || !payload.ok || !payload.submission) {
        setSubmissionError(payload.error ?? "Unable to load submission for revision.");
        return;
      }
      const ethics =
        payload.submission.ethics_json && typeof payload.submission.ethics_json === "object"
          ? (payload.submission.ethics_json as Record<string, unknown>)
          : null;
      const incomingRequiredForm =
        ethics?.requiredForm && typeof ethics.requiredForm === "object"
          ? (ethics.requiredForm as RequiredForm)
          : null;

      setRequiredForm(incomingRequiredForm);
      setStepperMode("edit");
      setServerDraftSubmissionId(null);
      setStepperViewSubmissionId(payload.submission.id);
      setStepperSubmissionMeta({
        revisionOfSubmissionId: payload.submission.id,
        revisionNumber: request.revisionNumber + 1,
      });
      setStepperViewData({
        form:
          ethics?.form && typeof ethics.form === "object"
            ? (ethics.form as Record<string, unknown>)
            : {},
        attachmentFiles:
          ethics?.attachmentFiles &&
          typeof ethics.attachmentFiles === "object" &&
          !Array.isArray(ethics.attachmentFiles)
            ? (ethics.attachmentFiles as Record<string, unknown>)
            : {},
        extraUploadFiles: Array.isArray(ethics?.extraUploadFiles)
          ? (ethics.extraUploadFiles as unknown[])
          : [],
        currentStep: 0,
      });
      setIsStepperOpen(true);
    } catch {
      setSubmissionError("Network error while opening revision.");
    } finally {
      setIsLoadingSubmission(false);
    }
  };

  const handleViewSubmission = async (submissionId: number) => {
    setIsLoadingSubmission(true);
    setSubmissionError(null);

    try {
      const response = await fetch(`/api/profile/submissions/${submissionId}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        submission?: ProfileSubmissionDetail;
      };

      if (!response.ok || !payload.ok || !payload.submission) {
        setSubmissionError(payload.error ?? "Unable to load application details.");
        return;
      }
      const ethics =
        payload.submission.ethics_json && typeof payload.submission.ethics_json === "object"
          ? (payload.submission.ethics_json as Record<string, unknown>)
          : null;
      const incomingRequiredForm =
        ethics?.requiredForm && typeof ethics.requiredForm === "object"
          ? (ethics.requiredForm as RequiredForm)
          : null;

      setRequiredForm(incomingRequiredForm);
      setStepperMode("view");
      setStepperViewSubmissionId(submissionId);
      setStepperViewData({
        form:
          ethics?.form && typeof ethics.form === "object"
            ? (ethics.form as Record<string, unknown>)
            : {},
        attachmentFiles:
          ethics?.attachmentFiles &&
          typeof ethics.attachmentFiles === "object" &&
          !Array.isArray(ethics.attachmentFiles)
            ? (ethics.attachmentFiles as Record<string, unknown>)
            : {},
        extraUploadFiles: Array.isArray(ethics?.extraUploadFiles)
          ? (ethics.extraUploadFiles as unknown[])
          : [],
        currentStep: 0,
      });
      setIsStepperOpen(true);
    } catch {
      setSubmissionError("Network error while loading application details.");
    } finally {
      setIsLoadingSubmission(false);
    }
  };

  const handleContinueDraft = async (request: ApprovalRequest) => {
    setIsLoadingSubmission(true);
    setSubmissionError(null);

    try {
      const response = await fetch(`/api/profile/submissions/${request.numericId}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        submission?: ProfileSubmissionDetail;
      };

      if (!response.ok || !payload.ok || !payload.submission) {
        setSubmissionError(payload.error ?? "Unable to load draft.");
        return;
      }

      if (payload.submission.current_status !== "draft") {
        setSubmissionError("This application is no longer a draft.");
        return;
      }

      const ethics =
        payload.submission.ethics_json && typeof payload.submission.ethics_json === "object"
          ? (payload.submission.ethics_json as Record<string, unknown>)
          : null;
      const incomingRequiredForm =
        ethics?.requiredForm && typeof ethics.requiredForm === "object"
          ? (ethics.requiredForm as RequiredForm)
          : null;

      const rawStep = ethics?.currentStep;
      const currentStep =
        typeof rawStep === "number" && Number.isInteger(rawStep) ? rawStep : 0;
      const completedRaw = ethics?.completedSteps;
      const completedSteps = Array.isArray(completedRaw)
        ? completedRaw.filter((n): n is number => typeof n === "number" && Number.isInteger(n))
        : undefined;

      setRequiredForm(incomingRequiredForm);
      setStepperSubmissionMeta({ draftSubmissionId: payload.submission.id });
      setStepperMode("resume");
      setServerDraftSubmissionId(payload.submission.id);
      setStepperViewSubmissionId(payload.submission.id);
      setApprovalDraftSessionId(newApprovalDraftSessionId());
      setStepperViewData({
        form:
          ethics?.form && typeof ethics.form === "object"
            ? (ethics.form as Record<string, unknown>)
            : {},
        attachmentFiles:
          ethics?.attachmentFiles &&
          typeof ethics.attachmentFiles === "object" &&
          !Array.isArray(ethics.attachmentFiles)
            ? (ethics.attachmentFiles as Record<string, unknown>)
            : {},
        extraUploadFiles: Array.isArray(ethics?.extraUploadFiles)
          ? (ethics.extraUploadFiles as unknown[])
          : [],
        currentStep,
        completedSteps,
      });
      setIsStepperOpen(true);
    } catch {
      setSubmissionError("Network error while loading draft.");
    } finally {
      setIsLoadingSubmission(false);
    }
  };

  const handleDiscardDraft = async (request: ApprovalRequest) => {
    setDiscardConfirmRequest(request);
  };

  const confirmDiscardDraft = async () => {
    const request = discardConfirmRequest;
    if (!request) return;

    setSubmissionError(null);
    setDiscardingDraftId(request.numericId);
    try {
      const response = await fetch(`/api/profile/submissions/${request.numericId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        setSubmissionError(payload.error ?? "Unable to discard draft.");
        return;
      }
      setRequests((prev) => prev.filter((item) => item.numericId !== request.numericId));
      if (serverDraftSubmissionId === request.numericId) {
        setServerDraftSubmissionId(null);
      }
      await fetchRequests();
    } catch {
      setSubmissionError("Network error while discarding draft.");
    } finally {
      setDiscardConfirmRequest(null);
      setDiscardingDraftId(null);
    }
  };

  const handleGoogleSignIn = async () => {
    await signIn("google", { callbackUrl: "/profile", redirect: true });
  };

  if (status === "loading") {
    return (
      <div className="mx-auto w-full max-w-[1100px]">
        <Breadcrumb pageName="Profile" />
        <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <p className="text-body-sm">Checking your session...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto w-full max-w-[1100px]">
        <Breadcrumb pageName="Profile" />
        <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h2 className="text-heading-6 font-bold text-dark dark:text-white">
            Sign in to access your profile
          </h2>
          <p className="mt-2 text-body-sm">
            Use your university Google account to continue to the profile dashboard.
          </p>
          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            className="mt-4 rounded-lg bg-primary px-4 py-2.5 font-medium text-white hover:bg-opacity-90"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <Breadcrumb pageName="Profile" />

      <div className="grid gap-6">
        <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h2 className="text-heading-6 font-bold text-dark dark:text-white">
            {profile.name}
          </h2>
          <p className="mt-1 font-medium">
            {profile.regNo} · {profile.department}
          </p>
          <p className="text-body-sm">{profile.email}</p>
          <p className="mt-1 text-body-sm">
            Faculty: {profile.faculty} · Degree: {profile.degreeTitle}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-stroke p-3 text-center dark:border-dark-3">
              <p className="text-body-sm">Under Review by Dean</p>
              <p className="text-lg font-bold text-dark dark:text-white">{requestStats.inDean}</p>
            </div>
            <div className="rounded-lg border border-stroke p-3 text-center dark:border-dark-3">
              <p className="text-body-sm">Under Review by IREB</p>
              <p className="text-lg font-bold text-dark dark:text-white">{requestStats.inEthical}</p>
            </div>
            <div className="rounded-lg border border-stroke p-3 text-center dark:border-dark-3">
              <p className="text-body-sm">Completed Decisions</p>
              <p className="text-lg font-bold text-dark dark:text-white">{requestStats.completed}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h3 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">
            Create New Approval Request
          </h3>
          <p className="mb-4 text-body-sm">
            Start the multi-step ethical review form and submit your approval request.
          </p>
          <button
            type="button"
            onClick={handleOpenApplicationFlow}
            className="rounded-lg bg-primary px-4 py-2.5 font-medium text-white hover:bg-opacity-90"
          >
            Open New Approval Application
          </button>
        </div>

        <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h3 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">
            Track Submitted Requests
          </h3>
          {isLoadingRequests && (
            <p className="mb-3 text-body-sm">Refreshing latest submission statuses...</p>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application ID</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Expected Response</TableHead>
                <TableHead>Current Stage</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="whitespace-nowrap font-mono text-sm font-semibold text-dark dark:text-white">
                    {request.applicationId}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-dark dark:text-white">{request.title}</p>
                    <p className="text-body-sm">{request.id}</p>
                  </TableCell>
                  <TableCell>{request.submittedOn}</TableCell>
                  <TableCell>{request.isDraft ? "—" : "2 days"}</TableCell>
                  <TableCell>{request.currentStage}</TableCell>
                  <TableCell>
                    {request.isDraft ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleContinueDraft(request)}
                          className="rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/10"
                        >
                          Continue
                        </button>
                        <button
                          type="button"
                          disabled={discardingDraftId === request.numericId}
                          onClick={() => void handleDiscardDraft(request)}
                          className="rounded-md border border-red px-3 py-1.5 text-sm font-medium text-red transition hover:bg-red/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {discardingDraftId === request.numericId ? "Discarding..." : "Discard"}
                        </button>
                      </div>
                    ) : request.currentStage.includes("Rejected") ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleOpenRevision(request)}
                          className="rounded-md border border-amber-500 px-3 py-1.5 text-sm font-medium text-amber-600 transition hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                        >
                          Submit Revision
                        </button>
                        {request.latestFeedbackComment && (
                          <button
                            type="button"
                            onClick={() => setFeedbackModalRequest(request)}
                            className="rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/10"
                          >
                            View Feedback
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleViewSubmission(request.numericId)}
                          className="rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/10"
                        >
                          View Application
                        </button>
                        {request.latestFeedbackComment && (
                          <button
                            type="button"
                            onClick={() => setFeedbackModalRequest(request)}
                            className="rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/10"
                          >
                            View Feedback
                          </button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-body-sm">
                    No submissions found yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {submissionError && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{submissionError}</p>
          )}

          <div className="mt-6 grid gap-4">
            {requests.map((request) => (
              <div
                key={`${request.id}-timeline`}
                className="rounded-lg border border-stroke p-4 dark:border-dark-3"
              >
                <p className="font-medium text-dark dark:text-white">{request.title}</p>
                <p className="mb-4 text-body-sm">{request.description}</p>
                {request.isDraft ? (
                  <p className="text-body-sm text-dark-6 dark:text-dark-6">
                    Draft — not submitted yet. Use Continue in the table above to finish your
                    application.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {STAGES.map((stage) => {
                      const state = getStageState(request.currentStage, stage);

                      return (
                        <div key={stage} className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex size-2.5 rounded-full",
                              state === "done" && "bg-green",
                              state === "active" && "bg-primary ring-4 ring-primary/20",
                              state === "pending" && "bg-stroke dark:bg-dark-3",
                            )}
                          />
                          <span
                            className={cn(
                              "text-sm",
                              state === "active" && "font-semibold text-dark dark:text-white",
                            )}
                          >
                            {stage}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <ApprovalRequestStepper
        key={
          stepperMode === "create"
            ? `create-${approvalDraftSessionId}-${requiredForm?.id ?? "none"}`
            : stepperMode === "resume"
              ? `resume-${stepperViewSubmissionId ?? serverDraftSubmissionId ?? 0}-${requiredForm?.id ?? "none"}`
              : stepperMode === "edit"
                ? `edit-${(stepperSubmissionMeta as { revisionOfSubmissionId?: number } | null)?.revisionOfSubmissionId ?? 0}-${(stepperSubmissionMeta as { revisionNumber?: number } | null)?.revisionNumber ?? 0}`
                : `view-${stepperViewSubmissionId ?? 0}`
        }
        open={isStepperOpen}
        onClose={() => {
          setIsStepperOpen(false);
          setStepperViewSubmissionId(null);
          if (stepperMode === "create") {
            setServerDraftSubmissionId(null);
          }
          if (stepperMode === "view" || stepperMode === "edit") {
            setStepperViewData(null);
            setStepperSubmissionMeta(null);
            setStepperMode("create");
            setRequiredForm(null);
          }
          if (stepperMode === "resume") {
            setStepperViewData(null);
            setStepperMode("create");
            setRequiredForm(null);
            setServerDraftSubmissionId(null);
          }
        }}
        onSubmit={handleCreateRequest}
        mode={stepperMode}
        submissionMeta={stepperSubmissionMeta}
        viewSubmissionData={stepperViewData}
        requiredForm={requiredForm}
        userStorageId={userStorageId}
        draftSessionId={
          stepperMode === "create" || stepperMode === "resume" ? approvalDraftSessionId : null
        }
        serverDraftSubmissionId={serverDraftSubmissionId}
        persistDraft={handlePersistDraft}
        onServerDraftSaved={(id) => setServerDraftSubmissionId(id)}
        applicantProfile={{
          name: profile.name,
          regNo: profile.regNo,
          email: profile.email,
          faculty: profile.faculty,
          department: profile.department,
          program: profile.degreeTitle,
        }}
      />

      {isApplicationPickerOpen && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-dark/60 px-4 py-6 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-[12px] border border-stroke bg-white p-6 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
            <h3 className="text-heading-6 font-bold text-dark dark:text-white">
              Select Application Type
            </h3>
            <p className="mt-2 text-body-sm">
              Please choose your application type. The required form will be selected
              automatically based on your faculty.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleSelectApplicationType("thesis")}
                className="rounded-lg border border-stroke px-4 py-3 text-sm font-semibold text-dark transition hover:border-primary hover:bg-primary/5 dark:border-dark-3 dark:text-white"
              >
                Thesis
              </button>
              <button
                type="button"
                onClick={() => handleSelectApplicationType("research-publication")}
                className="rounded-lg border border-stroke px-4 py-3 text-sm font-semibold text-dark transition hover:border-primary hover:bg-primary/5 dark:border-dark-3 dark:text-white"
              >
                Research Publication
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsApplicationPickerOpen(false)}
                className="rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {feedbackModalRequest && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-dark/60 px-4 py-6 backdrop-blur-[2px]">
          <div className="w-full max-w-2xl rounded-[12px] border border-stroke bg-white p-6 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-heading-6 font-bold text-dark dark:text-white">
                  Application Feedback
                </h3>
                <p className="mt-1 text-sm text-body">
                  Application ID {feedbackModalRequest.applicationId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackModalRequest(null)}
                className="rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-stroke bg-gray-1/40 p-4 dark:border-dark-3 dark:bg-dark-2/40">
              <p className="whitespace-pre-wrap text-sm text-dark dark:text-white">
                {feedbackModalRequest.latestFeedbackComment}
              </p>
            </div>
          </div>
        </div>
      )}

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
