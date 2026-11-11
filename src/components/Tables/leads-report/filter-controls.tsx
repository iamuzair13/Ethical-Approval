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
          "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-sm transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          hasSelection
            ? "border-primary/30 bg-primary/5 text-primary dark:border-primary/40 dark:bg-primary/10 dark:text-indigo-300"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
        )}
        aria-label={`Filter by ${label}`}
        aria-expanded={isOpen}
      >
        {hasSelection && (
          <span className="size-1.5 shrink-0 rounded-full bg-primary dark:bg-indigo-400" aria-hidden />
        )}
        {!hasSelection && <Filter className="size-3.5 shrink-0 text-slate-400" aria-hidden />}
        <span className="max-w-48 truncate font-medium">{triggerLabel}</span>
        {hasSelection && (
          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary dark:text-indigo-300">
            {selectedValues.length}
          </span>
        )}
        <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
      </DropdownTrigger>
      <DropdownContent
        align="end"
        className="z-30 mt-1 max-h-72 w-64 overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
      >
        <button
          type="button"
          onClick={() => {
            clearSelection();
            if (!multiple) setIsOpen(false);
          }}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors",
            !hasSelection
              ? "bg-primary/5 text-primary dark:bg-primary/10 dark:text-indigo-300"
              : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800",
          )}
        >
          <span>All {label}s</span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {totalCount}
          </span>
        </button>
        {options.length === 0 ? (
          <div className="px-3 py-2 text-[13px] text-slate-500 dark:text-slate-400">
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
                  "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors",
                  isSelected
                    ? "bg-primary/5 text-primary dark:bg-primary/10 dark:text-indigo-300"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {multiple && (
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded border",
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-slate-300 dark:border-slate-600",
                      )}
                      aria-hidden
                    >
                      {isSelected && <Check className="size-2.5" />}
                    </span>
                  )}
                  <span className="truncate">{entry.value}</span>
                </span>
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
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
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20 dark:text-indigo-300">
      <span className="font-medium opacity-70">{label}:</span>
      <span className="max-w-48 truncate">{value}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear ${label} filter`}
        className="ml-0.5 -mr-0.5 grid size-5 place-items-center rounded-full transition-colors hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <X className="size-3" aria-hidden />
      </button>
    </span>
  );
}

type ActiveFiltersBarProps = {
  departmentFilter: string[];
  currentStatusFilter: string[];
  irebMemberFilter?: string[];
  onClearDepartment: (value: string) => void;
  onClearStatus: (value: string) => void;
  onClearIrebMember?: (value: string) => void;
  onClearAll: () => void;
};

export function ActiveFiltersBar({
  departmentFilter,
  currentStatusFilter,
  irebMemberFilter = [],
  onClearDepartment,
  onClearStatus,
  onClearIrebMember,
  onClearAll,
}: ActiveFiltersBarProps) {
  const hasFilters =
    departmentFilter.length +
      currentStatusFilter.length +
      irebMemberFilter.length >
    0;

  if (!hasFilters) return null;

  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
        Active filters:
      </span>
      <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-1">
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
        {onClearIrebMember &&
          irebMemberFilter.map((value) => (
            <FilterChip
              key={`ireb-${value}`}
              label="IREB Member"
              value={value}
              onClear={() => onClearIrebMember(value)}
            />
          ))}
      </div>
      <button
        type="button"
        onClick={onClearAll}
        className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-indigo-300"
      >
        Clear all
      </button>
    </div>
  );
}
