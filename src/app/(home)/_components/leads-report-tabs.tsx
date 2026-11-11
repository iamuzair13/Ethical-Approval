"use client";

import { useMemo, useState } from "react";
import { LeadsReport } from "@/components/Tables/leads-report";
import type { Lead } from "@/components/Tables/leads-report/types";
import { NeedsAttentionList } from "@/components/dashboard/needs-attention";
import type { NeedsAttentionItem } from "@/components/dashboard/types";
import { SegmentedControl } from "@/components/dashboard/primitives";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

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
        <div className="mb-4 flex items-center gap-2">
          <span
            role="status"
            className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1.5 text-[13px] font-medium text-primary ring-1 ring-inset ring-primary/20 dark:text-indigo-300"
          >
            Filtered: {TRACK_LABELS[drillFilter.track]} · {drillFilter.label}
            <button
              type="button"
              onClick={onClearDrill}
              aria-label="Clear dashboard filter"
              className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-indigo-300"
            >
              <X className="size-3" aria-hidden />
            </button>
          </span>
        </div>
      )}

      {tabs.length > 1 && (
        <SegmentedControl
          ariaLabel="Request lists"
          accent="brand"
          value={activeTab}
          onChange={setActiveTab}
          className="mb-4"
          options={tabs.map((t) => ({ value: t.key, label: t.label, count: t.count }))}
        />
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
