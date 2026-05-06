"use client";

import {
  inferFormIdFromLegacyRequiredForm,
  type ApprovalFormId,
} from "@/app/profile/_components/forms/form-registry";
import { resolveAttachmentSlotLabels } from "@/app/profile/_components/forms/attachment-lists-by-form";
import { describeEthicsAttachmentValue } from "@/lib/ethics-attachment-meta";
import {
  buildApplicationReportHtml,
  type SubmissionReportInput,
} from "@/lib/application-report-html";
import {
  buildApplicationStatusReportHtml,
  buildStudentLevelAnalysisReportHtml,
  type AdminReportSubmission,
  type LeadReportRow,
} from "@/lib/admin-leads-reports-html";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dropdown,
  DropdownClose,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

type LeadStatus =
  | "Submitted"
  | "Under Review by Dean"
  | "Approved by Dean"
  | "Rejected by Dean"
  | "Under Review by IREB"
  | "Approved by IREB"
  | "Rejected by IREB";

type Lead = {
  id: number;
  /** 6-digit application reference */
  applicationId: string;
  name: string;
  email: string;
  faculty: string;
  project: string;
  duration: string;
  passedStatus: LeadStatus;
  currentStatus: LeadStatus;
  stage: "dean" | "ireb" | "completed";
  avatar: string;
  latestFeedbackComment?: string | null;
  latestAuditNote?: string | null;
  latestActionTrace?: string | null;
};

const LEADS: Lead[] = [
  {
    id: 1,
    applicationId: "482913",
    name: "Ayesha Khan",
    email: "ayesha.khan@uol.edu.pk",
    faculty: "Faculty",
    project: "12 Jan 2026 - 18 Jan 2026",
    duration: "6 days",
    passedStatus: "Submitted",
    currentStatus: "Rejected by Dean",
    stage: "completed",
    avatar: "/images/user/user-17.png",
  },
  {
    id: 2,
    applicationId: "571204",
    name: "Muhammad Ali",
    email: "m.ali@uol.edu.pk",
    faculty: "Faculty",
    project: "03 Feb 2026 - 4 Feb 2026",
    duration: "1 days",
    passedStatus: "Approved by Dean",
    currentStatus: "Under Review by IREB",
    stage: "ireb",
    avatar: "/images/user/user-15.png",
  },
  {
    id: 3,
    applicationId: "639847",
    name: "Fatima Noor",
    email: "fatima.noor@uol.edu.pk",
    faculty: "Faculty",
    project: "20 Mar 2026 - 27 Mar 2026",
    duration: "7 days",
    passedStatus: "Approved by Dean",
    currentStatus: "Approved by IREB",
    stage: "completed",
    avatar: "/images/user/user-19.png",
  },
  {
    id: 4,
    applicationId: "204815",
    name: "Hassan Raza",
    email: "hassan.raza@uol.edu.pk",
    faculty: "Faculty",
    project: "01 Apr 2026 - 04 Apr 2026",
    duration: "3 days",
    passedStatus: "Submitted",
    currentStatus: "Under Review by Dean",
    stage: "dean",
    avatar: "/images/user/user-14.png",
  },
  {
    id: 5,
    applicationId: "918376",
    name: "Zainab Ahmed",
    email: "zainab.ahmed@uol.edu.pk",
    faculty: "Faculty",
    project: "15 May 2026 - 25 May 2026",
    duration: "10 days",
    passedStatus: "Approved by Dean",
    currentStatus: "Rejected by IREB",
    stage: "completed",
    avatar: "/images/user/user-21.png",
  },
];

type PropsType = {
  className?: string;
  deanOnly?: boolean;
  ethicalOnly?: boolean;
  title?: string;
  leads?: Lead[];
  currentRole?: "administrator" | "dean" | "ireb" | null;
};

type DecisionAction = "approved" | "rejected";
type AdminOption = { id: string; name: string; role: "dean" | "ireb" };

type SlotFileInfo = { displayName: string | null; hasStoredFile: boolean };

function parseAttachmentSlotMap(raw: unknown): Record<string, SlotFileInfo | null> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, SlotFileInfo | null> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const d = describeEthicsAttachmentValue(v);
    out[k] = d ? { displayName: d.displayName, hasStoredFile: d.hasStoredFile } : null;
  }
  return out;
}

function listExtraUploadSlots(raw: unknown): { index: number; displayName: string; hasStoredFile: boolean }[] {
  if (!Array.isArray(raw)) return [];
  const out: { index: number; displayName: string; hasStoredFile: boolean }[] = [];
  raw.forEach((item, index) => {
    const d = describeEthicsAttachmentValue(item);
    if (d) {
      out.push({ index, displayName: d.displayName, hasStoredFile: d.hasStoredFile });
    }
  });
  return out;
}

function leadToReportRow(lead: Lead): LeadReportRow {
  return {
    applicationId: lead.applicationId,
    name: lead.name,
    email: lead.email,
    faculty: lead.faculty,
    project: lead.project,
    duration: lead.duration,
    passedStatus: lead.passedStatus,
    currentStatus: lead.currentStatus,
    stage: lead.stage,
    latestFeedbackComment: lead.latestFeedbackComment,
    latestAuditNote: lead.latestAuditNote,
    latestActionTrace: lead.latestActionTrace,
  };
}

function saveTextDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function inferFormIdFromEthics(ethics: Record<string, unknown> | null): ApprovalFormId | null {
  if (!ethics) return null;
  const rf = ethics.requiredForm;
  if (rf && typeof rf === "object" && !Array.isArray(rf)) {
    const o = rf as { id?: string; label?: string; applicationType?: string };
    if (o.id && typeof o.id === "string") {
      const id = o.id as ApprovalFormId;
      const valid: ApprovalFormId[] = [
        "form1-thesis-non-medical",
        "form2-publication-non-medical",
        "form3-thesis-medical",
        "form4-publication-medical",
        "form5-publication-faculty-staff",
      ];
      if (valid.includes(id)) return id;
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

export function LeadsReport({
  className,
  deanOnly = false,
  ethicalOnly = false,
  title = "Leads Report",
  leads: providedLeads,
  currentRole = null,
}: PropsType) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "overdue">("all");
  const [busyLeadId, setBusyLeadId] = useState<number | null>(null);
  const [actionMenuLeadId, setActionMenuLeadId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [decisionLead, setDecisionLead] = useState<Lead | null>(null);
  const [decisionAction, setDecisionAction] = useState<DecisionAction>("approved");
  const [decisionComment, setDecisionComment] = useState("");
  const [adminOptions, setAdminOptions] = useState<{
    deanOption: AdminOption | null;
    irebOptions: AdminOption[];
  }>({ deanOption: null, irebOptions: [] });
  const [selectedOnBehalfOf, setSelectedOnBehalfOf] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [attachmentModalLead, setAttachmentModalLead] = useState<Lead | null>(null);
  const [attachmentModalPayload, setAttachmentModalPayload] = useState<unknown>(null);
  const [attachmentModalLoading, setAttachmentModalLoading] = useState(false);
  const [attachmentModalError, setAttachmentModalError] = useState<string | null>(null);
  const [attachmentViewTarget, setAttachmentViewTarget] = useState<{
    label: string;
    fileName: string;
    hasStoredFile: boolean;
    downloadUrl?: string;
  } | null>(null);
  const [feedbackModalLead, setFeedbackModalLead] = useState<Lead | null>(null);
  const [actionTraceModalLead, setActionTraceModalLead] = useState<Lead | null>(null);
  const [adminReports, setAdminReports] = useState<
    | null
    | { phase: "pick"; lead: Lead }
    | { phase: "preview"; kind: "student" | "status"; lead: Lead }
  >(null);
  const [adminReportSubmission, setAdminReportSubmission] = useState<AdminReportSubmission | null>(null);
  const [adminReportSubmissionLoading, setAdminReportSubmissionLoading] = useState(false);
  const [adminReportPdfExporting, setAdminReportPdfExporting] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);

  const sourceLeads = providedLeads ?? LEADS;
  const scopeFilteredLeads = useMemo(() => {
    if (providedLeads) return sourceLeads;
    if (deanOnly) return sourceLeads.filter(({ stage }) => stage === "dean");
    if (ethicalOnly) return sourceLeads.filter(({ stage }) => stage === "ireb");
    return sourceLeads;
  }, [providedLeads, deanOnly, ethicalOnly, sourceLeads]);

  const leads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return scopeFilteredLeads;
    return scopeFilteredLeads.filter((lead) => {
      const app = lead.applicationId.toLowerCase();
      return (
        app.includes(q) ||
        lead.name.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.faculty.toLowerCase().includes(q)
      );
    });
  }, [scopeFilteredLeads, searchQuery]);

  const getDurationInDays = (duration: string) => {
    const days = Number.parseInt(duration, 10);
    return Number.isNaN(days) ? 0 : days;
  };

  const overdueLeads = useMemo(
    () => leads.filter((lead) => getDurationInDays(lead.duration) > 2),
    [leads],
  );

  const visibleLeads = activeTab === "overdue" ? overdueLeads : leads;
  const totalPages = Math.max(1, Math.ceil(visibleLeads.length / pageSize));
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleLeads.slice(start, start + pageSize);
  }, [visibleLeads, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, deanOnly, ethicalOnly, providedLeads]);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!decisionLead || currentRole !== "administrator") return;
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/submissions/${decisionLead.id}/action-options`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          ok: boolean;
          deanOption?: AdminOption | null;
          irebOptions?: AdminOption[];
        };
        if (!response.ok || !payload.ok || cancelled) return;
        setAdminOptions({
          deanOption: payload.deanOption ?? null,
          irebOptions: payload.irebOptions ?? [],
        });
        if (decisionLead.stage === "dean" && payload.deanOption?.id) {
          setSelectedOnBehalfOf(payload.deanOption.id);
        }
        if (decisionLead.stage === "ireb" && payload.irebOptions?.[0]?.id) {
          setSelectedOnBehalfOf(payload.irebOptions[0].id);
        }
      } catch {
        if (!cancelled) setActionError("Unable to load approval options.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentRole, decisionLead]);

  const resetDecisionModal = () => {
    setDecisionLead(null);
    setDecisionComment("");
    setSelectedOnBehalfOf("");
    setAdminOptions({ deanOption: null, irebOptions: [] });
  };

  const openDecisionModal = (lead: Lead, action: DecisionAction) => {
    setActionError(null);
    setDecisionAction(action);
    setDecisionComment("");
    setSelectedOnBehalfOf("");
    setAdminOptions({ deanOption: null, irebOptions: [] });
    setDecisionLead(lead);
  };

  const closeAttachmentModal = () => {
    setAttachmentModalLead(null);
    setAttachmentModalPayload(null);
    setAttachmentModalError(null);
    setAttachmentViewTarget(null);
  };

  const closeFeedbackModal = () => {
    setFeedbackModalLead(null);
  };
  const closeActionTraceModal = () => {
    setActionTraceModalLead(null);
  };

  const closeAdminReports = () => {
    setAdminReports(null);
    setAdminReportSubmission(null);
    setAdminReportSubmissionLoading(false);
  };

  const openAdminReportPicker = (lead: Lead) => {
    setActionMenuLeadId(null);
    setAdminReports({ phase: "pick", lead });
  };

  const selectAdminReportKind = (kind: "student" | "status") => {
    setAdminReports((s) => (s?.phase === "pick" ? { phase: "preview", kind, lead: s.lead } : s));
  };

  const adminReportPreviewHtml = useMemo(() => {
    if (!adminReports || adminReports.phase !== "preview" || adminReportSubmissionLoading) return "";
    const now = new Date();
    const row = leadToReportRow(adminReports.lead);
    if (adminReports.kind === "student") {
      return buildStudentLevelAnalysisReportHtml(row, adminReportSubmission, now);
    }
    return buildApplicationStatusReportHtml(row, adminReportSubmission, now);
  }, [adminReports, adminReportSubmission, adminReportSubmissionLoading]);

  const reportDownloadRef = useRef<{
    html: string;
    kind: "student" | "status";
    applicationId: string;
  } | null>(null);
  const adminReportPdfBusyRef = useRef(false);
  const reportPreviewIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (adminReports?.phase === "preview" && adminReportPreviewHtml) {
      reportDownloadRef.current = {
        html: adminReportPreviewHtml,
        kind: adminReports.kind,
        applicationId: adminReports.lead.applicationId,
      };
    } else {
      reportDownloadRef.current = null;
    }
  }, [adminReports, adminReportPreviewHtml]);

  const downloadActiveAdminReport = useCallback(async () => {
    const d = reportDownloadRef.current;
    if (!d?.html || adminReportPdfBusyRef.current) return;
    adminReportPdfBusyRef.current = true;
    setAdminReportPdfExporting(true);
    setActionError(null);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const base =
        d.kind === "student"
          ? `student-level-analysis-${d.applicationId}-${stamp}`
          : `application-status-${d.applicationId}-${stamp}`;
      const { downloadReportPdf } = await import("@/lib/download-admin-report-pdf");
      await downloadReportPdf(base, {
        previewIframe: reportPreviewIframeRef.current,
        html: d.html,
      });
      toast.success("Report downloaded.");
    } catch {
      const message =
        "Could not generate the PDF. Use Print → Save as PDF from the preview, or try again.";
      setActionError(message);
      toast.error(message);
    } finally {
      adminReportPdfBusyRef.current = false;
      setAdminReportPdfExporting(false);
    }
  }, []);

  useEffect(() => {
    if (adminReports?.phase !== "preview") {
      setAdminReportSubmission(null);
      setAdminReportSubmissionLoading(false);
      return;
    }
    const lead = adminReports.lead;
    let cancelled = false;
    setAdminReportSubmissionLoading(true);
    setAdminReportSubmission(null);
    void (async () => {
      try {
        const response = await fetch(`/api/submissions/${lead.id}`, { cache: "no-store" });
        const payload = (await response.json()) as {
          ok?: boolean;
          submission?: AdminReportSubmission;
        };
        if (cancelled) return;
        setAdminReportSubmission(response.ok && payload.submission ? payload.submission : null);
      } catch {
        if (!cancelled) setAdminReportSubmission(null);
      } finally {
        if (!cancelled) setAdminReportSubmissionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminReports]);

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.data?.type !== "IREB_ADMIN_REPORT_DOWNLOAD") return;
      void downloadActiveAdminReport();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [downloadActiveAdminReport]);

  const openAttachmentModal = async (lead: Lead) => {
    setAttachmentModalLead(lead);
    setAttachmentModalPayload(null);
    setAttachmentModalError(null);
    setAttachmentViewTarget(null);
    setAttachmentModalLoading(true);
    try {
      const response = await fetch(`/api/submissions/${lead.id}`, { cache: "no-store" });
      const payload = (await response.json()) as { ok?: boolean; error?: string; submission?: unknown };
      if (!response.ok || !payload?.ok || !payload.submission) {
        const message = payload?.error ?? "Unable to load submission.";
        setAttachmentModalError(message);
        toast.error(message);
        return;
      }
      setAttachmentModalPayload(payload);
    } catch {
      const message = "Network error while loading submission.";
      setAttachmentModalError(message);
      toast.error(message);
    } finally {
      setAttachmentModalLoading(false);
    }
  };

  const downloadFullApplicationReport = () => {
    if (!attachmentModalLead || !attachmentModalPayload || typeof attachmentModalPayload !== "object") return;
    const p = attachmentModalPayload as { submission?: SubmissionReportInput };
    if (!p.submission) return;
    const html = buildApplicationReportHtml(p.submission);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `application-${attachmentModalLead.applicationId}-${attachmentModalLead.id}.html`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Application report downloaded.");
  };

  const downloadNameOnlyReference = (slotLabel: string, fileName: string) => {
    if (!attachmentModalLead) return;
    const safe = fileName.replace(/[^\w.\-()+ ]/g, "_").slice(0, 120) || "file";
    const body = [
      `Application ID: ${attachmentModalLead.applicationId}`,
      `Submission record id: ${attachmentModalLead.id}`,
      `Document slot: ${slotLabel}`,
      `File name as selected by applicant: ${fileName}`,
      "",
      "Note: For this submission only the file name was recorded (legacy). The document binary was not stored on the server.",
      "Contact the applicant if you need the actual document.",
    ].join("\n");
    saveTextDownload(`${attachmentModalLead.applicationId}-${safe}-reference.txt`, body);
    toast.message("Downloaded a reference file (binary not stored on server).");
  };

  /**
   * Always tries the attachment API first when `url` is present. Falls back to the legacy
   * `.txt` reference only when the server has no binary (404) or the value was name-only.
   */
  const downloadAttachmentFromApi = async (
    url: string,
    fileName: string,
    slotLabelForFallback: string,
  ) => {
    try {
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 401 || res.status === 403) {
        toast.error("Your session expired. Please sign in again.");
        return;
      }
      const ct = (res.headers.get("content-type") ?? "").toLowerCase();
      if (res.ok && !ct.includes("application/json")) {
        const blob = await res.blob();
        if (blob.size === 0) {
          downloadNameOnlyReference(slotLabelForFallback, fileName);
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName.replace(/[\r\n"]/g, "_");
        link.click();
        URL.revokeObjectURL(objectUrl);
        toast.success("Document downloaded.");
        return;
      }
      downloadNameOnlyReference(slotLabelForFallback, fileName);
    } catch {
      downloadNameOnlyReference(slotLabelForFallback, fileName);
    }
  };

  const attachmentModalEthics = useMemo(() => {
    if (!attachmentModalPayload || typeof attachmentModalPayload !== "object") return null;
    const sub = (attachmentModalPayload as { submission?: { ethics_json?: unknown } }).submission;
    const ej = sub?.ethics_json;
    return ej && typeof ej === "object" && !Array.isArray(ej) ? (ej as Record<string, unknown>) : null;
  }, [attachmentModalPayload]);

  const attachmentModalSlots = useMemo(() => {
    if (!attachmentModalEthics) {
      return {
        labels: [] as string[],
        files: {} as Record<string, SlotFileInfo | null>,
        extras: [] as { index: number; displayName: string; hasStoredFile: boolean }[],
      };
    }
    const files = parseAttachmentSlotMap(attachmentModalEthics.attachmentFiles);
    const displayOnly = Object.fromEntries(
      Object.entries(files).map(([k, v]) => [k, v?.displayName ?? ""]),
    );
    const formId = inferFormIdFromEthics(attachmentModalEthics);
    const labels = resolveAttachmentSlotLabels(formId, displayOnly);
    const extras = listExtraUploadSlots(attachmentModalEthics.extraUploadFiles);
    return { labels, files, extras };
  }, [attachmentModalEthics]);

  const handleDecisionSubmit = async () => {
    if (!decisionLead) return;
    if (currentRole === "administrator" && !selectedOnBehalfOf) {
      const message = "Please select who this action is on behalf of.";
      setActionError(message);
      toast.error(message);
      return;
    }

    setBusyLeadId(decisionLead.id);
    setActionError(null);
    try {
      const response = await fetch(`/api/submissions/${decisionLead.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: decisionAction,
          comment: decisionComment,
          onBehalfOfAdminId: currentRole === "administrator" ? selectedOnBehalfOf : undefined,
        }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        const message = payload.error ?? "Unable to save decision.";
        setActionError(message);
        toast.error(message);
        return;
      }
      toast.success(
        decisionAction === "approved"
          ? `Application ${decisionLead.applicationId} approved.`
          : `Application ${decisionLead.applicationId} rejected.`,
      );
      resetDecisionModal();
      router.refresh();
    } catch {
      const message = "Network error while saving decision.";
      setActionError(message);
      toast.error(message);
    } finally {
      setBusyLeadId(null);
    }
  };

  return (
    <div className={cn("col-span-12", className)}>
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="flex items-start justify-between p-4 sm:p-6 xl:p-7.5">
          <h2 className="text-[22px] font-bold text-black dark:text-white">
            {title}
          </h2>

          <div className="relative">
            <button className="hover:text-primary" aria-expanded="false" aria-haspopup="menu">
              <span className="sr-only">Open menu</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M2 10C3.10457 10 4 9.10457 4 8C4 6.89543 3.10457 6 2 6C0.89543 6 0 6.89543 0 8C0 9.10457 0.89543 10 2 10Z" />
                <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" />
                <path d="M14 10C15.1046 10 16 9.10457 16 8C16 6.89543 15.1046 6 14 6C12.8954 6 12 6.89543 12 8C12 9.10457 12.8954 10 14 10Z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-4 pb-4 sm:px-6 xl:px-7.5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex w-full max-w-md flex-col gap-1.5 text-sm sm:shrink-0">
              <span className="font-medium text-dark dark:text-white">Search</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Application ID, name, email, faculty…"
                className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-dark placeholder:text-dark-5 dark:border-dark-3 dark:text-white"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === "all"
                  ? "bg-primary text-white"
                  : "bg-gray-2 text-dark hover:bg-primary/15 dark:bg-dark-2 dark:text-white",
              )}
              onClick={() => setActiveTab("all")}
            >
              All Requests ({scopeFilteredLeads.length})
            </button>
            <button
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === "overdue"
                  ? "bg-red text-white"
                  : "bg-red/10 text-red hover:bg-red/20",
              )}
              onClick={() => setActiveTab("overdue")}
            >
              Over Due Approval ({overdueLeads.length})
            </button>
          </div>

          {overdueLeads.length > 0 && (
            <div className="mt-3 rounded-md border border-red/35 bg-red/10 px-3 py-2 text-sm font-medium text-red dark:border-red/50 dark:bg-red/15">
              Attention required: {overdueLeads.length} approval request
              {overdueLeads.length > 1 ? "s have" : " has"} not been responded
              to within 2 days.
            </div>
          )}
          {actionError && (
            <div className="mt-3 rounded-md border border-red/35 bg-red/10 px-3 py-2 text-sm font-medium text-red dark:border-red/50 dark:bg-red/15">
              {actionError}
            </div>
          )}
        </div>

        <div className="max-h-[560px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-white dark:bg-gray-dark">
              <TableRow className="border-b text-base [&>th]:px-4 md:[&>th]:px-6 xl:[&>th]:px-7.5">
                <TableHead className="min-w-[7rem] whitespace-nowrap">Application ID</TableHead>
                <TableHead className="min-w-40">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="min-w-40">Response In</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Passed Status</TableHead>
                <TableHead>Current Status </TableHead>
                <TableHead className="sticky right-0 z-20 w-[9.5rem] min-w-[9.5rem] bg-white shadow-[-6px_0_8px_-8px_rgba(0,0,0,0.35)] dark:bg-gray-dark">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedLeads.map((lead, index) => {
              const openUpward = index >= paginatedLeads.length - 2;
              return (
                <TableRow
                  key={lead.id}
                  className="border-none text-base font-medium [&>td]:px-4 md:[&>td]:px-6 xl:[&>td]:px-7.5"
                >
                <TableCell className="whitespace-nowrap font-mono text-sm font-semibold">
                  {lead.applicationId}
                </TableCell>
                <TableCell>
                  <figure className="flex items-center gap-4.5">
                    <Image
                      src={lead.avatar}
                      alt={lead.name}
                      width={44}
                      height={44}
                      className="rounded-full"
                    />
                    <figcaption className="truncate font-medium">
                      {lead.name}
                    </figcaption>
                  </figure>
                </TableCell>

                <TableCell>
                  <a className="hover:underline" href={`mailto:${lead.email}`}>
                    {lead.email}
                  </a>
                </TableCell>

                <TableCell>{lead.project}</TableCell>
                <TableCell>{lead.duration}</TableCell>

                
                <TableCell>
                  <span
                    className={cn(
                      "inline-block truncate rounded px-2.5 py-1 text-sm font-medium capitalize",
                      lead.passedStatus === "Approved by Dean" ||
                        lead.passedStatus === "Approved by IREB"
                        ? "bg-[#10B981]/[0.08] text-green"
                        : lead.passedStatus === "Rejected by Dean" ||
                            lead.passedStatus === "Rejected by IREB"
                        ? "bg-[#FB5454]/[0.08] text-red"
                        : "bg-amber-100 text-amber-700",
                    )}
                  >
                    {lead.passedStatus}
                  </span>
                </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-block truncate rounded px-2.5 py-1 text-sm font-medium capitalize",
                        lead.currentStatus === "Approved by Dean" ||
                          lead.currentStatus === "Approved by IREB"
                          ? "bg-[#10B981]/[0.08] text-green"
                          : lead.currentStatus === "Rejected by Dean" ||
                              lead.currentStatus === "Rejected by IREB"
                          ? "bg-[#FB5454]/[0.08] text-red"
                          : "bg-amber-100 text-amber-700",
                      )}
                    >
                      {lead.currentStatus}
                    </span>
                </TableCell>

                <TableCell
                  className={cn(
                    "sticky right-0 w-[9.5rem] min-w-[9.5rem] bg-white align-top shadow-[-6px_0_8px_-8px_rgba(0,0,0,0.35)] dark:bg-gray-dark",
                    actionMenuLeadId === lead.id ? "z-50 overflow-visible" : "z-10",
                  )}
                >
                  <Dropdown
                    isOpen={actionMenuLeadId === lead.id}
                    setIsOpen={(next) => {
                      const isCurrent = actionMenuLeadId === lead.id;
                      const resolved = typeof next === "function" ? next(isCurrent) : next;
                      setActionMenuLeadId(resolved ? lead.id : null);
                    }}
                  >
                    <DropdownTrigger className="w-full rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2">
                      Actions
                    </DropdownTrigger>
                    <DropdownContent
                      align="end"
                      className={cn(
                        "w-max min-w-[9.5rem] max-w-[16rem] overflow-hidden rounded-lg border border-stroke bg-white p-1 shadow-md dark:border-dark-3 dark:bg-dark-2",
                        openUpward ? "bottom-full mb-1" : "top-full mt-1",
                      )}
                    >
                      <div className="grid gap-1">
                        <DropdownClose>
                          <button
                            type="button"
                            onClick={() => router.push(`/admin/submissions/${lead.id}/profile`)}
                            className="w-full rounded-md px-3 py-1.5 text-left text-xs font-medium text-dark transition hover:bg-gray-1 dark:text-white dark:hover:bg-dark-3"
                          >
                            View
                          </button>
                        </DropdownClose>
                        <DropdownClose>
                          <button
                            type="button"
                            disabled={busyLeadId === lead.id}
                            onClick={() => void openAttachmentModal(lead)}
                            className="w-full rounded-md px-3 py-1.5 text-left text-xs font-medium text-primary transition hover:bg-primary/10 disabled:opacity-60"
                          >
                            Download
                          </button>
                        </DropdownClose>
                        {currentRole === "administrator" && (
                          <DropdownClose>
                            <button
                              type="button"
                              onClick={() => openAdminReportPicker(lead)}
                              className="w-full rounded-md px-3 py-1.5 text-left text-xs font-medium text-dark transition hover:bg-primary/10 dark:text-white dark:hover:bg-dark-3"
                            >
                              Get Reports
                            </button>
                          </DropdownClose>
                        )}
                        {lead.latestFeedbackComment && (
                          <DropdownClose>
                            <button
                              type="button"
                              onClick={() => setFeedbackModalLead(lead)}
                              className="w-full rounded-md px-3 py-1.5 text-left text-xs font-medium text-primary transition hover:bg-primary/10"
                            >
                              View Feedback
                            </button>
                          </DropdownClose>
                        )}
                        {lead.latestActionTrace && (
                          <DropdownClose>
                            <button
                              type="button"
                              onClick={() => setActionTraceModalLead(lead)}
                              className="w-full rounded-md px-3 py-1.5 text-left text-xs font-medium text-dark transition hover:bg-gray-1 dark:text-white dark:hover:bg-dark-3"
                            >
                              View Action Trace
                            </button>
                          </DropdownClose>
                        )}
                        {lead.stage !== "completed" && currentRole && (
                          <>
                            <DropdownClose>
                              <button
                                type="button"
                                disabled={busyLeadId === lead.id}
                                onClick={() => openDecisionModal(lead, "approved")}
                                className="w-full rounded-md px-3 py-1.5 text-left text-xs font-medium text-green transition hover:bg-green/10 disabled:opacity-60"
                              >
                                Approve
                              </button>
                            </DropdownClose>
                            <DropdownClose>
                              <button
                                type="button"
                                disabled={busyLeadId === lead.id}
                                onClick={() => openDecisionModal(lead, "rejected")}
                                className="w-full rounded-md px-3 py-1.5 text-left text-xs font-medium text-red transition hover:bg-red/10 disabled:opacity-60"
                              >
                                Reject
                              </button>
                            </DropdownClose>
                          </>
                        )}
                      </div>
                    </DropdownContent>
                  </Dropdown>
                </TableCell>
                </TableRow>
              );
              })}
              {visibleLeads.length === 0 && (
                <TableRow className="border-none">
                  <TableCell colSpan={8} className="text-center text-dark-5">
                    No approval requests found for this tab.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {visibleLeads.length > 0 && (
          <div className="flex items-center justify-between border-t border-stroke px-4 py-3 dark:border-dark-3 md:px-6 xl:px-7.5">
            <p className="text-sm text-body">
              Showing {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, visibleLeads.length)} of {visibleLeads.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-dark transition hover:bg-gray-1 disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Previous
              </button>
              <span className="text-sm text-body">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-dark transition hover:bg-gray-1 disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {attachmentModalLead && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-dark/60 px-4 py-6 backdrop-blur-[2px]">
          <div className="flex h-auto max-h-[min(58vh,480px)] w-full max-w-3xl flex-col overflow-hidden rounded-[12px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-stroke px-5 py-4 dark:border-dark-3">
              <div>
                <h3 className="text-heading-6 font-bold text-dark dark:text-white">
                  Application documents
                </h3>
                <p className="mt-1 text-sm text-body">
                  Application ID{" "}
                  <span className="font-mono font-semibold text-primary">
                    {attachmentModalLead.applicationId}
                  </span>{" "}
                  · {attachmentModalLead.name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAttachmentModal}
                className="rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-4 [scrollbar-gutter:stable]">
              {attachmentModalLoading && (
                <p className="text-sm text-body">Loading submission…</p>
              )}
              {attachmentModalError && (
                <p className="text-sm text-red-600 dark:text-red-400">{attachmentModalError}</p>
              )}
              {!attachmentModalLoading &&
                !attachmentModalError &&
                attachmentModalPayload != null &&
                typeof attachmentModalPayload === "object" && (
                <>
                  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <button
                      type="button"
                      onClick={downloadFullApplicationReport}
                      className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-opacity-90"
                    >
                      Download application report
                    </button>
                    <p className="text-body-sm max-w-xl text-body">
                      Opens as a clean, printable HTML document with every stepper section (scholar, supervisor,
                      thesis/project or publication details, ethics, institutional, declaration) plus attachment file
                      names. Use Print or &quot;Save as PDF&quot; from your browser if needed.
                    </p>
                  </div>

                  <h4 className="mb-3 text-sm font-semibold text-dark dark:text-white">
                    Required attachment slots
                  </h4>
                  <ul className="mb-8 grid gap-3">
                    {attachmentModalSlots.labels.length === 0 && (
                      <li className="rounded-lg border border-stroke px-4 py-3 text-sm text-body dark:border-dark-3">
                        No attachment checklist could be inferred for this submission. If the JSON download includes
                        attachment file names, they may use labels not listed in the template.
                      </li>
                    )}
                    {attachmentModalSlots.labels.map((label) => {
                      const slotInfo = attachmentModalSlots.files[label];
                      const fileName = slotInfo?.displayName ?? null;
                      const attached = Boolean(fileName);
                      const slotUrl =
                        attachmentModalLead && attached && fileName
                          ? `/api/submissions/${attachmentModalLead.id}/attachment?slot=${encodeURIComponent(label)}`
                          : null;
                      return (
                        <li
                          key={label}
                          className="rounded-lg border border-stroke px-4 py-3 dark:border-dark-3"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-dark dark:text-white">{label}</p>
                              {attached ? (
                                <p className="mt-1 truncate font-mono text-xs text-body" title={fileName ?? ""}>
                                  File: {fileName}
                                </p>
                              ) : (
                                <p className="mt-1 text-xs text-dark-5">No file name recorded for this slot.</p>
                              )}
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  "rounded-md px-2.5 py-1 text-xs font-semibold",
                                  attached
                                    ? "bg-green/15 text-green"
                                    : "bg-gray-2 text-dark-5 dark:bg-dark-2 dark:text-body",
                                )}
                              >
                                {attached ? "Attached" : "Not attached"}
                              </span>
                              {attached && fileName && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (slotUrl) {
                                        window.open(slotUrl, "_blank", "noopener,noreferrer");
                                        return;
                                      }
                                      setAttachmentViewTarget({
                                        label,
                                        fileName,
                                        hasStoredFile: false,
                                      });
                                    }}
                                    className="rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                                  >
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (slotUrl) {
                                        void downloadAttachmentFromApi(slotUrl, fileName, label);
                                        return;
                                      }
                                      downloadNameOnlyReference(label, fileName);
                                    }}
                                    className="rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
                                  >
                                    Download
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {attachmentModalSlots.extras.length > 0 && (
                    <>
                      <h4 className="mb-3 text-sm font-semibold text-dark dark:text-white">
                        Additional documents
                      </h4>
                      <ul className="grid gap-3">
                        {attachmentModalSlots.extras.map((extra) => {
                          const extraUrl = attachmentModalLead
                            ? `/api/submissions/${attachmentModalLead.id}/attachment?extra=${extra.index}`
                            : null;
                          return (
                          <li
                            key={`extra-${extra.index}-${extra.displayName}`}
                            className="rounded-lg border border-stroke px-4 py-3 dark:border-dark-3"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-dark dark:text-white">
                                  Additional upload {extra.index + 1}
                                </p>
                                <p className="mt-1 truncate font-mono text-xs text-body" title={extra.displayName}>
                                  {extra.displayName}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-green/15 px-2.5 py-1 text-xs font-semibold text-green">
                                  Attached
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (extraUrl) {
                                      window.open(extraUrl, "_blank", "noopener,noreferrer");
                                      return;
                                    }
                                    setAttachmentViewTarget({
                                      label: `Additional upload ${extra.index + 1}`,
                                      fileName: extra.displayName,
                                      hasStoredFile: false,
                                    });
                                  }}
                                  className="rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (extraUrl) {
                                      void downloadAttachmentFromApi(
                                        extraUrl,
                                        extra.displayName,
                                        `Additional upload ${extra.index + 1}`,
                                      );
                                      return;
                                    }
                                    downloadNameOnlyReference(
                                      `Additional upload ${extra.index + 1}`,
                                      extra.displayName,
                                    );
                                  }}
                                  className="rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
                                >
                                  Download
                                </button>
                              </div>
                            </div>
                          </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {attachmentViewTarget && attachmentModalLead && (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-dark/60 px-4 py-6 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-[12px] border border-stroke bg-white p-6 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
            <h4 className="text-lg font-bold text-dark dark:text-white">{attachmentViewTarget.label}</h4>
            <p className="mt-3 break-all font-mono text-sm text-dark dark:text-white">
              {attachmentViewTarget.fileName}
            </p>
            <p className="mt-4 text-sm text-body">
              {attachmentViewTarget.hasStoredFile && attachmentViewTarget.downloadUrl
                ? "This file is stored on the server. Use Open to view it in a new tab, or Download to save a copy."
                : "For this slot only the file name was recorded (legacy submission). Download saves a short text summary; contact the applicant for the actual file."}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setAttachmentViewTarget(null)}
                className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Close
              </button>
              {attachmentViewTarget.hasStoredFile && attachmentViewTarget.downloadUrl ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      window.open(attachmentViewTarget.downloadUrl, "_blank", "noopener,noreferrer");
                    }}
                    className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                  >
                    Open file
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void downloadAttachmentFromApi(
                        attachmentViewTarget.downloadUrl!,
                        attachmentViewTarget.fileName,
                        attachmentViewTarget.label,
                      );
                    }}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
                  >
                    Download file
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    downloadNameOnlyReference(attachmentViewTarget.label, attachmentViewTarget.fileName);
                  }}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
                >
                  Download summary
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {decisionLead && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-dark/60 px-4 py-6 backdrop-blur-[2px]">
          <div className="w-full max-w-2xl rounded-[12px] border border-stroke bg-white p-6 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-heading-6 font-bold text-dark dark:text-white">
                  {decisionAction === "approved" ? "Approve Request" : "Reject Request"}
                </h3>
                <p className="mt-1 text-sm text-body">
                  Application ID {decisionLead.applicationId} · {decisionLead.name} ·{" "}
                  {decisionLead.faculty}
                </p>
              </div>
              <button
                type="button"
                onClick={resetDecisionModal}
                className="rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Close
              </button>
            </div>

            {currentRole === "administrator" && (
              <div className="mt-5 grid gap-4">
                {decisionLead.stage === "dean" && (
                  <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                    <p className="text-sm font-semibold text-dark dark:text-white">On behalf of dean</p>
                    <select
                      value={selectedOnBehalfOf}
                      onChange={(e) => setSelectedOnBehalfOf(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
                    >
                      <option value="">Select dean</option>
                      {adminOptions.deanOption && (
                        <option value={adminOptions.deanOption.id}>
                          {adminOptions.deanOption.name}
                        </option>
                      )}
                    </select>
                  </div>
                )}

                {decisionLead.stage === "ireb" && (
                  <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                    <p className="text-sm font-semibold text-dark dark:text-white">On behalf of IREB member</p>
                    <select
                      value={selectedOnBehalfOf}
                      onChange={(e) => setSelectedOnBehalfOf(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
                    >
                      <option value="">Select IREB member</option>
                      {adminOptions.irebOptions.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-dark dark:text-white">
                {decisionAction === "rejected" ? "Rejection Comment" : "Comment (optional)"}
              </label>
              <textarea
                value={decisionComment}
                onChange={(e) => setDecisionComment(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
                placeholder={
                  decisionAction === "rejected"
                    ? "Provide reason for rejection"
                    : "Optional note"
                }
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={resetDecisionModal}
                className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyLeadId === decisionLead.id}
                onClick={() => void handleDecisionSubmit()}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60",
                  decisionAction === "approved" ? "bg-green hover:bg-green/90" : "bg-red hover:bg-red/90",
                )}
              >
                {decisionAction === "approved" ? "Confirm Approval" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedbackModalLead && (
        <div className="fixed inset-0 z-[99997] flex items-center justify-center bg-dark/60 px-4 py-6 backdrop-blur-[2px]">
          <div className="w-full max-w-2xl rounded-[12px] border border-stroke bg-white p-6 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-heading-6 font-bold text-dark dark:text-white">Application Feedback</h3>
                <p className="mt-1 text-sm text-body">
                  Application ID {feedbackModalLead.applicationId} · {feedbackModalLead.name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeFeedbackModal}
                className="rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-stroke bg-gray-1/40 p-4 dark:border-dark-3 dark:bg-dark-2/40">
              <p className="whitespace-pre-wrap text-sm text-dark dark:text-white">
                {feedbackModalLead.latestFeedbackComment}
              </p>
            </div>

          </div>
        </div>
      )}

      {actionTraceModalLead && (
        <div className="fixed inset-0 z-[99997] flex items-center justify-center bg-dark/60 px-4 py-6 backdrop-blur-[2px]">
          <div className="w-full max-w-2xl rounded-[12px] border border-stroke bg-white p-6 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-heading-6 font-bold text-dark dark:text-white">Action Trace</h3>
                <p className="mt-1 text-sm text-body">
                  Application ID {actionTraceModalLead.applicationId} · {actionTraceModalLead.name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeActionTraceModal}
                className="rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="whitespace-pre-wrap text-sm text-dark dark:text-white">
                {actionTraceModalLead.latestActionTrace}
              </p>
            </div>
          </div>
        </div>
      )}

      {portalMounted &&
        adminReports?.phase === "pick" &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-dark/60 px-4 py-6 backdrop-blur-[2px]">
            <div className="w-full max-w-lg rounded-[12px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
              <div className="flex items-start justify-between gap-4 border-b border-stroke px-6 py-5 dark:border-dark-3">
                <div>
                  <h3 className="text-xl font-bold text-dark dark:text-white">Get Reports</h3>
                  <p className="mt-1 text-sm text-body">
                    Application ID{" "}
                    <span className="font-mono font-semibold text-primary">{adminReports.lead.applicationId}</span>
                    {" · "}
                    {adminReports.lead.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAdminReports}
                  className="shrink-0 rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                >
                  Close
                </button>
              </div>
              <div className="grid gap-2 px-4 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => selectAdminReportKind("student")}
                  className="flex w-full flex-col items-start gap-1 rounded-lg border border-stroke bg-white px-4 py-3.5 text-left transition hover:border-primary/40 hover:bg-primary/[0.06] dark:border-dark-3 dark:bg-gray-dark dark:hover:bg-dark-2"
                >
                  <span className="text-sm font-semibold text-dark dark:text-white">
                    Student Level Analysis Report (Individual)
                  </span>
                  <span className="text-xs leading-snug text-body">
                    Profile, timeline, status comparison, and recorded feedback for this application.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => selectAdminReportKind("status")}
                  className="flex w-full flex-col items-start gap-1 rounded-lg border border-stroke bg-white px-4 py-3.5 text-left transition hover:border-primary/40 hover:bg-primary/[0.06] dark:border-dark-3 dark:bg-gray-dark dark:hover:bg-dark-2"
                >
                  <span className="text-sm font-semibold text-dark dark:text-white">
                    Report of Application Status
                  </span>
                  <span className="text-xs leading-snug text-body">
                    Same layout as the PDF: workflow fields for this application (submission record when available).
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {portalMounted &&
        adminReports?.phase === "preview" &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-dark/60 px-3 py-6 backdrop-blur-[2px] sm:px-4">
            <div className="flex max-h-[95vh] min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-[12px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
              <div className="flex shrink-0 flex-col gap-3 border-b border-stroke px-4 py-4 dark:border-dark-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold text-dark dark:text-white">
                    {adminReports.kind === "student"
                      ? "Student Level Analysis Report (Individual)"
                      : "Report of Application Status"}
                  </h3>
                  <p className="mt-0.5 text-sm text-body">
                    {adminReports.kind === "student" ? (
                      <>
                        Application ID{" "}
                        <span className="font-mono font-semibold text-primary">{adminReports.lead.applicationId}</span>
                        {" · "}
                        {adminReports.lead.name}
                      </>
                    ) : (
                      <>
                        Application ID{" "}
                        <span className="font-mono font-semibold text-primary">{adminReports.lead.applicationId}</span>
                        {" · "}
                        {adminReports.lead.name}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminReports({ phase: "pick", lead: adminReports.lead })}
                    className="rounded-md border border-stroke px-3 py-2 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={closeAdminReports}
                    className="rounded-md border border-stroke px-3 py-2 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={adminReportPdfExporting || adminReportSubmissionLoading || !adminReportPreviewHtml}
                    onClick={() => void downloadActiveAdminReport()}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-opacity-90 disabled:opacity-60"
                  >
                    {adminReportPdfExporting ? "Saving PDF…" : "Download PDF"}
                  </button>
                </div>
              </div>
              <p className="shrink-0 border-b border-stroke bg-gray-1/50 px-4 py-2 text-xs text-body dark:border-dark-3 dark:bg-dark-2/50 sm:px-6">
                Use <span className="font-medium text-dark dark:text-white">Download PDF</span> for a{" "}
                <span className="font-medium text-dark dark:text-white">.pdf</span> file, or{" "}
                <span className="font-medium text-dark dark:text-white">Print / Save as PDF</span> inside the preview.
              </p>
              <div className="relative min-h-0 flex-1 bg-gray-1 p-3 dark:bg-dark-2/40 sm:p-4">
                {adminReportSubmissionLoading && (
                  <div className="absolute inset-3 z-10 flex items-center justify-center rounded-lg border border-stroke bg-white/90 text-sm font-medium text-body backdrop-blur-sm dark:border-dark-3 dark:bg-gray-dark/90">
                    Loading submission for report…
                  </div>
                )}
                <iframe
                  ref={reportPreviewIframeRef}
                  title="Report preview"
                  className="block h-[min(72vh,720px)] min-h-[380px] w-full rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3"
                  srcDoc={adminReportPreviewHtml}
                  sandbox="allow-scripts allow-same-origin allow-modals"
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
