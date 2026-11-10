"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const oldest = items[0]?.daysWaiting ?? 0;
  const severe = items.some((i) => i.daysWaiting > thresholdDays);

  // Nothing pending — slim quiet line, no attention drawn.
  if (items.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        <CheckCircle2 className="size-4" aria-hidden="true" />
        Nothing pending — all caught up.
      </p>
    );
  }

  return (
    <section aria-label="Items needing attention" className="min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 rounded-[10px] border px-4 py-3 text-left shadow-1 transition",
          "focus:outline-none focus:ring-2 focus:ring-amber-400/60",
          severe
            ? "border-amber-400 bg-amber-50 hover:bg-amber-100/80 dark:border-amber-700 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
            : "border-stroke bg-white hover:bg-gray-1 dark:border-dark-3 dark:bg-gray-dark dark:hover:bg-dark-2",
        )}
      >
        <span
          className={cn(
            "relative flex size-9 shrink-0 items-center justify-center rounded-full",
            severe
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              : "bg-gray-2 text-dark-5 dark:bg-dark-3 dark:text-dark-6",
          )}
        >
          <AlertTriangle className="size-5" aria-hidden="true" />
          {severe && (
            <span className="absolute -right-0.5 -top-0.5 size-2.5 animate-pulse rounded-full bg-amber-500 motion-reduce:animate-none" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-dark dark:text-white">
            {items.length} application{items.length === 1 ? "" : "s"} need
            {items.length === 1 ? "s" : ""} attention
          </span>
          <span className="block truncate text-xs text-dark-5 dark:text-dark-6">
            Oldest pending item waiting {oldest} day{oldest === 1 ? "" : "s"} · oldest
            first across all tracks
          </span>
        </span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
            severe
              ? "bg-amber-500 text-white"
              : "bg-gray-2 text-dark-5 dark:bg-dark-3 dark:text-dark-6",
          )}
        >
          {items.length}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-dark-5 transition-transform duration-300 dark:text-dark-6",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {/* Expandable list */}
      <div
        className={cn(
          "grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="mt-3 divide-y divide-stroke rounded-[10px] border border-stroke bg-white px-5 shadow-1 dark:divide-dark-3 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
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
        </div>
      </div>
    </section>
  );
}
