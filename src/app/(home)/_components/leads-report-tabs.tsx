"use client";

import { useMemo, useState } from "react";
import { LeadsReport } from "@/components/Tables/leads-report";
import type { Lead } from "@/components/Tables/leads-report/types";
import { NeedsAttentionList } from "@/components/dashboard/needs-attention";
import type { NeedsAttentionItem } from "@/components/dashboard/types";
import { cn } from "@/lib/utils";

export type DashboardTrackKey =
  | "student_thesis"
  | "student_publication"
  | "faculty_publication";

export type DrillFilter = {
  track: DashboardTrackKey;
  /** Pending items sitting at this stage. */
  stage?: "hod" | "admin" | "ireb";
  /** Outcome decided by this body. */
  decidedBy?: "hod" | "admin" | "ireb";
  outcome?: "pending" | "approved" | "rejected";
  label: string;
};

const TRACK_LABELS: Record<DashboardTrackKey, string> = {
  student_thesis: "Student Thesis",
  student_publication: "Student Publication",
  faculty_publication: "Faculty Publication",
};

function isStudentEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@student.uol.edu.pk");
}

function leadTrack(lead: Lead): DashboardTrackKey {
  if (isStudentEmail(lead.email) && lead.applicationType === "Thesis") {
    return "student_thesis";
  }
  if (isStudentEmail(lead.email)) return "student_publication";
  return "faculty_publication";
}

function matchesDrill(lead: Lead, filter: DrillFilter): boolean {
  if (leadTrack(lead) !== filter.track) return false;

  if (filter.outcome === "pending" && filter.stage) {
    return lead.stage === filter.stage;
  }
  if (filter.decidedBy && filter.outcome === "approved") {
    if (filter.decidedBy === "hod") {
      // Approved by HOD = moved past the HOD stage without a HOD rejection.
      return lead.stage !== "hod" && lead.currentStatus !== "Rejected by HOD";
    }
    return lead.currentStatus === "Approved by IREB" && lead.decidingStage === filter.decidedBy;
  }
  if (filter.decidedBy && filter.outcome === "rejected") {
    if (filter.decidedBy === "hod") {
      return lead.currentStatus === "Rejected by HOD";
    }
    return lead.currentStatus === "Rejected by IREB" && lead.decidingStage === filter.decidedBy;
  }
  return true;
}

type PropsType = {
  className?: string;
  leads: Lead[];
  sensitiveLeads: Lead[];
  currentRole: "administrator" | "hod" | "ireb" | null;
  canViewSensitive: boolean;
  /** External drill-down filter from the dashboard sections. */
  drillFilter?: DrillFilter | null;
  onClearDrill?: () => void;
  /** Oldest pending items — rendered as an "attention" tab after Sensitive. */
  attentionItems?: NeedsAttentionItem[];
  agingThresholdDays?: number;
};

type TabKey = "all" | "sensitive" | "attention";

export function LeadsReportTabs({
  className,
  leads,
  sensitiveLeads,
  currentRole,
  canViewSensitive,
  drillFilter = null,
  onClearDrill,
  attentionItems = [],
  agingThresholdDays = 7,
}: PropsType) {
  const showSensitiveTab = canViewSensitive && sensitiveLeads.length > 0;
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const filteredLeads = useMemo(
    () => (drillFilter ? leads.filter((lead) => matchesDrill(lead, drillFilter)) : leads),
    [leads, drillFilter],
  );
  const filteredSensitive = useMemo(
    () =>
      drillFilter
        ? sensitiveLeads.filter((lead) => matchesDrill(lead, drillFilter))
        : sensitiveLeads,
    [sensitiveLeads, drillFilter],
  );

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "All Requests", count: filteredLeads.length },
  ];
  if (showSensitiveTab) {
    tabs.push({
      key: "sensitive",
      label: "Sensitive Cases",
      count: filteredSensitive.length,
    });
  }
  tabs.push({
    key: "attention",
    label: "Needs Attention",
    count: attentionItems.length,
  });

  return (
    <div className={cn("col-span-12", className)}>
      {drillFilter && (
        <div className="mb-3 flex items-center gap-2">
          <span
            role="status"
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary dark:bg-primary/20"
          >
            Filtered: {TRACK_LABELS[drillFilter.track]} · {drillFilter.label}
            <button
              type="button"
              onClick={onClearDrill}
              aria-label="Clear dashboard filter"
              className="ml-1 inline-flex size-4 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold hover:bg-primary/40"
            >
              ✕
            </button>
          </span>
        </div>
      )}

      {tabs.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2 md:mb-6 md:gap-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const isSensitive = tab.key === "sensitive";
            const isAttention = tab.key === "attention";
            const warn = isSensitive || isAttention;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all md:px-5 md:py-3",
                  isActive
                    ? warn
                      ? "bg-amber-500 text-white shadow-sm dark:bg-amber-600"
                      : "bg-primary text-white shadow-sm"
                    : warn
                      ? "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50"
                      : "border border-stroke bg-white text-dark hover:bg-gray-2 dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:hover:bg-white/5",
                )}
              >
                {warn && (
                  <span className="relative flex shrink-0">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    {isAttention && tab.count > 0 && !isActive && (
                      <span className="absolute -right-1 -top-1 size-2 animate-pulse rounded-full bg-amber-500 motion-reduce:animate-none" />
                    )}
                  </span>
                )}
                {tab.label}
                <span
                  className={cn(
                    "inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold",
                    isActive
                      ? warn
                        ? "bg-white/25 text-white"
                        : "bg-white/20 text-white"
                      : warn
                        ? "bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                        : "bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300",
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {activeTab === "all" && (
        <LeadsReport leads={filteredLeads} currentRole={currentRole} />
      )}

      {activeTab === "sensitive" && showSensitiveTab && (
        <LeadsReport
          leads={filteredSensitive}
          currentRole={currentRole}
          title="Sensitive Cases"
        />
      )}

      {activeTab === "attention" && (
        <NeedsAttentionList items={attentionItems} thresholdDays={agingThresholdDays} />
      )}
    </div>
  );
}
