"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ApprovalRequestStepper, {
  type SubmissionFileBundle,
} from "@/app/profile/_components/approval-request-stepper";
import {
  type ApplicationType,
  type RequiredForm,
  resolveRequiredForm,
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
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { data: session, status } = useSession();
  const isStudentEmail = (session?.user?.email ?? "")
    .toLowerCase()
    .endsWith("@student.uol.edu.pk");

  const profile = useMemo(() => {
    const isFaculty = !isStudentEmail;
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

    const deptFromRecord = getStringField(["DeptName", "Dept", "Department"]);
    const facultyDeptFromSession =
      typeof session?.user?.facultyDepartment === "string" && session.user.facultyDepartment.trim()
        ? session.user.facultyDepartment.trim()
        : null;
    const dept = isFaculty
      ? facultyDeptFromSession ?? deptFromRecord ?? "—"
      : deptFromRecord ?? "—";
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
    const designationFromSession =
      typeof session?.user?.facultyDesignation === "string" && session.user.facultyDesignation.trim()
        ? session.user.facultyDesignation.trim()
        : null;
    const degreeTitle = isFaculty
      ? designationFromSession ?? "—"
      : getStringField(["DegrTitle", "DegreeTitle", "Degree"]) ?? "—";
    const reg =
      rec && typeof rec === "object" && "RegNo" in rec && typeof (rec as { RegNo?: string }).RegNo === "string"
        ? (rec as { RegNo: string }).RegNo
        : session?.user?.sapId
          ? `SAP ${session.user.sapId}`
          : "—";

    return {
      name: session?.user?.name ?? (isFaculty ? "Faculty" : "Student"),
      regNo: reg,
      email: session?.user?.email ?? "—",
      department: dept,
      faculty,
      degreeTitle,
    };
  }, [isStudentEmail, session]);

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

    setRequiredForm({
      id: "form6-publication-faculty-non-medical",
      label: "Form 6 Research Publication Form for Faculty/Staff (Non-Medical Sciences)",
      href: "#",
      applicationType: "research-publication",
    });
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
      const fallbackRequiredForm = resolveRequiredForm(
        payload.submission.type === "publication" ? "research-publication" : "thesis",
        payload.submission.domain === "medical",
      );

      // Align loaded submissions with current form mapping by type/domain.
      setRequiredForm(fallbackRequiredForm);
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
      const fallbackRequiredForm = resolveRequiredForm(
        payload.submission.type === "publication" ? "research-publication" : "thesis",
        payload.submission.domain === "medical",
      );

      // Align loaded submissions with current form mapping by type/domain.
      setRequiredForm(fallbackRequiredForm);
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
      const fallbackRequiredForm = resolveRequiredForm(
        payload.submission.type === "publication" ? "research-publication" : "thesis",
        payload.submission.domain === "medical",
      );

      const rawStep = ethics?.currentStep;
      const currentStep =
        typeof rawStep === "number" && Number.isInteger(rawStep) ? rawStep : 0;
      const completedRaw = ethics?.completedSteps;
      const completedSteps = Array.isArray(completedRaw)
        ? completedRaw.filter((n): n is number => typeof n === "number" && Number.isInteger(n))
        : undefined;

      // Align loaded submissions with current form mapping by type/domain.
      setRequiredForm(fallbackRequiredForm);
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
    const { signInStudentViaGoogleBrowserToken } = await import("@/lib/student-google-browser-signin");
    const res = await signInStudentViaGoogleBrowserToken(signIn, "/profile");
    if (res.ok) {
      router.push(res.redirectUrl);
      router.refresh();
      return;
    }
    const ec = res.errorCode ?? "AccessDenied";
    router.push(
      `/auth/sign-in?error=${encodeURIComponent(ec)}&callbackUrl=${encodeURIComponent("/profile")}`,
    );
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

      <div className="grid gap-6 max-w-7xl mx-auto">
  {/* Profile & Stats Overview */}
  <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card overflow-hidden relative">
    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-purple-500 opacity-80" />
    
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
      {/* Profile Info */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg ring-4 ring-primary/10 dark:ring-primary/20">
          {profile.name?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <div>
          <h2 className="text-heading-6 font-bold text-dark dark:text-white">
            {profile.name}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-dark-6 dark:text-dark-6">
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
              {profile.regNo}
            </span>
            <span className="w-px h-3 bg-stroke dark:bg-dark-3" />
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {profile.department}
            </span>
          </div>
          <p className="mt-1.5 text-body-sm lowercase text-dark-6 dark:text-dark-6 inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {profile.email}
          </p>
          
          <div className="mt-3">
            {!isStudentEmail ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-lg border border-stroke dark:border-dark-3 bg-gray-50 dark:bg-dark-2/50 px-3 py-1.5">
                  <span className="text-xs text-dark-6 dark:text-dark-6">Designation</span>
                  <span className="h-3 w-px bg-stroke dark:bg-dark-3" />
                  <span className="text-xs font-bold text-dark dark:text-white">{profile.degreeTitle}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg border border-stroke dark:border-dark-3 bg-gray-50 dark:bg-dark-2/50 px-3 py-1.5">
                  <span className="text-xs text-dark-6 dark:text-dark-6">Department</span>
                  <span className="h-3 w-px bg-stroke dark:bg-dark-3" />
                  <span className="text-xs font-bold text-dark dark:text-white">{profile.department}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-lg border border-stroke dark:border-dark-3 bg-gray-50 dark:bg-dark-2/50 px-3 py-1.5">
                  <span className="text-xs text-dark-6 dark:text-dark-6">Faculty</span>
                  <span className="h-3 w-px bg-stroke dark:bg-dark-3" />
                  <span className="text-xs font-bold text-dark dark:text-white">{profile.faculty}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg border border-stroke dark:border-dark-3 bg-gray-50 dark:bg-dark-2/50 px-3 py-1.5">
                  <span className="text-xs text-dark-6 dark:text-dark-6">Degree</span>
                  <span className="h-3 w-px bg-stroke dark:bg-dark-3" />
                  <span className="text-xs font-bold text-dark dark:text-white">{profile.degreeTitle}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Stats Grid */}
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="group relative rounded-xl border border-stroke bg-gray-50/50 dark:bg-dark-2/30 dark:border-dark-3 p-4 transition-all duration-300 hover:shadow-md hover:border-amber-500/30 dark:hover:border-amber-500/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-body-sm text-dark-6 dark:text-dark-6 mb-1">Under Review by Dean</p>
            <p className="text-2xl font-bold text-dark dark:text-white tabular-nums tracking-tight">{requestStats.inDean}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="mt-3 h-1 w-full bg-gray-200 dark:bg-dark-3 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min((requestStats.inDean / (requestStats.inDean + requestStats.inEthical + requestStats.completed || 1)) * 100, 100)}%` }} />
        </div>
      </div>

      <div className="group relative rounded-xl border border-stroke bg-gray-50/50 dark:bg-dark-2/30 dark:border-dark-3 p-4 transition-all duration-300 hover:shadow-md hover:border-primary/30 dark:hover:border-primary/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-body-sm text-dark-6 dark:text-dark-6 mb-1">Under Review by IREB</p>
            <p className="text-2xl font-bold text-dark dark:text-white tabular-nums tracking-tight">{requestStats.inEthical}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <div className="mt-3 h-1 w-full bg-gray-200 dark:bg-dark-3 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${Math.min((requestStats.inEthical / (requestStats.inDean + requestStats.inEthical + requestStats.completed || 1)) * 100, 100)}%` }} />
        </div>
      </div>

      <div className="group relative rounded-xl border border-stroke bg-gray-50/50 dark:bg-dark-2/30 dark:border-dark-3 p-4 transition-all duration-300 hover:shadow-md hover:border-green-500/30 dark:hover:border-green-500/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-body-sm text-dark-6 dark:text-dark-6 mb-1">Completed Decisions</p>
            <p className="text-2xl font-bold text-dark dark:text-white tabular-nums tracking-tight">{requestStats.completed}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="mt-3 h-1 w-full bg-gray-200 dark:bg-dark-3 rounded-full overflow-hidden">
          <div className="h-full bg-green rounded-full transition-all duration-1000" style={{ width: `${Math.min((requestStats.completed / (requestStats.inDean + requestStats.inEthical + requestStats.completed || 1)) * 100, 100)}%` }} />
        </div>
      </div>
    </div>
  </div>

  {/* Quick Action Card */}
  <div className="rounded-[10px] bg-gradient-to-br from-primary/[0.03] to-blue-500/[0.03] border border-primary/10 dark:border-primary/20 p-6 dark:bg-gray-dark/50 relative overflow-hidden">
    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div>
          <h3 className="text-heading-6 font-bold text-dark dark:text-white">
            Create New Approval Request
          </h3>
          <p className="mt-1 text-body-sm text-dark-6 dark:text-dark-6 max-w-xl">
            Start the multi-step ethical review form and submit your approval request to the review board.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleOpenApplicationFlow}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:bg-opacity-90 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] transition-all duration-200 whitespace-nowrap"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Open New Approval Application
      </button>
    </div>
  </div>

  {/* Submissions Tracking */}
  <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-dark-3 flex items-center justify-center text-dark dark:text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <div>
          <h3 className="text-heading-6 font-bold text-dark dark:text-white">
            Track Submitted Requests
          </h3>
          <p className="text-body-sm text-dark-6 dark:text-dark-6">
            Monitor application status and manage drafts
          </p>
        </div>
      </div>
      {isLoadingRequests && (
        <span className="inline-flex items-center gap-2 text-body-sm text-dark-6 dark:text-dark-6 bg-gray-50 dark:bg-dark-2/50 px-3 py-1.5 rounded-lg border border-stroke dark:border-dark-3">
          <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Refreshing statuses...
        </span>
      )}
    </div>

    <div className="overflow-x-auto -mx-6 px-6">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-stroke dark:border-dark-3 hover:bg-transparent">
            <TableHead className="text-[11px] font-bold text-dark-6 dark:text-dark-6 uppercase tracking-wider whitespace-nowrap">Application ID</TableHead>
            <TableHead className="text-[11px] font-bold text-dark-6 dark:text-dark-6 uppercase tracking-wider">Request</TableHead>
            <TableHead className="text-[11px] font-bold text-dark-6 dark:text-dark-6 uppercase tracking-wider whitespace-nowrap">Submitted</TableHead>
            <TableHead className="text-[11px] font-bold text-dark-6 dark:text-dark-6 uppercase tracking-wider whitespace-nowrap">Expected Response</TableHead>
            <TableHead className="text-[11px] font-bold text-dark-6 dark:text-dark-6 uppercase tracking-wider">Current Stage</TableHead>
            <TableHead className="text-[11px] font-bold text-dark-6 dark:text-dark-6 uppercase tracking-wider text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id} className="group border-b border-stroke/50 dark:border-dark-3/50 transition-colors hover:bg-gray-50/80 dark:hover:bg-dark-2/20">
              <TableCell className="whitespace-nowrap py-4">
                <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-dark dark:text-white bg-gray-100 dark:bg-dark-3 px-2.5 py-1 rounded-md border border-stroke/50 dark:border-dark-3">
                  {request.applicationId}
                </span>
              </TableCell>
              <TableCell className="py-4">
                <p className="font-semibold text-dark dark:text-white leading-tight">{request.title}</p>
                <p className="text-body-sm text-dark-6 dark:text-dark-6 mt-0.5">{request.id}</p>
              </TableCell>
              <TableCell className="text-body-sm text-dark-6 dark:text-dark-6 py-4 whitespace-nowrap">{request.submittedOn}</TableCell>
              <TableCell className="text-body-sm text-dark-6 dark:text-dark-6 py-4 whitespace-nowrap">
                {request.isDraft ? (
                  <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Draft
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    2 days
                  </span>
                )}
              </TableCell>
              <TableCell className="py-4">
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border",
                  request.currentStage.includes("Rejected") 
                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                    : request.currentStage.includes("Approved") 
                    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
                    : request.isDraft
                    ? "bg-gray-100 text-gray-700 border-gray-200 dark:bg-dark-3 dark:text-gray-400 dark:border-dark-3"
                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    request.currentStage.includes("Rejected") ? "bg-red-500" :
                    request.currentStage.includes("Approved") ? "bg-green" :
                    request.isDraft ? "bg-gray-400" : "bg-primary"
                  )} />
                  {request.currentStage}
                </span>
              </TableCell>
              <TableCell className="py-4 text-right">
                {request.isDraft ? (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void handleContinueDraft(request)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary hover:text-white hover:shadow-md hover:shadow-primary/20"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      Continue
                    </button>
                    <button
                      type="button"
                      disabled={discardingDraftId === request.numericId}
                      onClick={() => void handleDiscardDraft(request)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-red px-3 py-1.5 text-sm font-semibold text-red transition-all duration-200 hover:bg-red hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-red"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {discardingDraftId === request.numericId ? "Discarding..." : "Discard"}
                    </button>
                  </div>
                ) : request.currentStage.includes("Rejected") ? (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void handleOpenRevision(request)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-amber-500 px-3 py-1.5 text-sm font-semibold text-amber-600 transition-all duration-200 hover:bg-amber-500 hover:text-white dark:text-amber-400 dark:hover:bg-amber-500 dark:hover:text-white"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Submit Revision
                    </button>
                    {request.latestFeedbackComment && (
                      <button
                        type="button"
                        onClick={() => setFeedbackModalRequest(request)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary hover:text-white hover:shadow-md hover:shadow-primary/20"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        View Feedback
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void handleViewSubmission(request.numericId)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary hover:text-white hover:shadow-md hover:shadow-primary/20"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Application
                    </button>
                    {request.latestFeedbackComment && (
                      <button
                        type="button"
                        onClick={() => setFeedbackModalRequest(request)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary hover:text-white hover:shadow-md hover:shadow-primary/20"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
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
              <TableCell colSpan={6} className="py-12 text-center">
                <div className="flex flex-col items-center justify-center text-dark-6 dark:text-dark-6">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-3 flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-body-sm font-medium">No submissions found yet.</p>
                  <p className="text-xs mt-1 opacity-70">Create a new approval request to get started.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>

    {submissionError && (
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-red/20 bg-red/5 px-4 py-3 text-sm text-red dark:text-red">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {submissionError}
      </div>
    )}

    {/* Timeline Section */}
    <div className="mt-8 pt-6 border-t border-stroke dark:border-dark-3">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-3 flex items-center justify-center">
          <svg className="w-4 h-4 text-dark-6 dark:text-dark-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h4 className="text-sm font-bold text-dark-6 dark:text-dark-6 uppercase tracking-wider">
          Application Progress
        </h4>
      </div>
      
      <div className="grid gap-4 lg:grid-cols-2">
        {requests.map((request) => (
          <div
            key={`${request.id}-timeline`}
            className="group rounded-xl border border-stroke bg-gray-50/30 dark:bg-dark-2/20 dark:border-dark-3 p-5 transition-all duration-300 hover:shadow-md hover:border-primary/20 dark:hover:border-primary/20"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-dark dark:text-white group-hover:text-primary dark:group-hover:text-primary transition-colors">{request.title}</p>
                <p className="text-body-sm text-dark-6 dark:text-dark-6 mt-0.5">{request.description}</p>
              </div>
              {request.isDraft && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                  Draft
                </span>
              )}
            </div>
            
            {request.isDraft ? (
              <div className="flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 px-4 py-3">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Draft — not submitted yet. Use <span className="font-semibold">Continue</span> in the table above to finish your application.
                </p>
              </div>
            ) : (
              <div className="relative pl-2">
                {STAGES.map((stage, idx) => {
                  const state = getStageState(request.currentStage, stage);
                  const isLast = idx === STAGES.length - 1;

                  return (
                    <div key={stage} className="relative flex items-start gap-3 pb-4 last:pb-0">
                      {/* Connector line */}
                      {!isLast && (
                        <div className={cn(
                          "absolute left-[9px] top-5 w-0.5 h-full -translate-x-1/2",
                          state === "done" ? "bg-green/40" : "bg-stroke dark:bg-dark-3"
                        )} />
                      )}
                      
                      {/* Status dot */}
                      <div className={cn(
                        "relative z-10 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300",
                        state === "done" && "bg-green text-white",
                        state === "active" && "bg-primary text-white ring-4 ring-primary/20",
                        state === "pending" && "bg-gray-200 dark:bg-dark-3 text-dark-6 dark:text-dark-6"
                      )}>
                        {state === "done" ? (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : state === "active" ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-600" />
                        )}
                      </div>
                      
                      <div className={cn(
                        "pt-0.5",
                        state === "active" && "-mt-0.5"
                      )}>
                        <span className={cn(
                          "text-sm transition-colors duration-200",
                          state === "done" && "font-medium text-dark dark:text-white",
                          state === "active" && "font-bold text-dark dark:text-white",
                          state === "pending" && "text-dark-6 dark:text-dark-6"
                        )}>
                          {stage}
                        </span>
                        {state === "active" && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 dark:bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wide">
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
        ))}
      </div>
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
