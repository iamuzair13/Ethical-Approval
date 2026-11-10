"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { NeedsAttentionItem } from "./types";
import { STAGE_LABELS, TRACK_LABELS } from "./types";
import { cn } from "@/lib/utils";

function agingChip(days: number, threshold: number) {
  if (days > threshold * 2) {
    return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  }
  if (days > threshold) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }
  return "bg-gray-2 text-dark-5 dark:bg-dark-3 dark:text-dark-6";
}

/** The list itself â€” rendered inside the "Needs attention" tab. */
export function NeedsAttentionList({
  items,
  thresholdDays,
}: {
  items: NeedsAttentionItem[];
  thresholdDays: number;
}) {
  if (items.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        <CheckCircle2 className="size-4" aria-hidden="true" />
        Nothing pending â€” all caught up.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-stroke rounded-[10px] border border-stroke bg-white px-5 shadow-1 dark:divide-dark-3 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-2.5">
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
              agingChip(item.daysWaiting, thresholdDays),
            )}
            title={`Waiting ${item.daysWaiting} day${item.daysWaiting === 1 ? "" : "s"} in ${STAGE_LABELS[item.stage]}`}
          >
            {item.daysWaiting}d
          </span>
          <div className="min-w-0 flex-1">
            <Link
              href={`/admin/submissions/${item.id}/profile`}
              className="block truncate text-sm font-semibold text-dark hover:text-primary dark:text-white"
            >
              {item.title}
            </Link>
            <p className="truncate text-xs text-dark-5 dark:text-dark-6">
              {item.applicantName} Â· {TRACK_LABELS[item.track]} Â· {STAGE_LABELS[item.stage]}
              {item.assignedIrebName ? ` Â· â†’ ${item.assignedIrebName}` : ""}
              {" Â· "}
              <span className="font-mono">{item.applicationId}</span>
            </p>
          </div>
          <Link
            href={`/admin/submissions/${item.id}/profile`}
            className="shrink-0 rounded-lg border border-stroke px-2.5 py-1 text-xs font-semibold text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
          >
            Open
          </Link>
        </li>
      ))}
    </ul>
  );
}