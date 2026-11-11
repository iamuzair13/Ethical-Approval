"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { NeedsAttentionItem } from "./types";
import { STAGE_LABELS, TRACK_LABELS } from "./types";
import { cn } from "@/lib/utils";

function agingChip(days: number, threshold: number) {
  if (days > threshold * 2) {
    return "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
  }
  if (days > threshold) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

/** The list itself — rendered inside the "Needs attention" tab. */
export function NeedsAttentionList({
  items,
  thresholdDays,
}: {
  items: NeedsAttentionItem[];
  thresholdDays: number;
}) {
  if (items.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
        <CheckCircle2 className="size-4" aria-hidden="true" />
        Nothing pending — all caught up.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white px-5 shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-3.5">
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
              agingChip(item.daysWaiting, thresholdDays),
            )}
            title={`Waiting ${item.daysWaiting} day${item.daysWaiting === 1 ? "" : "s"} in ${STAGE_LABELS[item.stage]}`}
          >
            {item.daysWaiting}d
          </span>
          <div className="min-w-0 flex-1">
            <Link
              href={`/admin/submissions/${item.id}/profile`}
              className="block truncate text-sm font-medium text-slate-900 hover:text-primary dark:text-white"
            >
              {item.title}
            </Link>
            <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">
              {item.applicantName} · {TRACK_LABELS[item.track]} · {STAGE_LABELS[item.stage]}
              {item.assignedIrebName ? ` · → ${item.assignedIrebName}` : ""}
              {" · "}
              <span className="font-mono">{item.applicationId}</span>
            </p>
          </div>
          <Link
            href={`/admin/submissions/${item.id}/profile`}
            className="inline-flex h-9 shrink-0 items-center rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            Open
          </Link>
        </li>
      ))}
    </ul>
  );
}
