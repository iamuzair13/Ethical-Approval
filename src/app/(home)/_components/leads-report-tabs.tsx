"use client";

import { useState } from "react";
import { LeadsReport } from "@/components/Tables/leads-report";
import type { Lead } from "@/components/Tables/leads-report/types";
import { cn } from "@/lib/utils";

type PropsType = {
  className?: string;
  leads: Lead[];
  sensitiveLeads: Lead[];
  currentRole: "administrator" | "hod" | "ireb" | null;
  canViewSensitive: boolean;
};

type TabKey = "all" | "sensitive";

export function LeadsReportTabs({
  className,
  leads,
  sensitiveLeads,
  currentRole,
  canViewSensitive,
}: PropsType) {
  const showSensitiveTab = canViewSensitive && sensitiveLeads.length > 0;
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "All Requests", count: leads.length },
  ];
  if (showSensitiveTab) {
    tabs.push({
      key: "sensitive",
      label: "Sensitive Cases",
      count: sensitiveLeads.length,
    });
  }

  return (
    <div className={cn("col-span-12", className)}>
      {tabs.length > 1 && (
        <div className="mb-4 flex gap-2 border-b border-stroke dark:border-dark-3 md:mb-6 md:gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "relative px-3 py-2.5 text-sm font-medium transition-colors md:px-5 md:py-3",
                activeTab === tab.key
                  ? "text-primary"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              )}
            >
              {tab.label} ({tab.count})
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      )}

      {activeTab === "all" && (
        <LeadsReport leads={leads} currentRole={currentRole} />
      )}

      {activeTab === "sensitive" && showSensitiveTab && (
        <LeadsReport
          leads={sensitiveLeads}
          currentRole={currentRole}
          title="Sensitive Cases"
        />
      )}
    </div>
  );
}
