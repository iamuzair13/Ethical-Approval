"use client";

import { Check, Clock, X, type LucideIcon } from "lucide-react";
import type { DashboardSummary, TrackKey } from "./types";
import { TRACK_LABELS, TRACK_ORDER } from "./types";
import { CountUp } from "./count-up";
import { cn } from "@/lib/utils";

/**
 * Largest-remainder rounding: percentages of `total` that always sum to 100.
 * With total = 0 the caller renders "—" instead of percentages.
 */
function toPercents(parts: number[], total: number): number[] {
  if (total <= 0) return parts.map(() => 0);
  const raw = parts.map((p) => (p / total) * 100);
  const out = raw.map(Math.floor);
  let remainder = 100 - out.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ frac: r - out[i], i }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remainder <= 0) break;
    out[i] += 1;
    remainder -= 1;
  }
  return out;
}

const STAT_META: {
  key: "pending" | "approved" | "rejected";
  label: string;
  icon: LucideIcon;
  numClass: string;
  definition: string;
}[] = [
  {
    key: "pending",
    label: "Pending",
    icon: Clock,
    numClass: "text-amber-600 dark:text-amber-400",
    definition: "Waiting for a decision at any stage of this track's workflow.",
  },
  {
    key: "approved",
    label: "Approved",
    icon: Check,
    numClass: "text-emerald-600 dark:text-emerald-400",
    definition: "Reached a final approval decision.",
  },
  {
    key: "rejected",
    label: "Rejected",
    icon: X,
    numClass: "text-red-600 dark:text-red-400",
    definition: "Reached a final rejection at any stage (HOD, Administrator, or IREB).",
  },
];

function GlanceCard({
  track,
  summary,
}: {
  track: TrackKey;
  summary: DashboardSummary["tracks"][TrackKey];
}) {
  const counts = [
    summary.outcomes.pending,
    summary.outcomes.approved,
    summary.outcomes.rejected,
  ];
  const pcts = toPercents(counts, summary.total);

  return (
    <a
      href={`#track-${track}`}
      className="group block min-w-0 rounded-[10px] border border-stroke bg-white px-4 py-3.5 shadow-1 transition hover:border-primary/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card"
      aria-label={`${TRACK_LABELS[track]}: ${summary.total} submitted. Jump to section.`}
    >
      {/* Header: name + forms left, total right */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-dark group-hover:text-primary dark:text-white">
            {TRACK_LABELS[track]}
          </p>
          <p className="text-[11px] text-dark-5 dark:text-dark-6">{summary.forms}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold leading-none tabular-nums text-dark dark:text-white">
            <CountUp value={summary.total} />
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-dark-5 dark:text-dark-6">
            Total submitted
          </p>
        </div>
      </div>

      {/* Stat blocks: count + percentage, icon so meaning doesn't rely on color */}
      <div className="mt-3 grid grid-cols-3 divide-x divide-stroke dark:divide-dark-3">
        {STAT_META.map((meta, i) => {
          const Icon = meta.icon;
          const count = counts[i];
          return (
            <div
              key={meta.key}
              className="flex flex-col items-center px-2 first:pl-0 last:pr-0"
              title={`${meta.definition} ${count} of ${summary.total} submitted.`}
            >
              <span
                className={cn(
                  "flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide",
                  meta.numClass,
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {meta.label}
              </span>
              <span className="mt-1 text-xl font-bold leading-none tabular-nums text-dark dark:text-white">
                <CountUp value={count} />
              </span>
              <span className="mt-0.5 text-[11px] font-medium tabular-nums text-dark-5 dark:text-dark-6">
                {summary.total > 0 ? `${pcts[i]}%` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </a>
  );
}

export function GlanceStrip({ summary }: { summary: DashboardSummary }) {
  return (
    <section
      aria-label="System at a glance"
      className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {TRACK_ORDER.map((track) => (
        <GlanceCard key={track} track={track} summary={summary.tracks[track]} />
      ))}
    </section>
  );
}
