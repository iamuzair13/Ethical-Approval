"use client";

import { ChevronDown } from "lucide-react";
import type { StageKey, TrackSummary } from "./types";
import { STAGE_LABELS } from "./types";
import { PipelineStepper } from "./pipeline-stepper";
import { TrackSparkline, TrackTrend } from "./track-trend";
import { CountUp } from "./count-up";
import type { DrillFilter } from "@/app/(home)/_components/leads-report-tabs";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ShieldAlert,
  UserX,
  Clock,
  type LucideIcon,
} from "lucide-react";

/** One-line outcome summary shown when the section is collapsed. */
function CollapsedSummary({ track }: { track: TrackSummary }) {
  const { pending, approved, rejected } = track.outcomes;
  return (
    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-medium">
      <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
        <span className="size-1.5 rounded-full bg-amber-500" />
        {pending} pending
      </span>
      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        {approved} approved
      </span>
      <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
        <span className="size-1.5 rounded-full bg-rose-500" />
        {rejected} rejected
      </span>
    </span>
  );
}

const OUTCOME_TOOLTIPS = {
  pending: "Currently waiting for a decision by this body.",
  approved: "Finally approved — for HOD this means moved past the HOD stage.",
  rejected: "Finally rejected at this stage (terminal for the application).",
};

