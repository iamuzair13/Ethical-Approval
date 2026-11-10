"use client";

import type { StageKey, TrackSummary } from "./types";
import { STAGE_LABELS } from "./types";
import { CountUp } from "./count-up";
import { cn } from "@/lib/utils";

const STAGE_TOOLTIPS: Record<StageKey, string> = {
  hod: "Items waiting for the assigned Head of Department to approve or reject.",
  admin: "Items waiting for the Administrator (IREB Chairman) to review, finalize, or forward to IREB.",
  ireb: "Items waiting for an IREB member to approve or reject.",
};

function agingTone(avgDays: number | null, overThreshold: number): "green" | "amber" | "red" {
  if (overThreshold > 0 || (avgDays !== null && avgDays > 7)) return "red";
  if (avgDays !== null && avgDays > 3) return "amber";
  return "green";
}

const TONE_CLASSES = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
} as const;

export function PipelineStepper({
  track,
  onStageClick,
}: {
  track: TrackSummary;
  onStageClick: (stage: StageKey) => void;
}) {
  const nodes = track.stages.map((stage) => ({
    stage,
    waiting: track.stageCounts[stage] ?? 0,
    entered: track.funnel.find((f) => f.stage === stage)?.entered ?? 0,
    aging: track.agingByStage[stage],
  }));
  const decided = track.outcomes.approved + track.outcomes.rejected;

  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-0"
      role="list"
      aria-label={`${track.label} approval pipeline`}
    >
      {nodes.map((node, i) => {
        const tone = agingTone(node.aging?.avgDays ?? null, node.aging?.overThreshold ?? 0);
        return (
          <div key={node.stage} className="flex items-center sm:flex-1" role="listitem">
            {i > 0 && (
              <div
                className="hidden w-9 shrink-0 flex-col items-center justify-center sm:flex"
                aria-hidden="true"
                title={`${node.entered} reached ${STAGE_LABELS[node.stage]}`}
              >
                <span className="whitespace-nowrap text-[10px] font-bold text-dark-6">
                  {node.entered}
                </span>
                <svg className="size-3.5 text-stroke dark:text-dark-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            )}
            <button
              type="button"
              onClick={() => onStageClick(node.stage)}
              title={`${STAGE_TOOLTIPS[node.stage]} Click to filter the requests table.`}
              className={cn(
                "group flex min-h-[92px] w-full flex-col items-center justify-center rounded-xl border px-3 py-3 text-center transition",
                "border-stroke bg-gray-1 hover:border-primary/50 hover:shadow-sm",
                "dark:border-dark-3 dark:bg-dark-2 dark:hover:border-primary/50",
                "focus:outline-none focus:ring-2 focus:ring-primary/40",
              )}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-dark-5 dark:text-dark-6">
                {STAGE_LABELS[node.stage]}
              </span>
              <span className="mt-1 text-2xl font-bold leading-none text-dark dark:text-white">
                <CountUp value={node.waiting} />
              </span>
              <span className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium">
                <span
                  className={cn("inline-block size-2 rounded-full", TONE_CLASSES[tone])}
                  aria-hidden="true"
                />
                <span className="text-dark-6 dark:text-dark-6">
                  {node.aging?.avgDays != null ? `avg ${node.aging.avgDays}d` : "—"}
                  {(node.aging?.overThreshold ?? 0) > 0 && (
                    <span className="text-red-600 dark:text-red-400">
                      {" "}· {node.aging!.overThreshold} &gt;7d
                    </span>
                  )}
                </span>
              </span>
            </button>
          </div>
        );
      })}

      {/* Decision terminal node */}
      <div className="flex items-center sm:flex-1" role="listitem">
        <div
          className="hidden w-9 shrink-0 flex-col items-center justify-center sm:flex"
          aria-hidden="true"
          title={`${decided} reached a final decision`}
        >
          <span className="whitespace-nowrap text-[10px] font-bold text-dark-6">
            {decided}
          </span>
          <svg className="size-3.5 text-stroke dark:text-dark-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6" /></svg>
        </div>
        <div className="flex min-h-[92px] w-full flex-col items-center justify-center rounded-xl border border-stroke bg-gray-1 px-3 py-3 text-center dark:border-dark-3 dark:bg-dark-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-dark-5 dark:text-dark-6">
            Decision
          </span>
          <span className="mt-1 text-2xl font-bold leading-none text-dark dark:text-white">
            <CountUp value={decided} />
          </span>
          <span className="mt-1.5 flex items-center gap-2 text-[11px] font-medium">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {track.outcomes.approved}
            </span>
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <span className="size-1.5 rounded-full bg-red-500" />
              {track.outcomes.rejected}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
