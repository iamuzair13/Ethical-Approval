"use client";

import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ClipboardList,
  Download,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { ActiveFiltersBar, FilterMenu } from "./filter-controls";
import type { CountEntry, LeadStatus } from "./types";

type TableToolbarProps = {
  title: string;
  totalCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  facultyFilter: string[];
  departmentFilter: string[];
  currentStatusFilter: LeadStatus[];
  facultyCounts: CountEntry[];
  departmentCounts: CountEntry[];
  currentStatusCounts: CountEntry[];
  scopeFilteredCount: number;
  departmentScopeCount: number;
  onFacultyChange: (values: string[]) => void;
  onDepartmentChange: (values: string[]) => void;
  onStatusChange: (values: LeadStatus[]) => void;
  onExport: () => void;
  activeTab: "all" | "overdue" | "approved" | "pending" | "rejected";
  onTabChange: (tab: "all" | "overdue" | "approved" | "pending" | "rejected") => void;
  allRequestsCount: number;
  overdueCount: number;
  approvedCount?: number;
  pendingCount?: number;
  rejectedCount?: number;
  showApprovedTab?: boolean;
  overdueBannerDismissed: boolean;
  onDismissOverdueBanner: () => void;
  onRefresh: () => void;
  onClearFaculty: (value: string) => void;
  onClearDepartment: (value: string) => void;
  onClearStatus: (value: string) => void;
  onClearAllFilters: () => void;
  actionError: string | null;
};

export function TableToolbar({
  title,
  totalCount,
  searchQuery,
  onSearchChange,
  facultyFilter,
  departmentFilter,
  currentStatusFilter,
  facultyCounts,
  departmentCounts,
  currentStatusCounts,
  scopeFilteredCount,
  departmentScopeCount,
  onFacultyChange,
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
  overdueBannerDismissed,
  onDismissOverdueBanner,
  onRefresh,
  onClearFaculty,
  onClearDepartment,
  onClearStatus,
  onClearAllFilters,
  actionError,
}: TableToolbarProps) {
  const tabClassName = (tab: TableToolbarProps["activeTab"]) =>
    cn(
      "inline-flex max-w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30",
      activeTab === tab
        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200",
    );
  const countClassName =
    "rounded-md bg-gray-900/5 px-1.5 py-0.5 text-xs font-medium leading-none tabular-nums dark:bg-white/10";

  return (
    <div className="flex min-w-0 flex-col gap-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <ClipboardList className="size-5 text-gray-500 dark:text-gray-400" aria-hidden />
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
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh data"
            className="rounded-lg p-2 text-gray-500 transition-all duration-150 ease-in-out hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 active:scale-[0.98] dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <RefreshCw className="size-5" aria-hidden />
          </button>
          
        </div>
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
              label="Faculty"
              value={facultyFilter}
              options={facultyCounts}
              totalCount={scopeFilteredCount}
              onChange={onFacultyChange}
            />
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
            <button
              type="button"
              onClick={onExport}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all duration-150 ease-in-out hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 active:scale-[0.98] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Download className="size-4 shrink-0" aria-hidden />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      <ActiveFiltersBar
        facultyFilter={facultyFilter}
        departmentFilter={departmentFilter}
        currentStatusFilter={currentStatusFilter}
        onClearFaculty={onClearFaculty}
        onClearDepartment={onClearDepartment}
        onClearStatus={onClearStatus}
        onClearAll={onClearAllFilters}
      />

      {/* Tabs */}
      <div className="flex min-w-0 flex-wrap items-center gap-1 rounded-xl border border-gray-200 p-1 dark:border-gray-700">
        <button
          type="button"
          className={tabClassName("all")}
          aria-pressed={activeTab === "all"}
          onClick={() => onTabChange("all")}
        >
          All Requests <span className={countClassName}>{allRequestsCount}</span>
        </button>
        <button
          type="button"
          className={tabClassName("pending")}
          aria-pressed={activeTab === "pending"}
          onClick={() => onTabChange("pending")}
        >
          Pending Requests <span className={countClassName}>{pendingCount ?? 0}</span>
        </button>
        {showApprovedTab && (
          <button
            type="button"
            className={tabClassName("approved")}
            aria-pressed={activeTab === "approved"}
            onClick={() => onTabChange("approved")}
          >
            Approved Requests <span className={countClassName}>{approvedCount ?? 0}</span>
          </button>
        )}
        
        <button
          type="button"
          className={tabClassName("overdue")}
          aria-pressed={activeTab === "overdue"}
          onClick={() => onTabChange("overdue")}
        >
          Over Due Approval <span className={countClassName}>{overdueCount}</span>
        </button>
        
        {showApprovedTab && (
          <button
            type="button"
            className={tabClassName("rejected")}
            aria-pressed={activeTab === "rejected"}
            onClick={() => onTabChange("rejected")}
          >
            Rejected Requests <span className={countClassName}>{rejectedCount ?? 0}</span>
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
