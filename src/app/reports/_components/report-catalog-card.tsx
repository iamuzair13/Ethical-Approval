"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function ReportCatalogCard({
  title,
  description,
  badge,
  controls,
  action,
}: {
  title: string;
  description: string;
  badge?: string;
  controls?: ReactNode;
  action: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-[10px] border border-stroke bg-white p-6 shadow-1 transition",
        "dark:border-dark-3 dark:bg-gray-dark dark:shadow-card",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-dark dark:text-white">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-body">{description}</p>
        </div>
        {badge ? (
          <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            {badge}
          </span>
        ) : null}
      </div>
      {controls ? <div className="mt-5 flex flex-col gap-3">{controls}</div> : null}
      <div className="mt-6 flex flex-wrap gap-2 border-t border-stroke pt-5 dark:border-dark-3">
        {action}
      </div>
    </div>
  );
}
