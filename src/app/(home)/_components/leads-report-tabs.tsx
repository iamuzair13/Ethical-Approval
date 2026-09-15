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
        <div className="mb-4 flex gap-2 md:mb-6 md:gap-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const isSensitive = tab.key === "sensitive";
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all md:px-5 md:py-3",
                  isActive
                    ? isSensitive
                      ? "bg-amber-500 text-white shadow-sm dark:bg-amber-600"
                      : "bg-primary text-white shadow-sm"
                    : isSensitive
                      ? "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50"
                      : "border border-stroke bg-white text-dark hover:bg-gray-2 dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:hover:bg-white/5",
                )}
              >
                {isSensitive && (
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                )}
                {tab.label}
                <span
                  className={cn(
                    "inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold",
                    isActive
                      ? isSensitive
                        ? "bg-white/25 text-white"
                        : "bg-white/20 text-white"
                      : isSensitive
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
