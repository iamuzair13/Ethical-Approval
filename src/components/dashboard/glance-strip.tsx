"use client";

import type { DashboardSummary, TrackKey } from "./types";
import { TRACK_LABELS, TRACK_ORDER } from "./types";
import { CountUp } from "./count-up";

function pct(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0;
}

function GlanceCard({
  track,
  summary,
}: {
  track: TrackKey;
  summary: DashboardSummary["tracks"][TrackKey];
}) {
  const { pending, approved, rejected } = summary.outcomes;
  const pP = pct(pending, summary.total);
  const pA = pct(approved, summary.total);
  const pR = pct(rejected, summary.total);

  return (
    <a
      href={`#track-${track}`}
      className="group block rounded-[10px] border border-stroke bg-white px-4 py-3.5 shadow-1 transition hover:border-primary/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card"
      aria-label={`${TRACK_LABELS[track]}: ${summary.total} requests, ${pending} pending, ${approved} approved, ${rejected} rejected. Jump to section.`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-dark-5 group-hover:text-primary dark:text-dark-6">
            {TRACK_LABELS[track]}
          </p>
          <p className="text-[11px] text-dark-6 dark:text-dark-6">{summary.forms}</p>
        </div>
        <p className="text-2xl font-bold text-dark dark:text-white">
          <CountUp value={summary.total} />
        </p>
      </div>

      {/* Stacked outcome bar */}
      <div
        className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-gray-2 dark:bg-dark-3"
        role="img"
        aria-label={`Outcome split: ${pending} pending, ${approved} approved, ${rejected} rejected`}
      >
        {pending > 0 && <span className="bg-amber-500" style={{ width: `${pP}%` }} />}
        {approved > 0 && <span className="bg-emerald-500" style={{ width: `${pA}%` }} />}
        {rejected > 0 && <span className="bg-red-500" style={{ width: `${pR}%` }} />}
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px] font-medium">
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <span className="size-1.5 rounded-full bg-amber-500" /> {pending} pending
        </span>
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500" /> {approved} approved
        </span>
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <span className="size-1.5 rounded-full bg-red-500" /> {rejected} rejected
        </span>
      </div>
    </a>
  );
}

export function GlanceStrip({ summary }: { summary: DashboardSummary }) {
  return (
    <section aria-label="System at a glance" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {TRACK_ORDER.map((track) => (
        <GlanceCard key={track} track={track} summary={summary.tracks[track]} />
      ))}
    </section>
  );
}
