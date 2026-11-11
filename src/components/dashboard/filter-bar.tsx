"use client";

import type { DashboardFilterState, DatePreset, FilterOptions, TrackKey } from "./types";
import { cn } from "@/lib/utils";
import {
  TRACK_LABELS,
  TRACK_ORDER,
  defaultFilterState,
  rangeForPreset,
} from "./types";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SegmentedControl } from "./primitives";
import { RotateCcw } from "lucide-react";

export type { DashboardFilterState, DatePreset };

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom" },
];

const selectTrigger =
  "h-11 border-slate-200 bg-white px-3.5 text-sm font-normal text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600";

const dateInputClass =
  "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";

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

  const allOption = [{ value: "", label: "All" }];

  return (
    <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      {/* Date range + reset */}
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          ariaLabel="Date range"
          value={filters.preset}
          onChange={setPreset}
          options={PRESETS.map((p) => ({ value: p.key, label: p.label }))}
        />

        {filters.preset === "custom" && (
          <span className="flex items-center gap-2">
            <input
              type="date"
              aria-label="From date"
              value={filters.from}
              max={filters.to}
              onChange={(e) => onChange({ ...filters, from: e.target.value })}
              className={dateInputClass}
            />
            <span className="text-sm text-slate-400" aria-hidden>
              –
            </span>
            <input
              type="date"
              aria-label="To date"
              value={filters.to}
              min={filters.from}
              onChange={(e) => onChange({ ...filters, to: e.target.value })}
              className={dateInputClass}
            />
          </span>
        )}

        <button
          type="button"
          onClick={() => onChange(defaultFilterState())}
          className="ml-auto inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Reset
        </button>
      </div>

      {/* Organization filters */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SearchableSelect
          label="Faculty"
          placeholder="All"
          searchPlaceholder="Search faculties…"
          options={[
            ...allOption,
            ...options.faculties.map((f) => ({ value: String(f.id), label: f.name })),
          ]}
          value={filters.facultyId ? String(filters.facultyId) : ""}
          onChange={setNum("facultyId")}
          triggerClassName={selectTrigger}
        />
        <SearchableSelect
          label="Department"
          placeholder="All"
          searchPlaceholder="Search departments…"
          options={[
            ...allOption,
            ...departments.map((d) => ({ value: String(d.id), label: d.name })),
          ]}
          value={filters.departmentId ? String(filters.departmentId) : ""}
          onChange={setNum("departmentId")}
          triggerClassName={selectTrigger}
        />
        <SearchableSelect
          label="Program"
          placeholder="All"
          searchPlaceholder="Search programs…"
          options={[
            ...allOption,
            ...programs.map((p) => ({ value: String(p.id), label: p.name })),
          ]}
          value={filters.programId ? String(filters.programId) : ""}
          onChange={setNum("programId")}
          triggerClassName={selectTrigger}
        />
        <SearchableSelect
          label="Track"
          placeholder="All"
          searchPlaceholder="Search tracks…"
          options={[
            ...allOption,
            ...TRACK_ORDER.map((t) => ({ value: t, label: TRACK_LABELS[t] })),
          ]}
          value={filters.track ?? ""}
          onChange={(v) =>
            onChange({
              ...filters,
              track: (v || undefined) as TrackKey | undefined,
            })
          }
          triggerClassName={selectTrigger}
        />
      </div>
    </div>
  );
}
