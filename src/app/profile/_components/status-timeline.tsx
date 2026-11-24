"use client";

import { cn } from "@/lib/utils";

/**
 * Application lifecycle: two decision gates, not a flat checklist.
 *
 *   Submitted → HOD review → IREB review
 *
 * Each gate resolves to exactly ONE outcome — approved, rejected
 * (terminal), in review, or not reached. Rejection is an outcome of a
 * gate, never a step on the path, so a rejected application can't show
 * as "passed" the way a sequential checklist did.
 */

type StepState = "done" | "active" | "rejected" | "pending";

type Step = {
  label: string;
  state: StepState;
  detail: string;
};

function buildSteps(currentStage: string): Step[] {
  const submitted: Step = { label: "Submitted", state: "done", detail: "" };
  const waiting: Step = { label: "IREB review", state: "pending", detail: "Waiting" };

  if (currentStage.includes("Rejected by HOD")) {
    return [
      submitted,
      { label: "HOD review", state: "rejected", detail: "Rejected" },
      { label: "IREB review", state: "pending", detail: "Not reached" },
    ];
  }
  if (currentStage === "Rejected by IREB" || currentStage === "Rejected") {
    return [
      submitted,
      { label: "HOD review", state: "done", detail: "Approved" },
      { label: "IREB review", state: "rejected", detail: "Rejected" },
    ];
  }
  if (currentStage === "Approved by IREB" || currentStage === "Approved") {
    return [
      submitted,
      { label: "HOD review", state: "done", detail: "Approved" },
      { label: "IREB review", state: "done", detail: "Approved" },
    ];
  }
  if (
    currentStage === "Under Review by IREB" ||
    currentStage === "Under Review by Administrator"
  ) {
    return [
      submitted,
      { label: "HOD review", state: "done", detail: "Approved" },
      { label: "IREB review", state: "active", detail: "In review" },
    ];
  }
  if (currentStage === "Approved by HOD") {
    return [
      submitted,
      { label: "HOD review", state: "done", detail: "Approved" },
      waiting,
    ];
  }
  if (currentStage === "HOD not Assigned") {
    return [
      submitted,
      { label: "HOD review", state: "active", detail: "Awaiting assignment" },
      waiting,
    ];
  }
  if (currentStage.startsWith("Under Review by")) {
    const hodName = currentStage.replace("Under Review by ", "").trim();
    return [
      submitted,
      {
        label: "HOD review",
        state: "active",
        detail: hodName ? `With ${hodName}` : "In review",
      },
      waiting,
    ];
  }
  return [
    submitted,
    { label: "HOD review", state: "active", detail: "In review" },
    waiting,
  ];
}

function StepNode({ state }: { state: StepState }) {
  const base =
    "relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-300";
  if (state === "done") {
    return (
      <span className={cn(base, "bg-emerald-500 text-white")}>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (state === "rejected") {
    return (
      <span className={cn(base, "bg-red-500 text-white")}>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className={cn(base, "bg-indigo-500 text-white ring-4 ring-indigo-500/20")}>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        base,
        "border border-stroke bg-gray-3 text-dark-6 dark:border-white/10 dark:bg-slate-800 dark:text-slate-500",
      )}
    >
      <span className="h-1 w-1 rounded-full bg-dark-5 dark:bg-slate-600" />
    </span>
  );
}

export function StatusTimeline({
  currentStage,
  submittedOn,
  feedback,
}: {
  currentStage: string;
  submittedOn?: string;
  feedback?: string | null;
}) {
  const steps = buildSteps(currentStage);
  const rejected = steps.some((s) => s.state === "rejected");

  return (
    <div>
      <div className="flex items-start px-2">
        {steps.map((step, index) => (
          <div key={step.label} className="contents">
            {index > 0 && (
              <div
                className={cn(
                  "mt-[9px] h-px flex-1",
                  steps[index - 1].state === "done"
                    ? "bg-emerald-500/40"
                    : steps[index - 1].state === "rejected"
                      ? "bg-red-500/40"
                      : "bg-gray-3 dark:bg-white/10",
                )}
                aria-hidden
              />
            )}
            <div className="flex w-24 flex-col items-center text-center sm:w-28">
              <StepNode state={step.state} />
              <span
                className={cn(
                  "mt-2 text-xs font-medium",
                  step.state === "active" && "font-semibold text-dark dark:text-white",
                  step.state === "done" && "text-dark dark:text-slate-300",
                  step.state === "rejected" && "font-semibold text-red-500",
                  step.state === "pending" && "text-dark-6 dark:text-slate-600",
                )}
              >
                {step.label}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-[11px] leading-tight",
                  step.state === "rejected"
                    ? "text-red-500/80"
                    : "text-dark-5 dark:text-slate-500",
                )}
              >
                {step.label === "Submitted" && submittedOn ? submittedOn : step.detail}
              </span>
            </div>
          </div>
        ))}
      </div>

      {rejected && feedback && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <span className="font-semibold">Feedback: </span>
          {feedback}
        </div>
      )}
    </div>
  );
}

/**
 * Micro gate-track for dense surfaces (ledger rows). Renders the same
 * three-gate model as StatusTimeline — Submitted → HOD → IREB — as
 * connected dots so a row can show pipeline position, not a text blob.
 */
export function GateTrack({ currentStage }: { currentStage: string }) {
  const steps = buildSteps(currentStage);
  const dotCls = (state: StepState) =>
    state === "done"
      ? "bg-emerald-500"
      : state === "rejected"
        ? "bg-red-500"
        : state === "active"
          ? "bg-indigo-500"
          : "bg-gray-300 dark:bg-gray-600";
  const connCls = (prev: StepState) =>
    prev === "done"
      ? "bg-emerald-500/40"
      : prev === "rejected"
        ? "bg-red-500/40"
        : "bg-gray-300 dark:bg-gray-600";
  return (
    <span className="flex items-center" aria-hidden>
      {steps.map((step, i) => (
        <span key={step.label} className="flex items-center">
          {i > 0 && (
            <span className={cn("h-px w-4", connCls(steps[i - 1].state))} />
          )}
          <span
            className={cn(
              "size-2 rounded-full",
              dotCls(step.state),
              step.state === "active" && "animate-pulse",
            )}
          />
        </span>
      ))}
    </span>
  );
}

/**
 * Compact status chip for card headers — shows where the application
 * stands without opening the timeline.
 */
export function StageChip({ currentStage }: { currentStage: string }) {
  const stage =
    currentStage === "Rejected by IREB" || currentStage === "Rejected"
      ? { label: "Rejected", cls: "bg-red-500/10 text-red-500 border-red-500/20" }
      : currentStage === "Approved by IREB" || currentStage === "Approved"
        ? {
            label: "Approved",
            cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
          }
        : currentStage.includes("Rejected")
          ? {
              label: "Rejected at HOD",
              cls: "bg-red-500/10 text-red-500 border-red-500/20",
            }
          : currentStage === "Under Review by IREB" ||
              currentStage === "Under Review by Administrator" ||
              currentStage === "Approved by HOD"
            ? {
                label: "IREB review",
                cls: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
              }
            : {
                label: "HOD review",
                cls: "bg-amber-500/10 text-amber-500 border-amber-500/20",
              };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        stage.cls,
      )}
    >
      {stage.label}
    </span>
  );
}
