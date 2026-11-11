"use client";

import { ChevronDown } from "lucide-react";
import type { DashboardSummary, TrackKey } from "./types";
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
  numClass: string;
  dot: string;
  bar: string;
  definition: string;
}[] = [
  {
    key: "pending",
    label: "Pending",
    numClass: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    bar: "bg-amber-400 dark:bg-amber-500",
    definition: "Waiting for a decision at any stage of this track's workflow.",
  },
  {
    key: "approved",
    label: "Approved",
    numClass: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    bar: "bg-emerald-400 dark:bg-emerald-500",
    definition: "Reached a final approval decision.",
  },
  {
    key: "rejected",
    label: "Rejected",
    numClass: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
    bar: "bg-rose-400 dark:bg-rose-500",
    definition: "Reached a final rejection at any stage (HOD, Administrator, or IREB).",
  },
];

type TrackSummary = DashboardSummary["tracks"][TrackKey];

/**
 * One card per track — merges the old glance card and the accordion tab card
 * into a single element. Clicking toggles the expanded detail section below.
 */
function TrackStatCard({
  track,
  open,
  onToggle,
}: {
  track: TrackSummary;
  open: boolean;
  onToggle: () => void;
}) {
  const counts = [
    track.outcomes.pending,
    track.outcomes.approved,
    track.outcomes.rejected,
  ];
  const pcts = toPercents(counts, track.total);

  return (
    <button
      type="button"
      id={`track-${track.track}`}
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={`track-${track.track}-detail`}
      aria-label={`${track.label}: ${track.total} submitted. ${open ? "Collapse" : "Expand"} details.`}
      className={cn(
        "group min-w-0 scroll-mt-40 rounded-2xl border bg-white p-6 text-left shadow-sm",
        "transition duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        "dark:bg-slate-900",
        open
          ? "border-primary/50 ring-1 ring-primary/20 dark:border-primary/50"
          : "border-slate-200/80 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700",
      )}
    >
      {/* Header: title + forms left, hero total right */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            <span className="truncate">{track.label}</span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 transition-transform duration-200",
                open ? "text-primary" : "-rotate-90 text-slate-400",
              )}
              aria-hidden
            />
          </p>
          <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
            {track.forms}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[32px] font-semibold leading-none tabular-nums text-slate-900 dark:text-white">
            <CountUp value={track.total} />
          </p>
          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
            Total submitted
          </p>
        </div>
      </div>

      {/* Stat columns: count, sentence-case label, muted percentage */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {STAT_META.map((meta, i) => (
          <div
            key={meta.key}
            className="min-w-0"
            title={`${meta.definition} ${counts[i]} of ${track.total} submitted.`}
          >
            <p
              className={cn(
                "text-[28px] font-semibold leading-none tabular-nums",
                meta.numClass,
              )}
            >
              <CountUp value={counts[i]} />
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <span
                className={cn("size-1.5 shrink-0 rounded-full", meta.dot)}
                aria-hidden
              />
              {meta.label}
            </p>
            <p className="mt-0.5 text-[13px] tabular-nums text-slate-400 dark:text-slate-500">
              {track.total > 0 ? `${pcts[i]}%` : "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Segmented proportion bar */}
      <div
        className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        aria-hidden
      >
        {STAT_META.map((meta, i) =>
          pcts[i] > 0 ? (
            <span
              key={meta.key}
              className={cn("h-full", meta.bar)}
              style={{ width: `${pcts[i]}%` }}
            />
          ) : null,
        )}
      </div>
    </button>
  );
}

export function TrackSummaryStrip({
  summary,
  visibleTracks,
  openTrack,
  onToggle,
}: {
  summary: DashboardSummary;
  visibleTracks: TrackKey[];
  openTrack: TrackKey | null;
  onToggle: (track: TrackKey) => void;
}) {
  return (
    <section
      aria-label="Submission tracks summary"
      className={cn(
        "grid min-w-0 grid-cols-1 gap-4 sm:gap-5",
        visibleTracks.length > 1 && "lg:grid-cols-3",
        visibleTracks.length === 2 && "lg:grid-cols-2",
      )}
    >
      {visibleTracks.map((track) => (
        <TrackStatCard
          key={track}
          track={summary.tracks[track]}
          open={openTrack === track}
          onToggle={() => onToggle(track)}
        />
      ))}
    </section>
  );
}
