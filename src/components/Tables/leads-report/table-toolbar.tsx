"use client";

import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ClipboardList,
  Download,
  RefreshCw,
  Search,
  Settings,
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
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <ClipboardList className="size-5 text-blue-600 dark:text-blue-400" aria-hidden />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {totalCount} request{totalCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh data"
            className="rounded-lg p-2 text-gray-500 transition-all duration-150 ease-in-out hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 active:scale-[0.98] dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <RefreshCw className="size-5" aria-hidden />
          </button>
          
        </div>
      </div>

      {/* Search row */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
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
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder:text-gray-400 transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
          />
        </div>

        {/* Filters + Export row */}
        <div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:overflow-visible">
          <div className="flex flex-nowrap items-center gap-2 sm:flex-wrap">
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
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all duration-150 ease-in-out hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 active:scale-[0.98] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/30 active:scale-[0.98]",
            activeTab === "pending"
              ? "bg-amber-500 text-white shadow-sm"
              : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50",
          )}
          onClick={() => onTabChange("pending")}
        >
          Pending Requests ({pendingCount ?? 0})
        </button>
        <button
          type="button"
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/30 active:scale-[0.98]",
            activeTab === "all"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white",
          )}
          onClick={() => onTabChange("all")}
        >
          All Requests ({allRequestsCount})
        </button>
        <button
          type="button"
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500/30 active:scale-[0.98]",
            activeTab === "overdue"
              ? "bg-red-600 text-white shadow-sm"
              : "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50",
          )}
          onClick={() => onTabChange("overdue")}
        >
          Over Due Approval ({overdueCount})
        </button>
        {showApprovedTab && (
          <button
            type="button"
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500/30 active:scale-[0.98]",
              activeTab === "approved"
                ? "bg-green-600 text-white shadow-sm"
                : "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400 dark:hover:bg-green-950/50",
            )}
            onClick={() => onTabChange("approved")}
          >
            Approved Requests ({approvedCount ?? 0})
          </button>
        )}
        {showApprovedTab && (
          <button
            type="button"
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500/30 active:scale-[0.98]",
              activeTab === "rejected"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50",
            )}
            onClick={() => onTabChange("rejected")}
          >
            Rejected Requests ({rejectedCount ?? 0})
          </button>
        )}
      </div>

      {/* Overdue banner */}
      {overdueCount > 0 && !overdueBannerDismissed && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" aria-hidden />
          <p className="flex-1 text-sm font-medium text-red-800 dark:text-red-300">
            Attention required: {overdueCount} approval request
            {overdueCount > 1 ? "s have" : " has"} not been responded to within 2 days.
          </p>
          <button
            type="button"
            onClick={onDismissOverdueBanner}
            aria-label="Dismiss overdue warning"
            className="shrink-0 rounded-lg p-1 text-red-600 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500/30 dark:text-red-400 dark:hover:bg-red-900/50"
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
