"use client";

import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BellRing,
  ClipboardList,
  Download,
  Search,
  X,
} from "lucide-react";
import { ActiveFiltersBar, FilterMenu } from "./filter-controls";
import type { CountEntry, LeadsTab, LeadStatus } from "./types";

/** Semantic color per tab — status meaning readable at a glance. */
const TAB_TONES: Record<
  LeadsTab,
  { active: string; inactive: string; badgeActive: string; badgeInactive: string }
> = {
  all: {
    active: "bg-indigo-600 text-white shadow-sm",
    inactive:
      "text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10",
    badgeActive: "bg-white/20 text-white",
    badgeInactive: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  },
  pending: {
    active: "bg-amber-500 text-white shadow-sm",
    inactive:
      "text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10",
    badgeActive: "bg-white/20 text-white",
    badgeInactive: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
  adminAction: {
    active: "bg-violet-600 text-white shadow-sm",
    inactive:
      "text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10",
    badgeActive: "bg-white/20 text-white",
    badgeInactive: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  },
  approved: {
    active: "bg-emerald-600 text-white shadow-sm",
    inactive:
      "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10",
    badgeActive: "bg-white/20 text-white",
    badgeInactive: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  overdue: {
    active: "bg-orange-600 text-white shadow-sm",
    inactive:
      "text-orange-700 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-500/10",
    badgeActive: "bg-white/20 text-white",
    badgeInactive: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  },
  rejected: {
    active: "bg-rose-600 text-white shadow-sm",
    inactive:
      "text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10",
    badgeActive: "bg-white/20 text-white",
    badgeInactive: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  },
};

type TableToolbarProps = {
  title: string;
  totalCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  departmentFilter: string[];
  currentStatusFilter: LeadStatus[];
  departmentCounts: CountEntry[];
  currentStatusCounts: CountEntry[];
  scopeFilteredCount: number;
  departmentScopeCount: number;
  irebMemberFilter: string[];
  irebMemberCounts: CountEntry[];
  onIrebMemberChange: (values: string[]) => void;
  showIrebMemberFilter?: boolean;
  onDepartmentChange: (values: string[]) => void;
  onStatusChange: (values: LeadStatus[]) => void;
  onExport: () => void;
  activeTab: LeadsTab;
  onTabChange: (tab: LeadsTab) => void;
  allRequestsCount: number;
  overdueCount: number;
  approvedCount?: number;
  pendingCount?: number;
  rejectedCount?: number;
  showApprovedTab?: boolean;
  adminActionCount?: number;
  showAdminActionTab?: boolean;
  overdueBannerDismissed: boolean;
  onDismissOverdueBanner: () => void;
  onClearDepartment: (value: string) => void;
  onClearStatus: (value: string) => void;
  onClearIrebMember: (value: string) => void;
  onClearAllFilters: () => void;
  actionError: string | null;
  /** Column-management control rendered next to the filter buttons. */
  columnManager?: React.ReactNode;
};

export function TableToolbar({
  title,
  totalCount,
  searchQuery,
  onSearchChange,
  departmentFilter,
  currentStatusFilter,
  departmentCounts,
  currentStatusCounts,
  scopeFilteredCount,
  departmentScopeCount,
  irebMemberFilter,
  irebMemberCounts,
  onIrebMemberChange,
  showIrebMemberFilter = false,
  onDepartmentChange,
  onStatusChange,
  onExport,
  activeTab,
  onTabChange,
  allRequestsCount,
  overdueCount,
  approvedCount,
  pendingCount,
  rejectedCount,
  showApprovedTab,
  adminActionCount,
  showAdminActionTab,
  overdueBannerDismissed,
  onDismissOverdueBanner,
  onClearDepartment,
  onClearStatus,
  onClearIrebMember,
  onClearAllFilters,
  actionError,
  columnManager,
}: TableToolbarProps) {
  const tabClassName = (tab: LeadsTab) =>
    cn(
      "inline-flex max-w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30",
      activeTab === tab ? TAB_TONES[tab].active : TAB_TONES[tab].inactive,
    );
  const countClassName = (tab: LeadsTab) =>
    cn(
      "rounded-md px-1.5 py-0.5 text-xs font-semibold leading-none tabular-nums",
      activeTab === tab ? TAB_TONES[tab].badgeActive : TAB_TONES[tab].badgeInactive,
    );

  return (
    <div className="flex min-w-0 flex-col gap-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm shadow-indigo-500/30">
            <ClipboardList className="size-5 text-white" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="break-words text-lg font-semibold leading-snug tracking-tight text-gray-900 dark:text-white sm:text-xl">
              {title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {totalCount} request{totalCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">{columnManager}</div>
      </div>

      {/* Search row */}
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full min-w-0 xl:max-w-md xl:flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Application ID, name, email, type, title, faculty, department…"
            aria-label="Search approval requests"
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder:text-gray-400 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
          />
        </div>

        {/* Filters + Export row */}
        <div className="min-w-0 max-w-full">
          <div className="flex flex-wrap items-center gap-2">
            <FilterMenu
              multiple
              label="Department"
              value={departmentFilter}
              options={departmentCounts}
              totalCount={departmentScopeCount}
              onChange={onDepartmentChange}
            />
            <FilterMenu
              multiple
              label="Current Status"
              value={currentStatusFilter}
              options={currentStatusCounts}
              totalCount={scopeFilteredCount}
              onChange={(values) => onStatusChange(values as LeadStatus[])}
            />
            {showIrebMemberFilter && (
              <FilterMenu
                multiple
                label="IREB Member"
                value={irebMemberFilter}
                options={irebMemberCounts}
                totalCount={scopeFilteredCount}
                onChange={onIrebMemberChange}
              />
            )}
            <button
              type="button"
              onClick={onExport}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-all duration-150 ease-in-out hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 active:scale-[0.98] dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
            >
              <Download className="size-4 shrink-0" aria-hidden />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      <ActiveFiltersBar
        departmentFilter={departmentFilter}
        currentStatusFilter={currentStatusFilter}
        irebMemberFilter={irebMemberFilter}
        onClearDepartment={onClearDepartment}
        onClearStatus={onClearStatus}
        onClearIrebMember={onClearIrebMember}
        onClearAll={onClearAllFilters}
      />

      {/* Tabs */}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/60 p-1.5 dark:border-gray-700 dark:bg-gray-800/40">
        <button
          type="button"
          className={tabClassName("all")}
          aria-pressed={activeTab === "all"}
          onClick={() => onTabChange("all")}
        >
          All Requests <span className={countClassName("all")}>{allRequestsCount}</span>
        </button>
        <button
          type="button"
          className={tabClassName("pending")}
          aria-pressed={activeTab === "pending"}
          onClick={() => onTabChange("pending")}
        >
          Pending Requests <span className={countClassName("pending")}>{pendingCount ?? 0}</span>
        </button>
        {showAdminActionTab && (
          <button
            type="button"
            className={tabClassName("adminAction")}
            aria-pressed={activeTab === "adminAction"}
            onClick={() => onTabChange("adminAction")}
          >
            <BellRing className="size-3.5 shrink-0" aria-hidden />
            Needs Admin Action <span className={countClassName("adminAction")}>{adminActionCount ?? 0}</span>
          </button>
        )}
        {showApprovedTab && (
          <button
            type="button"
            className={tabClassName("approved")}
            aria-pressed={activeTab === "approved"}
            onClick={() => onTabChange("approved")}
          >
            Approved Requests <span className={countClassName("approved")}>{approvedCount ?? 0}</span>
          </button>
        )}
        
        <button
          type="button"
          className={tabClassName("overdue")}
          aria-pressed={activeTab === "overdue"}
          onClick={() => onTabChange("overdue")}
        >
          Over Due Approval <span className={countClassName("overdue")}>{overdueCount}</span>
        </button>
        
        {showApprovedTab && (
          <button
            type="button"
            className={tabClassName("rejected")}
            aria-pressed={activeTab === "rejected"}
            onClick={() => onTabChange("rejected")}
          >
            Rejected Requests <span className={countClassName("rejected")}>{rejectedCount ?? 0}</span>
          </button>
        )}
      </div>

      {/* Overdue banner */}
      {overdueCount > 0 && !overdueBannerDismissed && (
        <div className="flex min-w-0 items-start gap-2.5 rounded-lg border border-amber-200/70 bg-amber-50/60 px-3 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-amber-800 dark:text-amber-300">
            Attention required: {overdueCount} approval request
            {overdueCount > 1 ? "s have" : " has"} not been responded to within 2 days.
          </p>
          <button
            type="button"
            onClick={onDismissOverdueBanner}
            aria-label="Dismiss overdue warning"
            className="shrink-0 rounded-md p-1 text-amber-700 transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-900/30"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          {actionError}
        </div>
      )}
    </div>
  );
}