function OutcomeNumber({
  value,
  label,
  pct,
  colorClass,
  tooltip,
  onClick,
}: {
  value: number;
  label: string;
  /** Percentage text shown under the label, e.g. "33%". */
  pct: string;
  colorClass: string;
  tooltip: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${tooltip}${onClick ? " Click to filter the requests table." : ""}`}
      className="flex min-w-0 flex-col items-center rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-slate-800"
    >
      <span className={cn("text-2xl font-semibold leading-none tabular-nums", colorClass)}>
        <CountUp value={value} />
      </span>
      <span className="mt-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
        {pct}
      </span>
    </button>
  );
}

function pctOf(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}

function DeciderBlock({
  track,
  decider,
  onDrill,
}: {
  track: TrackSummary;
  decider: TrackSummary["deciders"][number];
  onDrill: (filter: DrillFilter) => void;
}) {
  const stage = decider.key;
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-4 py-3.5 dark:bg-slate-800/50">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
        <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
          {decider.label}
        </p>
        {decider.decided > 0 && (
          <p
            className="text-xs font-medium tabular-nums text-slate-400 dark:text-slate-500"
            title={`${decider.approved} approved of ${decider.decided} decided at this stage`}
          >
            {decider.approvalRate}% approved · {decider.decided} decided
          </p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1">
        <OutcomeNumber
          value={decider.pending}
          label="Pending"
          pct={pctOf(decider.pending, track.total)}
          colorClass="text-amber-600 dark:text-amber-400"
          tooltip={`${OUTCOME_TOOLTIPS.pending} ${decider.pending} of ${track.total} submitted.`}
          onClick={() =>
            onDrill({
              track: track.track,
              outcome: "pending",
              stage,
              label: `Pending at ${decider.label}`,
            })
          }
        />
        <OutcomeNumber
          value={decider.approved}
          label="Approved"
          pct={pctOf(decider.approved, decider.decided)}
          colorClass="text-emerald-600 dark:text-emerald-400"
          tooltip={`${OUTCOME_TOOLTIPS.approved} ${decider.approved} of ${decider.decided} decided by ${decider.label}.`}
          onClick={() =>
            onDrill({
              track: track.track,
              outcome: "approved",
              decidedBy: stage,
              label: `Approved by ${decider.label}`,
            })
          }
        />
        <OutcomeNumber
          value={decider.rejected}
          label="Rejected"
          pct={pctOf(decider.rejected, decider.decided)}
          colorClass="text-rose-600 dark:text-rose-400"
          tooltip={`${OUTCOME_TOOLTIPS.rejected} ${decider.rejected} of ${decider.decided} decided by ${decider.label}.`}
          onClick={() =>
            onDrill({
              track: track.track,
              outcome: "rejected",
              decidedBy: stage,
              label: `Rejected by ${decider.label}`,
            })
          }
        />
      </div>
      {decider.forwarded > 0 && (
        <p className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {decider.forwarded} forwarded to IREB (recommended / marked sensitive)
        </p>
      )}
    </div>
  );
}

function MiniFact({
  icon: Icon,
  value,
  label,
  tone,
  tooltip,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  tone: "amber" | "red" | "neutral";
  tooltip: string;
}) {
  const tones = {
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-rose-600 dark:text-rose-400",
    neutral: "text-slate-900 dark:text-white",
  };
  return (
    <div className="flex min-w-0 items-center gap-2" title={tooltip}>
      <Icon className={cn("size-4 shrink-0", tones[tone])} aria-hidden="true" />
      <span className="text-sm">
        <span className={cn("font-semibold tabular-nums", tones[tone])}>{value}</span>{" "}
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
      </span>
    </div>
  );
}

export function TrackSection({
  track,
  open,
  onToggle,
  onDrill,
}: {
  track: TrackSummary;
  /** Controlled by the parent board — only one section is open at a time. */
  open: boolean;
  onToggle: () => void;
  onDrill: (filter: DrillFilter) => void;
}) {
  const empty = track.total === 0;
  const deciderGrid =
    track.deciders.length >= 3
      ? "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
      : "grid grid-cols-1 gap-3 md:grid-cols-2";
  const bodyId = `track-${track.track}-body`;

  return (
    <section
      id={`track-${track.track}-detail`}
      aria-labelledby={`track-${track.track}-title`}
      className="w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Header — click toggles the section body */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className="group flex min-w-0 items-center gap-2 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ChevronDown
            className={cn(
              "size-5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500",
              !open && "-rotate-90",
            )}
            aria-hidden="true"
          />
          <span className="min-w-0">
            <h3
              id={`track-${track.track}-title`}
              className="truncate text-lg font-semibold tracking-tight text-slate-900 group-hover:text-primary dark:text-white"
            >
              {track.label}
            </h3>
            <span className="block text-[13px] text-slate-500 dark:text-slate-400">
              {track.forms} ·{" "}
              <span className="font-semibold tabular-nums">{track.total}</span>{" "}
              submitted in range
            </span>
            {!open && <CollapsedSummary track={track} />}
          </span>
        </button>
        {open && (
          <div className="shrink-0">
            <TrackSparkline trend={track.trend} />
          </div>
        )}
      </div>

      {/* Collapsible body — grid-rows trick animates without measuring height */}
      <div
        id={bodyId}
        className={cn(
          "grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          {empty ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No {track.label.toLowerCase()} submissions in this range.
            </p>
          ) : (
            <>
              <div className="mt-4">
                <PipelineStepper track={track} onStageClick={(stage: StageKey) =>
                  onDrill({
                    track: track.track,
                    outcome: "pending",
                    stage,
                    label: `Pending at ${STAGE_LABELS[stage]}`,
                  })
                } />
              </div>

              {/* Outcome blocks per deciding body */}
              <div className={cn("mt-4", deciderGrid)}>
                {track.deciders.map((d) => (
                  <DeciderBlock key={d.key} track={track} decider={d} onDrill={onDrill} />
                ))}
              </div>

              {/* Trend */}
              <div className="mt-5 min-w-0">
                <TrackTrend trend={track.trend} trackLabel={track.label} />
              </div>

              {/* Mini facts */}
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <MiniFact
                  icon={ShieldAlert}
                  value={String(track.sensitiveCount)}
                  label="sensitive cases"
                  tone={track.sensitiveCount > 0 ? "amber" : "neutral"}
                  tooltip="Submissions flagged as sensitive (visible to Administrator + IREB only)."
                />
                <MiniFact
                  icon={UserX}
                  value={String(track.unassignedIrebCount)}
                  label="unassigned to an IREB member"
                  tone={track.unassignedIrebCount > 0 ? "amber" : "neutral"}
                  tooltip="Items in IREB review with no specific IREB member assigned yet."
                />
                <MiniFact
                  icon={Clock}
                  value={track.avgDaysToDecision != null ? `${track.avgDaysToDecision}d` : "—"}
                  label="avg days to decision"
                  tone="neutral"
                  tooltip="Average days from submission to the final approve/reject decision."
                />
                <MiniFact
                  icon={AlertTriangle}
                  value={String(track.aging.overThreshold)}
                  label={`waiting > ${track.aging.thresholdDays}d`}
                  tone={track.aging.overThreshold > 0 ? "red" : "neutral"}
                  tooltip={`Items pending longer than ${track.aging.thresholdDays} days in their current stage.`}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
