"use client";

import {
  inferFormIdFromLegacyRequiredForm,
  type ApprovalFormId,
} from "@/app/profile/_components/forms/form-registry";
import { resolveAttachmentSlotLabels } from "@/app/profile/_components/forms/attachment-lists-by-form";
import { describeEthicsAttachmentValue } from "@/lib/ethics-attachment-meta";
import {
  buildApplicationStatusReportHtml,
  buildFacultyIndividualReportHtml,
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
import { TableTopScrollArea } from "@/components/ui/table-top-scroll-area";
import {
  ColumnHeaderFilter,
  type FilterOption,
} from "@/components/ui/column-header-filter";
import {
  defaultLeadsExcelColumnSelection,
  downloadLeadsReportExcel,
  LEADS_EXCEL_COLUMNS,
} from "@/lib/leads-report-excel-export";
import { cn } from "@/lib/utils";
import { isLeadOverdueForRole } from "@/lib/lead-overdue";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "./empty-state";
import { LeadTableAvatar } from "./lead-table-avatar";
import { ActionTraceModal } from "./modals/action-trace-modal";
import {
  AdminReportPreview,
  AdminReportsPicker,
} from "./modals/admin-reports-modal";
import { ApplicantProfileModal } from "./modals/applicant-profile-modal";
import { AttachmentModal } from "./modals/attachment-modal";
import { AttachmentViewModal } from "./modals/attachment-view-modal";
import { AdminReleaseModal, type AdminReleaseAction } from "./modals/admin-release-modal";
import { DecisionModal } from "./modals/decision-modal";
import { ExportModal } from "./modals/export-modal";
import { FeedbackModal } from "./modals/feedback-modal";
import {
  COLUMN_DEF_MAP,
  ColumnManagerButton,
  useColumnLayout,
  type ColumnId,
} from "./column-manager";
import { RowActions } from "./row-actions";
import {
  AdminActionBadge,
  ApplicationIdBadge,
  ApplicationTypeBadge,
  StatusBadge,
  SensitiveBadge,
} from "./status-badges";
import { TablePagination } from "./table-pagination";
import { TableToolbar } from "./table-toolbar";
import type {
  AdminOption,
  CountEntry,
  DecisionAction,
  Lead,
  LeadsTab,
  LeadStatus,
  SlotFileInfo,
} from "./types";

export type { Lead, LeadStatus } from "./types";

const STATUS_ORDER: LeadStatus[] = [
  "Submitted",
  "Under Review by HOD",
  "Approved by HOD",
  "Rejected by HOD",
  "Under Review by IREB",
  "Approved by IREB",
  "Rejected by IREB",
];

function buildCountsList<T>(
  items: readonly T[],
  pick: (item: T) => string,
): CountEntry[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = pick(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort(
      (a, b) => b.count - a.count || a.value.localeCompare(b.value),
    );
}

const mockDaysAgoIso = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString();

const LEADS: Lead[] = [
  {
    id: 1,
    applicationId: "482913",
    name: "Ayesha Khan",
    email: "ayesha.khan@uol.edu.pk",
    applicationType: "Thesis",
    researchTitle: "AI Ethics in Healthcare Decision Support",
    faculty: "Faculty of Information Technology",
    department: "Computer Science",
    project: "12 Jan 2026 - 18 Jan 2026",
    duration: "6 days",
    currentStatus: "Rejected by HOD",
    stage: "completed",
    submittedAt: mockDaysAgoIso(6),
    hodDecisionAt: mockDaysAgoIso(4),
    avatar: "/images/user/user-17.png",
  },
  {
    id: 2,
    applicationId: "571204",
    name: "Muhammad Ali",
    email: "m.ali@uol.edu.pk",
    applicationType: "Research",
    researchTitle: "Clinical Trial Protocol for Novel Antibiotic",
    faculty: "Faculty of Medical Sciences",
    department: "Medicine",
    project: "03 Feb 2026 - 4 Feb 2026",
    duration: "4 days",
    currentStatus: "Under Review by IREB",
    stage: "ireb",
    submittedAt: mockDaysAgoIso(10),
    hodDecisionAt: mockDaysAgoIso(4),
    avatar: "/images/user/user-15.png",
  },
  {
    id: 3,
    applicationId: "639847",
    name: "Fatima Noor",
    email: "fatima.noor@uol.edu.pk",
    applicationType: "Thesis",
    researchTitle: "Secure Software Architecture for Campus Systems",
    faculty: "Faculty of Information Technology",
    department: "Software Engineering",
    project: "20 Mar 2026 - 27 Mar 2026",
    duration: "7 days",
    currentStatus: "Approved by IREB",
    stage: "completed",
    submittedAt: mockDaysAgoIso(14),
    hodDecisionAt: mockDaysAgoIso(10),
    avatar: "/images/user/user-19.png",
  },
  {
    id: 4,
    applicationId: "204815",
    name: "Hassan Raza",
    email: "hassan.raza@uol.edu.pk",
    applicationType: "Thesis",
    researchTitle: "Pharmacovigilance in Community Pharmacies",
    faculty: "Faculty of Pharmacy",
    department: "Pharmacy",
    project: "01 Apr 2026 - 04 Apr 2026",
    duration: "4 days",
    currentStatus: "Under Review by HOD",
    stage: "hod",
    submittedAt: mockDaysAgoIso(4),
    hodDecisionAt: null,
    avatar: "/images/user/user-14.png",
  },
  {
    id: 5,
    applicationId: "918376",
    name: "Zainab Ahmed",
    email: "zainab.ahmed@uol.edu.pk",
    applicationType: "Research",
    researchTitle: "Machine Learning for Early Disease Detection",
    faculty: "Faculty of Information Technology",
    department: "Computer Science",
    project: "15 May 2026 - 25 May 2026",
    duration: "10 days",
    currentStatus: "Rejected by IREB",
    stage: "completed",
    submittedAt: mockDaysAgoIso(12),
    hodDecisionAt: mockDaysAgoIso(8),
    avatar: "/images/user/user-21.png",
  },
];

type PropsType = {
  className?: string;
  hodOnly?: boolean;
  ethicalOnly?: boolean;
  title?: string;
  leads?: Lead[];
  currentRole?: "administrator" | "hod" | "ireb" | null;
};

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

function isStudentApplicantEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@student.uol.edu.pk");
}

function leadToReportRow(lead: Lead): LeadReportRow {
  return {
    applicationId: lead.applicationId,
    name: lead.name,
    email: lead.email,
    faculty: lead.faculty,
    project: lead.project,
    duration: lead.duration,
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
        "form6-publication-faculty-non-medical",
        "form7-publication-faculty-staff-medical",
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
  hodOnly = false,
  ethicalOnly = false,
  title = "Leads Report",
  leads: providedLeads,
  currentRole = null,
}: PropsType) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LeadsTab>("pending");
  const [busyLeadId, setBusyLeadId] = useState<number | null>(null);
  const [actionMenuLeadId, setActionMenuLeadId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [decisionLead, setDecisionLead] = useState<Lead | null>(null);
  const [decisionAction, setDecisionAction] = useState<DecisionAction>("approved");
  const [decisionComment, setDecisionComment] = useState("");
  const [selectedRejectionReasons, setSelectedRejectionReasons] = useState<string[]>([]);
  const [adminReleaseLead, setAdminReleaseLead] = useState<Lead | null>(null);
  const [adminReleaseAction, setAdminReleaseAction] = useState<AdminReleaseAction | null>(null);
  const [adminReleaseComment, setAdminReleaseComment] = useState("");
  const [adminReleaseIrebUserId, setAdminReleaseIrebUserId] = useState("");
  const [adminOptions, setAdminOptions] = useState<{
    hodOption: AdminOption | null;
    irebOptions: AdminOption[];
  }>({ hodOption: null, irebOptions: [] });
  const [selectedOnBehalfOf, setSelectedOnBehalfOf] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [currentStatusFilter, setCurrentStatusFilter] = useState<LeadStatus[]>([]);
  const [applicationTypeFilter, setApplicationTypeFilter] = useState<string[]>([]);
  const [irebMemberFilter, setIrebMemberFilter] = useState<string[]>([]);
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
  const [profileModalLead, setProfileModalLead] = useState<Lead | null>(null);
  const [adminReports, setAdminReports] = useState<
    | null
    | { phase: "pick"; lead: Lead }
    | { phase: "preview"; kind: "student" | "status" | "faculty"; lead: Lead }
  >(null);
  const [adminReportSubmission, setAdminReportSubmission] = useState<AdminReportSubmission | null>(null);
  const [adminReportSubmissionLoading, setAdminReportSubmissionLoading] = useState(false);
  const [adminReportPdfExporting, setAdminReportPdfExporting] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportColState, setExportColState] = useState<Record<string, boolean>>(() =>
    defaultLeadsExcelColumnSelection(),
  );
  const columnLayout = useColumnLayout();
  const { visibleColumns, widthOf, pinnedLeftOffset, api: columnApi } = columnLayout;
  const resizeSession = useRef<{ id: ColumnId; startX: number; startWidth: number } | null>(null);

  const startColumnResize = (e: React.PointerEvent, id: ColumnId) => {
    e.preventDefault();
    e.stopPropagation();
    resizeSession.current = { id, startX: e.clientX, startWidth: widthOf(id) };
    const onMove = (ev: PointerEvent) => {
      const s = resizeSession.current;
      if (s) columnApi.setWidth(s.id, s.startWidth + (ev.clientX - s.startX));
    };
    const onUp = () => {
      resizeSession.current = null;
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const [overdueBannerDismissed, setOverdueBannerDismissed] = useState(false);

  const sourceLeads = providedLeads ?? LEADS;
  const scopeFilteredLeads = useMemo(() => {
    if (providedLeads) return sourceLeads;
    if (hodOnly) return sourceLeads.filter(({ stage }) => stage === "hod");
    if (ethicalOnly) return sourceLeads.filter(({ stage }) => stage === "ireb");
    return sourceLeads;
  }, [providedLeads, hodOnly, ethicalOnly, sourceLeads]);

  const leads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopeFilteredLeads.filter((lead) => {
      if (
        departmentFilter.length > 0 &&
        !departmentFilter.includes(lead.department)
      )
        return false;
      if (
        currentStatusFilter.length > 0 &&
        !currentStatusFilter.includes(lead.currentStatus)
      )
        return false;
      if (
        applicationTypeFilter.length > 0 &&
        !applicationTypeFilter.includes(lead.applicationType)
      )
        return false;
      if (
        irebMemberFilter.length > 0 &&
        (!lead.assignedIrebName || !irebMemberFilter.includes(lead.assignedIrebName))
      )
        return false;
      if (!q) return true;
      const app = lead.applicationId.toLowerCase();
      return (
        app.includes(q) ||
        lead.name.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.applicationType.toLowerCase().includes(q) ||
        lead.researchTitle.toLowerCase().includes(q) ||
        lead.faculty.toLowerCase().includes(q) ||
        lead.department.toLowerCase().includes(q)
      );
    });
  }, [
    scopeFilteredLeads,
    searchQuery,
    departmentFilter,
    currentStatusFilter,
    applicationTypeFilter,
    irebMemberFilter,
  ]);

  // Live counts (entity + count) â€” derived from the scope (e.g. hod-only,
  // ireb-only, or all). Always shows the maximum possible count regardless of
  // which other filter chips are active.
  const departmentCounts = useMemo(
    () =>
      buildCountsList(
        scopeFilteredLeads,
        (lead) => lead.department || "Unknown",
      ),
    [scopeFilteredLeads],
  );
  const currentStatusCounts = useMemo(
    () =>
      buildCountsList(scopeFilteredLeads, (lead) => lead.currentStatus).sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.value as LeadStatus) -
          STATUS_ORDER.indexOf(b.value as LeadStatus),
      ),
    [scopeFilteredLeads],
  );

  const applicationTypeCounts = useMemo(
    () =>
      buildCountsList(scopeFilteredLeads, (lead) => lead.applicationType || "Unknown"),
    [scopeFilteredLeads],
  );

  // IREB members that currently have recommended submissions in scope —
  // used for the administrator-only "IREB Member" filter.
  const irebMemberCounts = useMemo(
    () =>
      buildCountsList(
        scopeFilteredLeads.filter((lead) => lead.assignedIrebName),
        (lead) => lead.assignedIrebName as string,
      ),
    [scopeFilteredLeads],
  );

  // Build FilterOption arrays for ColumnHeaderFilter components
  const statusFilterOptions: FilterOption[] = useMemo(
    () =>
      currentStatusCounts.map((entry) => ({
        value: entry.value,
        label: entry.value,
        count: entry.count,
      })),
    [currentStatusCounts],
  );

  const applicationTypeFilterOptions: FilterOption[] = useMemo(
    () =>
      applicationTypeCounts.map((entry) => ({
        value: entry.value,
        label: entry.value,
        count: entry.count,
      })),
    [applicationTypeCounts],
  );

  const clearAllFilters = useCallback(() => {
    setDepartmentFilter([]);
    setCurrentStatusFilter([]);
    setApplicationTypeFilter([]);
    setIrebMemberFilter([]);
  }, []);

  useEffect(() => {
    const validDepartments = new Set(departmentCounts.map((entry) => entry.value));
    setDepartmentFilter((current) => {
      const next = current.filter((value) => validDepartments.has(value));
      return next.length === current.length ? current : next;
    });
  }, [departmentCounts]);

  // Reset filters when the source data scope changes.
  useEffect(() => {
    clearAllFilters();
  }, [hodOnly, ethicalOnly, providedLeads, clearAllFilters]);

  const overdueLeads = useMemo(
    () =>
      leads.filter((lead) =>
        isLeadOverdueForRole(lead, currentRole, { hodOnly, ethicalOnly }),
      ),
    [leads, currentRole, hodOnly, ethicalOnly],
  );

  useEffect(() => {
    setOverdueBannerDismissed(false);
  }, [overdueLeads.length]);

  const approvedLeads = useMemo(
    () =>
      currentRole === "hod"
        ? leads.filter((lead) => lead.stage === "ireb" || lead.stage === "completed")
        : leads.filter((lead) => lead.currentStatus === "Approved by IREB"),
    [leads, currentRole],
  );

  const pendingLeads = useMemo(
    () =>
      currentRole === "hod"
        ? leads.filter((lead) => lead.stage === "hod")
        : currentRole === "ireb"
          ? leads.filter((lead) => lead.stage === "ireb")
          : leads.filter(
              (lead) =>
                lead.stage === "hod" ||
                lead.stage === "admin" ||
                lead.stage === "ireb",
            ),
    [leads, currentRole],
  );

  const rejectedLeads = useMemo(
    () =>
      currentRole === "hod"
        ? leads.filter((lead) => lead.currentStatus === "Rejected by HOD" || lead.currentStatus === "Rejected by IREB")
        : leads.filter((lead) => lead.currentStatus === "Rejected by IREB"),
    [leads, currentRole],
  );

  const showApprovedTab = currentRole !== null;
  const showAdminActionTab = currentRole === "administrator";

  // Submissions at the admin review stage — the administrator must act on
  // these (recommend to an IREB member, mark as sensitive, or decide
  // directly). They display as "Under Review by IREB" to applicants, so this
  // tab gives the administrator a dedicated work queue.
  const adminActionLeads = useMemo(
    () => leads.filter((lead) => lead.stage === "admin"),
    [leads],
  );

  const visibleLeads =
    activeTab === "overdue"
      ? overdueLeads
      : activeTab === "approved"
        ? approvedLeads
        : activeTab === "adminAction"
          ? adminActionLeads
          : activeTab === "pending"
            ? pendingLeads
            : activeTab === "rejected"
              ? rejectedLeads
              : leads;
  const totalPages = Math.max(1, Math.ceil(visibleLeads.length / pageSize));
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleLeads.slice(start, start + pageSize);
  }, [visibleLeads, currentPage]);

  const openExportModal = useCallback(() => {
    setExportColState(defaultLeadsExcelColumnSelection());
    setExportModalOpen(true);
  }, []);

  const runLeadsExcelExport = useCallback(() => {
    const selected = LEADS_EXCEL_COLUMNS.filter((c) => exportColState[c.id]).map((c) => c.id);
    if (selected.length === 0) {
      toast.error("Select at least one column to export.");
      return;
    }
    if (visibleLeads.length === 0) {
      toast.error("Nothing to export for the current view.");
      return;
    }
    try {
      downloadLeadsReportExcel(visibleLeads, selected, {
        reportTitle: title,
        generatedAt: new Date(),
        activeTab,
        searchQuery,
        facultyFilter: [],
        departmentFilter,
        currentStatusFilter,
        hodOnly,
        ethicalOnly,
        scopeDatasetSize: scopeFilteredLeads.length,
      });
      toast.success("Excel file downloaded.");
      setExportModalOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Export failed.";
      toast.error(message);
    }
  }, [
    activeTab,
    currentStatusFilter,
    hodOnly,
    departmentFilter,
    ethicalOnly,
    exportColState,
    scopeFilteredLeads.length,
    searchQuery,
    title,
    visibleLeads,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeTab,
    searchQuery,
    hodOnly,
    ethicalOnly,
    providedLeads,
    departmentFilter,
    currentStatusFilter,
    applicationTypeFilter,
    irebMemberFilter,
  ]);

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
    // The admin review stage is handled by the administrator directly — no
    // "on behalf of" options are needed.
    if (decisionLead.stage === "admin") return;
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/submissions/${decisionLead.id}/action-options`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          ok: boolean;
          hodOption?: AdminOption | null;
          irebOptions?: AdminOption[];
        };
        if (!response.ok || !payload.ok || cancelled) return;
        setAdminOptions({
          hodOption: payload.hodOption ?? null,
          irebOptions: payload.irebOptions ?? [],
        });
        if (decisionLead.stage === "hod" && payload.hodOption?.id) {
          setSelectedOnBehalfOf(payload.hodOption.id);
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
    setSelectedRejectionReasons([]);
    setSelectedOnBehalfOf("");
    setAdminOptions({ hodOption: null, irebOptions: [] });
  };

  const openDecisionModal = (lead: Lead, action: DecisionAction) => {
    setActionError(null);
    setDecisionAction(action);
    setDecisionComment("");
    setSelectedRejectionReasons([]);
    setSelectedOnBehalfOf("");
    setAdminOptions({ hodOption: null, irebOptions: [] });
    setDecisionLead(lead);
  };

  const resetAdminReleaseModal = () => {
    setAdminReleaseLead(null);
    setAdminReleaseAction(null);
    setAdminReleaseComment("");
    setAdminReleaseIrebUserId("");
  };

  const openAdminReleaseModal = (lead: Lead, action: AdminReleaseAction) => {
    setActionError(null);
    setAdminReleaseAction(action);
    setAdminReleaseComment("");
    setAdminReleaseIrebUserId("");
    setAdminReleaseLead(lead);
  };

  const handleAdminReleaseSubmit = async () => {
    if (!adminReleaseLead || !adminReleaseAction) return;
    if (adminReleaseAction === "recommend" && !adminReleaseIrebUserId) {
      setActionError("Please select an IREB member to recommend to.");
      return;
    }
    setBusyLeadId(adminReleaseLead.id);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/submissions/${adminReleaseLead.id}/admin-review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: adminReleaseAction,
            comment: adminReleaseComment,
            irebUserId: adminReleaseAction === "recommend" ? adminReleaseIrebUserId : undefined,
          }),
        },
      );
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        const message = payload.error ?? "Unable to save action.";
        setActionError(message);
        toast.error(message);
        return;
      }
      toast.success(
        adminReleaseAction === "mark_sensitive"
          ? `Application ${adminReleaseLead.applicationId} marked as sensitive.`
          : `Application ${adminReleaseLead.applicationId} recommended for IREB review.`,
      );
      resetAdminReleaseModal();
      router.refresh();
    } catch {
      const message = "Network error while saving action.";
      setActionError(message);
      toast.error(message);
    } finally {
      setBusyLeadId(null);
    }
  };

  const toggleRejectionReason = (reasonId: string) => {
    setSelectedRejectionReasons((prev) =>
      prev.includes(reasonId) ? prev.filter((id) => id !== reasonId) : [...prev, reasonId],
    );
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

  const closeProfileModal = () => {
    setProfileModalLead(null);
  };

  const closeAdminReports = () => {
    setAdminReports(null);
    setAdminReportSubmission(null);
    setAdminReportSubmissionLoading(false);
  };

  const openAdminReportPicker = (lead: Lead) => {
    setActionMenuLeadId(null);
    if (isStudentApplicantEmail(lead.email)) {
      setAdminReports({ phase: "pick", lead });
    } else {
      setAdminReports({ phase: "preview", kind: "faculty", lead });
    }
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
    if (adminReports.kind === "faculty") {
      return buildFacultyIndividualReportHtml(row, adminReportSubmission, now);
    }
    return buildApplicationStatusReportHtml(row, adminReportSubmission, now);
  }, [adminReports, adminReportSubmission, adminReportSubmissionLoading]);

  const reportDownloadRef = useRef<{
    html: string;
    kind: "student" | "status" | "faculty";
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
          : d.kind === "faculty"
            ? `faculty-report-${d.applicationId}-${stamp}`
            : `application-status-${d.applicationId}-${stamp}`;
      const { downloadReportPdf } = await import("@/lib/download-admin-report-pdf");
      await downloadReportPdf(base, {
        previewIframe: reportPreviewIframeRef.current,
        html: d.html,
      });
      toast.success("Report downloaded.");
    } catch {
      const message =
        "Could not generate the PDF. Use Print â†’ Save as PDF from the preview, or try again.";
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

  const downloadNameOnlyReference = (slotLabel: string, fileName: string) => {
    if (!attachmentModalLead) return;
    const safe = fileName.replace(/[^\w.\-()+ ]/g, "_").slice(0, 120) || "file";
    const body = [
      `Application ID: ${attachmentModalLead.applicationId}`,
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
    // At the admin review stage the administrator (IREB chairman) acts as
    // themselves — no "on behalf of" selection is required.
    const isAdminStage = decisionLead.stage === "admin";
    if (currentRole === "administrator" && decisionLead.stage === "hod" && !selectedOnBehalfOf) {
      const message = "Please select the assigned HOD for this action.";
      setActionError(message);
      toast.error(message);
      return;
    }
    if (decisionAction === "rejected") {
      if (selectedRejectionReasons.length === 0) {
        const message = "Select at least one rejection reason.";
        setActionError(message);
        toast.error(message);
        return;
      }
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
          ...(decisionAction === "rejected"
            ? { rejectionReasonCodes: selectedRejectionReasons }
            : {}),
          onBehalfOfAdminId:
            currentRole === "administrator" && !isAdminStage ? selectedOnBehalfOf : undefined,
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

  // ─── Column management: header/cell renderers keyed by column id ───

  const resizeHandleFor = (id: ColumnId) => (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${COLUMN_DEF_MAP.get(id)?.label ?? "column"} column`}
      title="Drag to resize"
      onPointerDown={(e) => startColumnResize(e, id)}
      onClick={(e) => e.stopPropagation()}
      className="absolute inset-y-0 right-0 z-10 w-2 cursor-col-resize touch-none after:absolute after:inset-y-2 after:right-0 after:w-0.5 after:rounded-full after:bg-indigo-300/70 after:transition-all hover:after:bg-indigo-500 hover:after:w-1 dark:after:bg-indigo-600/70 dark:hover:after:bg-indigo-400"
    />
  );

  const headerCellFor = (id: ColumnId): React.ReactNode => {
    const def = COLUMN_DEF_MAP.get(id)!;
    const left = pinnedLeftOffset(id);
    const pinnedCls =
      left !== null
        ? "sticky z-20 bg-indigo-50/95 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.10)] backdrop-blur-sm dark:bg-indigo-950/90"
        : "";
    const style = left !== null ? { left } : undefined;
    const headCls =
      "relative overflow-hidden whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300";

    switch (id) {
      case "currentStatus":
        return (
          <ColumnHeaderFilter
            key={id}
            label="Current Status"
            options={statusFilterOptions}
            selected={currentStatusFilter as string[]}
            onChange={(vals) => setCurrentStatusFilter(vals as LeadStatus[])}
            searchPlaceholder="Search statuses…"
            className={cn("relative overflow-hidden", pinnedCls)}
            style={style}
          >
            {resizeHandleFor(id)}
          </ColumnHeaderFilter>
        );
      case "applicationType":
        return (
          <ColumnHeaderFilter
            key={id}
            label="Application Type"
            options={applicationTypeFilterOptions}
            selected={applicationTypeFilter}
            onChange={setApplicationTypeFilter}
            searchPlaceholder="Search types…"
            className={cn("relative overflow-hidden", pinnedCls)}
            style={style}
          >
            {resizeHandleFor(id)}
          </ColumnHeaderFilter>
        );
      case "actions":
        return (
          <TableHead
            key={id}
            className="sticky right-0 z-20 bg-indigo-50/80 shadow-md backdrop-blur-sm dark:bg-indigo-950/40"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Actions
            </span>
          </TableHead>
        );
      default:
        return (
          <TableHead key={id} className={cn(headCls, pinnedCls)} style={style}>
            {def.label}
            {resizeHandleFor(id)}
          </TableHead>
        );
    }
  };

  const bodyCellFor = (
    id: ColumnId,
    lead: Lead,
    index: number,
    openUpward: boolean,
    canDecide: boolean,
  ): React.ReactNode => {
    const left = pinnedLeftOffset(id);
    const pinnedCls =
      left !== null
        ? cn(
            "sticky z-10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.10)]",
            index % 2 === 1
              ? "bg-gray-50 dark:bg-gray-800"
              : "bg-white dark:bg-gray-800",
          )
        : "";
    const style = left !== null ? { left } : undefined;

    switch (id) {
      case "applicationId":
        return (
          <TableCell key={id} className={cn("whitespace-nowrap", pinnedCls)} style={style}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setProfileModalLead(lead)}
                aria-label={`View profile for ${lead.name}`}
                title="View applicant profile"
                className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700 dark:hover:text-blue-400"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
              <ApplicationIdBadge id={lead.applicationId} />
            </div>
          </TableCell>
        );
      case "name":
        return (
          <TableCell key={id} className={pinnedCls} style={style}>
            <LeadTableAvatar name={lead.name} avatar={lead.avatar} />
          </TableCell>
        );
      case "email":
        return (
          <TableCell key={id} className={pinnedCls} style={style}>
            <a
              className="block max-w-48 truncate text-sm text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              href={`mailto:${lead.email}`}
            >
              {lead.email}
            </a>
          </TableCell>
        );
      case "currentStatus":
        return (
          <TableCell key={id} className={pinnedCls} style={style}>
            <div className="flex items-center gap-1.5">
              <StatusBadge status={lead.currentStatus} hodName={lead.hodName} />
              {lead.isSensitive && <SensitiveBadge />}
              {lead.stage === "admin" && currentRole === "administrator" && (
                <AdminActionBadge />
              )}
            </div>
          </TableCell>
        );
      case "applicationType":
        return (
          <TableCell key={id} className={cn("whitespace-nowrap", pinnedCls)} style={style}>
            <ApplicationTypeBadge type={lead.applicationType} />
          </TableCell>
        );
      case "title":
        return (
          <TableCell
            key={id}
            className={cn(
              "truncate text-sm text-gray-700 dark:text-gray-300",
              pinnedCls,
            )}
            style={style}
            title={lead.researchTitle}
          >
            {lead.researchTitle}
          </TableCell>
        );
      case "responseIn":
        return (
          <TableCell key={id} className={cn("text-sm text-gray-700 dark:text-gray-300", pinnedCls)} style={style}>
            {lead.project}
          </TableCell>
        );
      case "duration":
        return (
          <TableCell key={id} className={cn("text-sm text-gray-700 dark:text-gray-300", pinnedCls)} style={style}>
            {lead.duration}
          </TableCell>
        );
      case "actions":
        return (
          <TableCell
            key={id}
            className={cn(
              "sticky right-0 min-w-40 bg-white align-top shadow-md dark:bg-gray-800",
              actionMenuLeadId === lead.id ? "z-50 overflow-visible" : "z-10",
              index % 2 === 1 && "bg-gray-50 dark:bg-gray-800",
            )}
          >
            <RowActions
              lead={lead}
              currentRole={currentRole}
              busyLeadId={busyLeadId}
              isMenuOpen={actionMenuLeadId === lead.id}
              onMenuOpenChange={(next) => {
                const isCurrent = actionMenuLeadId === lead.id;
                const resolved =
                  typeof next === "function" ? next(isCurrent) : next;
                setActionMenuLeadId(resolved ? lead.id : null);
              }}
              openUpward={openUpward}
              onView={() => router.push(`/admin/submissions/${lead.id}/profile`)}
              onDownload={() => void openAttachmentModal(lead)}
              onGetReports={
                currentRole === "administrator"
                  ? () => openAdminReportPicker(lead)
                  : undefined
              }
              onViewFeedback={
                lead.latestFeedbackComment
                  ? () => setFeedbackModalLead(lead)
                  : undefined
              }
              onViewActionTrace={
                lead.latestActionTrace
                  ? () => setActionTraceModalLead(lead)
                  : undefined
              }
              onApprove={
                canDecide ? () => openDecisionModal(lead, "approved") : undefined
              }
              onReject={
                canDecide ? () => openDecisionModal(lead, "rejected") : undefined
              }
              onRecommend={
                lead.stage === "admin" && currentRole === "administrator"
                  ? () => openAdminReleaseModal(lead, "recommend")
                  : undefined
              }
              onMarkSensitive={
                lead.stage === "admin" && currentRole === "administrator"
                  ? () => openAdminReleaseModal(lead, "mark_sensitive")
                  : undefined
              }
            />
          </TableCell>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("col-span-12", className)}>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 dark:border-gray-700 dark:bg-gray-800">
        <TableToolbar
          title={title}
          totalCount={visibleLeads.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          departmentFilter={departmentFilter}
          currentStatusFilter={currentStatusFilter}
          departmentCounts={departmentCounts}
          currentStatusCounts={currentStatusCounts}
          scopeFilteredCount={scopeFilteredLeads.length}
          departmentScopeCount={scopeFilteredLeads.length}
          irebMemberFilter={irebMemberFilter}
          irebMemberCounts={irebMemberCounts}
          onIrebMemberChange={setIrebMemberFilter}
          showIrebMemberFilter={currentRole === "administrator"}
          onDepartmentChange={setDepartmentFilter}
          onStatusChange={setCurrentStatusFilter}
          onExport={openExportModal}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          allRequestsCount={leads.length}
          overdueCount={overdueLeads.length}
          approvedCount={approvedLeads.length}
          pendingCount={pendingLeads.length}
          rejectedCount={rejectedLeads.length}
          showApprovedTab={showApprovedTab}
          adminActionCount={adminActionLeads.length}
          showAdminActionTab={showAdminActionTab}
          overdueBannerDismissed={overdueBannerDismissed}
          onDismissOverdueBanner={() => setOverdueBannerDismissed(true)}
          onClearDepartment={(value) =>
            setDepartmentFilter((current) => current.filter((item) => item !== value))
          }
          onClearStatus={(value) =>
            setCurrentStatusFilter((current) =>
              current.filter((item) => item !== value),
            )
          }
          onClearIrebMember={(value) =>
            setIrebMemberFilter((current) =>
              current.filter((item) => item !== value),
            )
          }
          onClearAllFilters={clearAllFilters}
          actionError={actionError}
          columnManager={<ColumnManagerButton layoutApi={columnLayout} />}
        />

        <TableTopScrollArea maxHeight="34.375rem">
          <Table
            unwrapped
            className="table-fixed min-w-full"
            style={{ width: visibleColumns.reduce((sum, id) => sum + widthOf(id), 0) }}
          >
            <colgroup>
              {visibleColumns.map((id) => (
                <col key={id} style={{ width: widthOf(id) }} />
              ))}
            </colgroup>
            <TableHeader className="sticky top-0 z-10 bg-indigo-50/80 backdrop-blur-sm dark:bg-indigo-950/40">
              <TableRow className="border-b border-indigo-100 [&>th]:px-4 [&>th]:py-3 dark:border-indigo-900/50 md:[&>th]:px-6 md:[&>th]:py-4">
                {visibleColumns.map(headerCellFor)}
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedLeads.map((lead, index) => {
                const openUpward =
                  paginatedLeads.length <= 4 || index >= paginatedLeads.length - 2;
                const canDecide = lead.stage !== "completed" && Boolean(currentRole);
                return (
                  <TableRow
                    key={lead.id}
                    className={cn(
                      "border-b border-gray-100 transition-colors hover:bg-indigo-50/60 dark:border-gray-700 dark:hover:bg-indigo-950/30",
                      index % 2 === 1 && "bg-gray-50/30 dark:bg-gray-800/30",
                      "[&>td]:px-4 [&>td]:py-3 md:[&>td]:px-6 md:[&>td]:py-4",
                      busyLeadId === lead.id && "cursor-wait opacity-60",
                    )}
                  >
                    {visibleColumns.map((id) =>
                      bodyCellFor(id, lead, index, openUpward, canDecide),
                    )}
                  </TableRow>
                );
              })}
              {visibleLeads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="p-0">
                    <EmptyState
                      message={
                        activeTab === "pending"
                          ? "No Pending Requests"
                          : activeTab === "approved"
                            ? "No Approved Requests"
                            : activeTab === "rejected"
                              ? "No Rejected Requests"
                              : activeTab === "overdue"
                                ? "No Overdue Requests"
                                : "No approval requests found."
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableTopScrollArea>
        {visibleLeads.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={visibleLeads.length}
            pageSize={pageSize}
            onPrevious={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            onNext={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          />
        )}
      </div>

      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        visibleCount={visibleLeads.length}
        exportColState={exportColState}
        onToggleColumn={(id) =>
          setExportColState((prev) => ({ ...prev, [id]: !prev[id] }))
        }
        onSelectAll={() =>
          setExportColState(Object.fromEntries(LEADS_EXCEL_COLUMNS.map((c) => [c.id, true])))
        }
        onClearAll={() =>
          setExportColState(Object.fromEntries(LEADS_EXCEL_COLUMNS.map((c) => [c.id, false])))
        }
        onExport={() => void runLeadsExcelExport()}
      />

      {attachmentModalLead && (
        <AttachmentModal
          lead={attachmentModalLead}
          loading={attachmentModalLoading}
          error={attachmentModalError}
          payload={attachmentModalPayload}
          slots={attachmentModalSlots}
          onClose={closeAttachmentModal}
          onViewSlot={setAttachmentViewTarget}
          onDownloadSlot={(url, fileName, label) =>
            void downloadAttachmentFromApi(url, fileName, label)
          }
          onDownloadNameOnly={downloadNameOnlyReference}
        />
      )}

      {attachmentViewTarget && attachmentModalLead && (
        <AttachmentViewModal
          label={attachmentViewTarget.label}
          fileName={attachmentViewTarget.fileName}
          hasStoredFile={attachmentViewTarget.hasStoredFile}
          downloadUrl={attachmentViewTarget.downloadUrl}
          onClose={() => setAttachmentViewTarget(null)}
          onOpenFile={() => {
            if (attachmentViewTarget.downloadUrl) {
              window.open(attachmentViewTarget.downloadUrl, "_blank", "noopener,noreferrer");
            }
          }}
          onDownloadFile={() => {
            if (attachmentViewTarget.downloadUrl) {
              void downloadAttachmentFromApi(
                attachmentViewTarget.downloadUrl,
                attachmentViewTarget.fileName,
                attachmentViewTarget.label,
              );
            }
          }}
          onDownloadSummary={() => {
            downloadNameOnlyReference(
              attachmentViewTarget.label,
              attachmentViewTarget.fileName,
            );
          }}
        />
      )}

      {decisionLead && (
        <DecisionModal
          lead={decisionLead}
          action={decisionAction}
          currentRole={currentRole}
          comment={decisionComment}
          onCommentChange={setDecisionComment}
          selectedRejectionReasons={selectedRejectionReasons}
          onToggleRejectionReason={toggleRejectionReason}
          selectedOnBehalfOf={selectedOnBehalfOf}
          onOnBehalfOfChange={setSelectedOnBehalfOf}
          adminOptions={adminOptions}
          busy={busyLeadId === decisionLead.id}
          onClose={resetDecisionModal}
          onSubmit={() => void handleDecisionSubmit()}
        />
      )}

      {adminReleaseLead && (
        <AdminReleaseModal
          lead={adminReleaseLead}
          action={adminReleaseAction}
          comment={adminReleaseComment}
          onCommentChange={setAdminReleaseComment}
          busy={busyLeadId === adminReleaseLead.id}
          error={actionError}
          onClose={resetAdminReleaseModal}
          onSubmit={() => void handleAdminReleaseSubmit()}
          irebUserId={adminReleaseIrebUserId}
          onIrebUserIdChange={setAdminReleaseIrebUserId}
        />
      )}

      {feedbackModalLead && (
        <FeedbackModal lead={feedbackModalLead} onClose={closeFeedbackModal} />
      )}

      {actionTraceModalLead && (
        <ActionTraceModal lead={actionTraceModalLead} onClose={closeActionTraceModal} />
      )}

      {profileModalLead && (
        <ApplicantProfileModal lead={profileModalLead} onClose={closeProfileModal} />
      )}

      {portalMounted && adminReports?.phase === "pick" && (
        <AdminReportsPicker
          lead={adminReports.lead}
          onClose={closeAdminReports}
          onSelectStudent={() => selectAdminReportKind("student")}
          onSelectStatus={() => selectAdminReportKind("status")}
        />
      )}

      {portalMounted && adminReports?.phase === "preview" && (
        <AdminReportPreview
          lead={adminReports.lead}
          kind={adminReports.kind}
          previewHtml={adminReportPreviewHtml}
          loading={adminReportSubmissionLoading}
          exporting={adminReportPdfExporting}
          iframeRef={reportPreviewIframeRef}
          onClose={closeAdminReports}
          onBack={
            adminReports.kind !== "faculty"
              ? () => setAdminReports({ phase: "pick", lead: adminReports.lead })
              : undefined
          }
          onDownload={() => void downloadActiveAdminReport()}
        />
      )}
    </div>
  );
}
