"use client";

import { cn } from "@/lib/utils";

export type ReportPeriod = "monthly" | "yearly";

export function ReportPeriodControl({
  period,
  onPeriodChange,
  year,
  onYearChange,
  month,
  onMonthChange,
  disabled,
}: {
  period: ReportPeriod;
  onPeriodChange: (p: ReportPeriod) => void;
  year: number;
  onYearChange: (y: number) => void;
  month: number;
  onMonthChange: (m: number) => void;
  disabled?: boolean;
}) {
  const yNow = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => yNow - i);

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end", disabled && "opacity-60")}>
      <div className="flex gap-1 rounded-lg border border-stroke p-1 dark:border-dark-3">
        {(["monthly", "yearly"] as const).map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onPeriodChange(p)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition",
              period === p
                ? "bg-primary text-white"
                : "text-dark hover:bg-gray-1 dark:text-white dark:hover:bg-dark-2",
            )}
          >
            {p === "monthly" ? "Monthly" : "Yearly"}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-dark-5 dark:text-dark-6">
          Year
        </span>
        <select
          disabled={disabled}
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm font-medium text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      {period === "monthly" ? (
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-dark-5 dark:text-dark-6">
            Month
          </span>
          <select
            disabled={disabled}
            value={month}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm font-medium text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" })}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
