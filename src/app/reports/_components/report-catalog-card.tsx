"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function ReportCatalogCard({
  icon,
  title,
  description,
  tags,
  controls,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  /** Metric/content chips — what the report contains, as data not prose. */
  tags?: string[];
  controls?: ReactNode;
  action: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-[10px] border border-stroke bg-white shadow-1 transition",
        "dark:border-dark-3 dark:bg-gray-dark dark:shadow-card",
      )}
    >
      <div className="flex items-start gap-3.5 px-6 pt-6">
        {icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug text-dark dark:text-white">
            {title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-body dark:text-dark-6">
            {description}
          </p>
        </div>
      </div>

      {tags?.length ? (
        <div className="mt-3.5 flex flex-wrap gap-1.5 px-6">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-gray-2 px-2 py-0.5 text-[11px] font-medium text-dark-5 dark:bg-dark-2 dark:text-dark-6"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {controls ? (
        <div className="mt-5 flex flex-1 flex-col gap-3 px-6">{controls}</div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="mt-6 flex flex-wrap gap-2 border-t border-stroke px-6 py-5 dark:border-dark-3">
        {action}
      </div>
    </div>
  );
}
