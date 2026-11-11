"use client";

import { cn } from "@/lib/utils";

/* ============================================================
   Shared dashboard primitives — one place for the quiet,
   neutral-first control styles used across the dashboard.
   ============================================================ */

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  /** Optional muted count badge shown after the label. */
  count?: number;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** "neutral" = white pill; "brand" = active item gets brand text. */
  accent?: "neutral" | "brand";
  className?: string;
};

/** Quiet segmented control — slate track, white (or brand-tinted) active pill. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  accent = "neutral",
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-slate-100 p-1 no-scrollbar dark:bg-slate-800",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 text-sm font-medium transition-colors duration-150",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              active
                ? accent === "brand"
                  ? "bg-white font-semibold text-primary shadow-sm dark:bg-slate-950 dark:text-indigo-300"
                  : "bg-white font-semibold text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cn(
                  "inline-flex min-w-[1.375rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums leading-5",
                  active
                    ? accent === "brand"
                      ? "bg-primary/10 text-primary dark:text-indigo-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    : "bg-slate-200/70 text-slate-500 dark:bg-slate-700 dark:text-slate-300",
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Soft status pill — muted dot + text, no heavy fills. */
export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: "pending" | "approved" | "rejected" | "neutral";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    pending:
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300",
    approved:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300",
    rejected:
      "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300",
    neutral:
      "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300",
  };
  const dots = {
    pending: "bg-amber-500",
    approved: "bg-emerald-500",
    rejected: "bg-rose-500",
    neutral: "bg-slate-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dots[tone])} aria-hidden />
      {children}
    </span>
  );
}
