"use client";

import { Fragment } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
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
  red: "bg-rose-500",
} as const;

/** Connector between pipeline nodes — horizontal on lg+, vertical below. */
function FlowConnector({ entered }: { entered: number }) {
  return (
    <>
      <div
        className="hidden w-9 shrink-0 flex-col items-center justify-center lg:flex"
        aria-hidden="true"
        title={`${entered} reached this stage`}
      >
        <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-slate-400 dark:text-slate-500">
          {entered}
        </span>
        <ChevronRight className="size-3.5 text-slate-300 dark:text-slate-600" />
      </div>
      <div
        className="flex items-center justify-center gap-1 py-1 lg:hidden"
        aria-hidden="true"
        title={`${entered} reached this stage`}
      >
        <ChevronDown className="size-3.5 text-slate-300 dark:text-slate-600" />
        <span className="text-xs font-semibold tabular-nums text-slate-400 dark:text-slate-500">{entered}</span>
      </div>
    </>
  );
}

const NODE_BASE =
  "flex min-h-[88px] w-full min-w-0 flex-col items-center justify-center rounded-xl bg-slate-50 px-3 py-3 text-center dark:bg-slate-800/50";

export function PipelineStepper({
  track,
  onStageClick,
}: {
  track: TrackSummary;
  onStageClick: (stage: StageKey) => void;
}) {
  const decided = track.outcomes.approved + track.outcomes.rejected;

  return (
    <div
      className="flex flex-col lg:flex-row lg:items-stretch"
      role="list"
      aria-label={`${track.label} approval pipeline`}
    >
      {track.stages.map((stage, i) => {
        const waiting = track.stageCounts[stage] ?? 0;
        const entered = track.funnel.find((f) => f.stage === stage)?.entered ?? 0;
        const aging = track.agingByStage[stage];
        const tone = agingTone(aging?.avgDays ?? null, aging?.overThreshold ?? 0);
        return (
          <Fragment key={stage}>
            {i > 0 && <FlowConnector entered={entered} />}
            <div className="lg:flex-1 lg:min-w-0" role="listitem">
              <button
                type="button"
                onClick={() => onStageClick(stage)}
                title={`${STAGE_TOOLTIPS[stage]} Click to filter the requests table.`}
                className={cn(
                  NODE_BASE,
                  "transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-800",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                )}
              >
                <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  {STAGE_LABELS[stage]}
                </span>
                <span className="mt-1.5 text-2xl font-semibold leading-none tabular-nums text-slate-900 dark:text-white">
                  <CountUp value={waiting} />
                </span>
                <span className="mt-1.5 flex flex-wrap items-center justify-center gap-x-1.5 text-xs font-medium">
                  <span
                    className={cn("inline-block size-1.5 rounded-full", TONE_CLASSES[tone])}
                    aria-hidden="true"
                  />
                  <span className="text-slate-400 dark:text-slate-500">
                    {aging?.avgDays != null ? `avg ${aging.avgDays}d` : "—"}
                    {(aging?.overThreshold ?? 0) > 0 && (
                      <span className="text-rose-600 dark:text-rose-400">
                        {" "}· {aging!.overThreshold} &gt;7d
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </div>
          </Fragment>
        );
      })}

      {/* Decision terminal node */}
      <FlowConnector entered={decided} />
      <div className="lg:flex-1 lg:min-w-0" role="listitem">
        <div className={NODE_BASE}>
          <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
            Decision
          </span>
          <span className="mt-1.5 text-2xl font-semibold leading-none tabular-nums text-slate-900 dark:text-white">
            <CountUp value={decided} />
          </span>
          <span className="mt-1.5 flex items-center gap-3 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {track.outcomes.approved}
            </span>
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <span className="size-1.5 rounded-full bg-rose-500" />
              {track.outcomes.rejected}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
