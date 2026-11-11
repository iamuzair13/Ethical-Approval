"use client";

import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BellRing,
  Download,
  Search,
  X,
} from "lucide-react";
import { ActiveFiltersBar, FilterMenu } from "./filter-controls";
import type { CountEntry, LeadsTab, LeadStatus } from "./types";

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
  /** Column-management control rendered next to the export button. */
  columnManager?: React.ReactNode;
};

/** Soft status tint for counts — only overdue/rejected get a tone. */
function countBadgeTone(tab: LeadsTab): string {
  switch (tab) {
    case "overdue":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    case "rejected":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
    case "adminAction":
      return "bg-primary/10 text-primary dark:text-indigo-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
}

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
  const tabs: { key: LeadsTab; label: string; count: number }[] = [
    { key: "all", label: "All Requests", count: allRequestsCount },
    { key: "pending", label: "Pending Requests", count: pendingCount ?? 0 },
    ...(showAdminActionTab
      ? [{ key: "adminAction" as LeadsTab, label: "Needs Admin Action", count: adminActionCount ?? 0 }]
      : []),
    ...(showApprovedTab
      ? [{ key: "approved" as LeadsTab, label: "Approved Requests", count: approvedCount ?? 0 }]
      : []),
    { key: "overdue", label: "Over Due Approval", count: overdueCount },
    ...(showApprovedTab
      ? [{ key: "rejected" as LeadsTab, label: "Rejected Requests", count: rejectedCount ?? 0 }]
      : []),
  ];

  return (
    <div className="flex min-w-0 flex-col gap-4 p-5">
      {/* Section header — title + muted count, outline actions on the right */}
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {totalCount} request{totalCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {columnManager}
          <button
            type="button"
            onClick={onExport}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <Download className="size-4 shrink-0" aria-hidden />
            Export Excel
          </button>
        </div>
      </div>

      {/* Search + filter menus */}
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full min-w-0 xl:max-w-md xl:flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Application ID, name, email, type, title, faculty, department…"
            aria-label="Search approval requests"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
        </div>

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

      {/* Overdue banner — slim, soft, no heavy border */}
      {overdueCount > 0 && !overdueBannerDismissed && (
        <div className="flex min-w-0 items-center gap-2.5 rounded-lg bg-amber-50 px-3.5 py-2.5 dark:bg-amber-950/30">
          <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-amber-800 dark:text-amber-300">
            {overdueCount} approval request
            {overdueCount > 1 ? "s have" : " has"} not been responded to within 2 days.
          </p>
          <button
            type="button"
            onClick={onDismissOverdueBanner}
            aria-label="Dismiss overdue warning"
            className="grid size-8 shrink-0 place-items-center rounded-md text-amber-700 transition-colors hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:text-amber-400 dark:hover:bg-amber-900/40"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      {actionError && (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
          {actionError}
        </div>
      )}

      {/* Status tabs — underline style, flush against the table below */}
      <div
        className="-mb-5 flex min-w-0 flex-wrap items-center gap-x-1 border-b border-slate-200 dark:border-slate-800"
        role="group"
        aria-label="Filter requests by status"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={active}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "relative -mb-px inline-flex items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-sm transition-colors duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                active
                  ? "border-primary font-semibold text-slate-900 dark:text-white"
                  : "border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              {tab.key === "adminAction" && (
                <BellRing className="size-3.5 shrink-0" aria-hidden />
              )}
              {tab.label}
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-xs font-semibold leading-none tabular-nums",
                  countBadgeTone(tab.key),
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
