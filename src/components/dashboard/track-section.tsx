"use client";

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
      className="flex min-w-0 flex-col items-center rounded-lg px-1 py-1.5 transition hover:bg-gray-1 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:hover:bg-dark-2"
    >
      <span className={cn("text-xl font-bold leading-none tabular-nums", colorClass)}>
        <CountUp value={value} />
      </span>
      <span className="mt-1 text-[11px] font-medium text-dark-5 dark:text-dark-6">
        {label}
      </span>
      <span className="text-[11px] font-semibold tabular-nums text-dark-6 dark:text-dark-6">
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
    <div className="min-w-0 rounded-xl border border-stroke px-4 py-3 dark:border-dark-3">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-dark-5 dark:text-dark-6">
          {decider.label}
        </p>
        {decider.decided > 0 && (
          <p
            className="text-[11px] font-medium tabular-nums text-dark-6"
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
          colorClass="text-red-600 dark:text-red-400"
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
        <p className="mt-1.5 border-t border-stroke pt-1.5 text-[11px] text-dark-5 dark:border-dark-3 dark:text-dark-6">
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
    red: "text-red-600 dark:text-red-400",
    neutral: "text-dark dark:text-white",
  };
  return (
    <div className="flex min-w-0 items-center gap-2" title={tooltip}>
      <Icon className={cn("size-4 shrink-0", tones[tone])} aria-hidden="true" />
      <span className="text-sm">
        <span className={cn("font-bold tabular-nums", tones[tone])}>{value}</span>{" "}
        <span className="text-dark-5 dark:text-dark-6">{label}</span>
      </span>
    </div>
  );
}

export function TrackSection({
  track,
  onDrill,
}: {
  track: TrackSummary;
  onDrill: (filter: DrillFilter) => void;
}) {
  const empty = track.total === 0;
  const deciderGrid =
    track.deciders.length >= 3
      ? "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
      : "grid grid-cols-1 gap-3 md:grid-cols-2";

  return (
    <section
      id={`track-${track.track}`}
      aria-labelledby={`track-${track.track}-title`}
      className="min-w-0 scroll-mt-40 rounded-[10px] border border-stroke bg-white px-4 py-5 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card sm:px-7.5"
    >
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3
            id={`track-${track.track}-title`}
            className="truncate text-body-2xlg font-bold text-dark dark:text-white"
          >
            {track.label}
          </h3>
          <p className="text-xs text-dark-5 dark:text-dark-6">
            {track.forms} · <span className="font-semibold tabular-nums">{track.total}</span>{" "}
            submitted in range
          </p>
        </div>
        <div className="shrink-0">
          <TrackSparkline trend={track.trend} />
        </div>
      </div>

      {empty ? (
        <p className="rounded-lg border border-dashed border-stroke px-4 py-8 text-center text-sm text-dark-5 dark:border-dark-3 dark:text-dark-6">
          No {track.label.toLowerCase()} submissions in this range.
        </p>
      ) : (
        <>
          <PipelineStepper track={track} onStageClick={(stage: StageKey) =>
            onDrill({
              track: track.track,
              outcome: "pending",
              stage,
              label: `Pending at ${STAGE_LABELS[stage]}`,
            })
          } />

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
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-stroke pt-4 dark:border-dark-3">
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
    </section>
  );
}
