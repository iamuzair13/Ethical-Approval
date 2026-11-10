"use client";

import type { DashboardFilterState, DatePreset, FilterOptions, TrackKey } from "./types";
import { cn } from "@/lib/utils";
import {
  TRACK_LABELS,
  TRACK_ORDER,
  defaultFilterState,
  rangeForPreset,
} from "./types";

export type { DashboardFilterState, DatePreset };

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom" },
];

const selectClass =
  "h-9 w-full min-w-0 truncate rounded-lg border border-stroke bg-white px-2.5 text-xs font-medium text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white sm:max-w-[170px]";

const labelClass =
  "flex min-w-0 flex-col gap-1 text-xs font-medium text-dark-5 dark:text-dark-6 sm:flex-row sm:items-center sm:gap-1.5";

export function DashboardFilterBar({
  filters,
  options,
  onChange,
}: {
  filters: DashboardFilterState;
  options: FilterOptions;
  onChange: (next: DashboardFilterState) => void;
}) {
  const departments = filters.facultyId
    ? options.departments.filter((d) => d.facultyId === filters.facultyId)
    : options.departments;
  const programs = filters.departmentId
    ? options.programs.filter((p) => p.departmentId === filters.departmentId)
    : filters.facultyId
      ? options.programs.filter((p) =>
          departments.some((d) => d.id === p.departmentId),
        )
      : options.programs;

  const setPreset = (preset: DatePreset) => {
    if (preset === "custom") {
      onChange({ ...filters, preset });
      return;
    }
    onChange({ ...filters, preset, ...rangeForPreset(preset) });
  };

  const setNum = (key: "facultyId" | "departmentId" | "programId") => (v: string) => {
    const n = v ? Number.parseInt(v, 10) : undefined;
    const next = { ...filters, [key]: Number.isInteger(n) ? n : undefined };
    if (key === "facultyId") {
      next.departmentId = undefined;
      next.programId = undefined;
    }
    if (key === "departmentId") next.programId = undefined;
    onChange(next);
  };

  return (
    <div className="min-w-0 rounded-[10px] border border-stroke bg-white px-4 py-3 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {/* Date presets — scroll horizontally on narrow screens; Reset stays put */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-none [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Date range"
          >
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p.key)}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
                  filters.preset === p.key
                    ? "bg-primary text-white"
                    : "text-dark-5 hover:bg-gray-2 dark:text-dark-6 dark:hover:bg-dark-2",
                )}
              >
                {p.label}
              </button>
            ))}
            {filters.preset === "custom" && (
              <span className="ml-1 flex shrink-0 items-center gap-1.5">
                <input
                  type="date"
                  aria-label="From date"
                  value={filters.from}
                  max={filters.to}
                  onChange={(e) => onChange({ ...filters, from: e.target.value })}
                  className={cn(selectClass, "px-1.5")}
                />
                <span className="text-xs text-dark-5 dark:text-dark-6">–</span>
                <input
                  type="date"
                  aria-label="To date"
                  value={filters.to}
                  min={filters.from}
                  onChange={(e) => onChange({ ...filters, to: e.target.value })}
                  className={cn(selectClass, "px-1.5")}
                />
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange(defaultFilterState())}
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stroke px-3 py-1.5 text-xs font-semibold text-dark transition hover:bg-gray-2 sm:ml-0 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
          >
            Reset
          </button>
        </div>

        {/* Org selects — 2-col grid on mobile, inline on sm+ */}
        <div className="grid w-full grid-cols-2 gap-2 sm:contents">
          <span className="hidden h-5 w-px bg-stroke sm:block dark:bg-dark-3" />

          <label className={labelClass}>
            Faculty
            <select
              aria-label="Filter by faculty"
              value={filters.facultyId ?? ""}
              onChange={(e) => setNum("facultyId")(e.target.value)}
              className={selectClass}
            >
              <option value="">All</option>
              {options.faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Department
            <select
              aria-label="Filter by department"
              value={filters.departmentId ?? ""}
              onChange={(e) => setNum("departmentId")(e.target.value)}
              className={selectClass}
            >
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Program
            <select
              aria-label="Filter by program"
              value={filters.programId ?? ""}
              onChange={(e) => setNum("programId")(e.target.value)}
              className={selectClass}
            >
              <option value="">All</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Track
            <select
              aria-label="Filter by track"
              value={filters.track ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  track: (e.target.value || undefined) as TrackKey | undefined,
                })
              }
              className={selectClass}
            >
              <option value="">All</option>
              {TRACK_ORDER.map((t) => (
                <option key={t} value={t}>
                  {TRACK_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
