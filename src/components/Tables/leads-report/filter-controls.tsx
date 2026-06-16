"use client";

import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Filter, X } from "lucide-react";
import { useState } from "react";
import type { CountEntry } from "./types";

type FilterMenuProps =
  | {
      label: string;
      multiple?: false;
      value: string | null;
      options: CountEntry[];
      totalCount: number;
      onChange: (next: string | null) => void;
    }
  | {
      label: string;
      multiple: true;
      value: string[];
      options: CountEntry[];
      totalCount: number;
      onChange: (next: string[]) => void;
    };

export function FilterMenu(props: FilterMenuProps) {
  const { label, options, totalCount } = props;
  const multiple = props.multiple === true;
  const [isOpen, setIsOpen] = useState(false);

  const selectedValues: string[] = multiple
    ? props.value
    : props.value
      ? [props.value]
      : [];
  const hasSelection = selectedValues.length > 0;

  const triggerLabel = (() => {
    if (!hasSelection) return label;
    if (multiple) {
      if (selectedValues.length === 1) return selectedValues[0];
      return `${selectedValues.length} selected`;
    }
    return selectedValues[0];
  })();

  const clearSelection = () => {
    if (props.multiple) {
      props.onChange([]);
      return;
    }
    props.onChange(null);
  };

  const toggleOption = (optionValue: string) => {
    if (props.multiple) {
      const current = props.value;
      props.onChange(
        current.includes(optionValue)
          ? current.filter((item) => item !== optionValue)
          : [...current, optionValue],
      );
      return;
    }

    props.onChange(optionValue === props.value ? null : optionValue);
    setIsOpen(false);
  };

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger
        className={cn(
          "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/30 active:scale-[0.98]",
          hasSelection
            ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
        )}
        aria-label={`Filter by ${label}`}
        aria-expanded={isOpen}
      >
        {hasSelection && (
          <span className="size-1.5 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" aria-hidden />
        )}
        {!hasSelection && <Filter className="size-3.5 shrink-0 text-gray-400" aria-hidden />}
        <span className="max-w-48 truncate font-medium">{triggerLabel}</span>
        {hasSelection && (
          <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-xs font-semibold text-white dark:bg-blue-500">
            {selectedValues.length}
          </span>
        )}
        <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
      </DropdownTrigger>
      <DropdownContent
        align="end"
        className="z-30 mt-1 max-h-72 w-64 overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      >
        <button
          type="button"
          onClick={() => {
            clearSelection();
            if (!multiple) setIsOpen(false);
          }}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-md px-3 py-1.5 text-left text-xs font-medium transition",
            !hasSelection
              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
              : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700",
          )}
        >
          <span>All {label}s</span>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {totalCount}
          </span>
        </button>
        {options.length === 0 ? (
          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
            No values to filter by.
          </div>
        ) : (
          options.map((entry) => {
            const isSelected = selectedValues.includes(entry.value);
            return (
              <button
                key={entry.value}
                type="button"
                onClick={() => toggleOption(entry.value)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md px-3 py-1.5 text-left text-xs font-medium transition",
                  isSelected
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {multiple && (
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded border",
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-300 dark:border-gray-600",
                      )}
                      aria-hidden
                    >
                      {isSelected && <Check className="size-2.5" />}
                    </span>
                  )}
                  <span className="truncate">{entry.value}</span>
                </span>
                <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  {entry.count}
                </span>
              </button>
            );
          })
        )}
      </DropdownContent>
    </Dropdown>
  );
}

export function FilterChip({
  label,
  value,
  onClear,
}: {
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
      <span className="font-semibold uppercase tracking-wide opacity-70">{label}:</span>
      <span className="max-w-48 truncate">{value}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear ${label} filter`}
        className="ml-0.5 -mr-0.5 rounded-full p-0.5 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:hover:bg-blue-900/50"
      >
        <X className="size-3" aria-hidden />
      </button>
    </span>
  );
}

type ActiveFiltersBarProps = {
  facultyFilter: string[];
  departmentFilter: string[];
  currentStatusFilter: string[];
  onClearFaculty: (value: string) => void;
  onClearDepartment: (value: string) => void;
  onClearStatus: (value: string) => void;
  onClearAll: () => void;
};

export function ActiveFiltersBar({
  facultyFilter,
  departmentFilter,
  currentStatusFilter,
  onClearFaculty,
  onClearDepartment,
  onClearStatus,
  onClearAll,
}: ActiveFiltersBarProps) {
  const hasFilters =
    facultyFilter.length + departmentFilter.length + currentStatusFilter.length > 0;

  if (!hasFilters) return null;

  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
        Active filters:
      </span>
      <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-1">
        {facultyFilter.map((value) => (
          <FilterChip
            key={`faculty-${value}`}
            label="Faculty"
            value={value}
            onClear={() => onClearFaculty(value)}
          />
        ))}
        {departmentFilter.map((value) => (
          <FilterChip
            key={`department-${value}`}
            label="Department"
            value={value}
            onClear={() => onClearDepartment(value)}
          />
        ))}
        {currentStatusFilter.map((value) => (
          <FilterChip
            key={`status-${value}`}
            label="Current Status"
            value={value}
            onClear={() => onClearStatus(value)}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onClearAll}
        className="shrink-0 text-xs font-medium text-blue-600 underline transition hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Clear all
      </button>
    </div>
  );
}
