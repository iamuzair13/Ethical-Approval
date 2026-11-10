"use client";

import Link from "next/link";
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

export function NeedsAttention({
  items,
  thresholdDays,
}: {
  items: NeedsAttentionItem[];
  thresholdDays: number;
}) {
  return (
    <section
      aria-labelledby="needs-attention-title"
      className="rounded-[10px] border border-stroke bg-white px-5 py-5 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card sm:px-7.5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 id="needs-attention-title" className="text-body-2xlg font-bold text-dark dark:text-white">
          Needs attention
        </h3>
        <span className="text-xs text-dark-5 dark:text-dark-6">
          Oldest pending items across all tracks
        </span>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stroke px-4 py-6 text-center text-sm text-dark-5 dark:border-dark-3 dark:text-dark-6">
          Nothing pending — all caught up.
        </p>
      ) : (
        <ul className="divide-y divide-stroke dark:divide-dark-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2.5">
              <span
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold",
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
                  {item.applicantName} · {TRACK_LABELS[item.track]} · {STAGE_LABELS[item.stage]}
                  {item.assignedIrebName ? ` · → ${item.assignedIrebName}` : ""}
                  {" · "}
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
      )}
    </section>
  );
}
