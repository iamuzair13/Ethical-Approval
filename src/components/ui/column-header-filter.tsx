"use client";

import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { FilterOption } from "./filter-multi-select";

// Re-export so consumers can import from either module
export type { FilterOption };

/* ============================================================
   ColumnHeaderFilter — compact searchable multi-select filter
   designed for table column headers.

   - Compact trigger: column label + filter icon + active badge
   - Portalled dropdown (works with sticky headers, horizontal
     scroll, frozen columns, overflow containers)
   - Same dropdown UI as FilterMultiSelect (search, checkboxes,
     counts, select all / clear)
   - Shares the same FilterOption type and selected/onChange API
   - Active filter indicator (colored dot + count badge)
   ============================================================ */

type ColumnHeaderFilterProps = {
  /** Column label text shown in the header. */
  label: string;
  /** Filter options (same type as FilterMultiSelect). */
  options: FilterOption[];
  /** Currently selected values. */
  selected: string[];
  /** Called whenever the selection changes. */
  onChange: (selected: string[]) => void;
  /** Search input placeholder. */
  searchPlaceholder?: string;
  /** Disabled state (e.g., while options are loading). */
  disabled?: boolean;
  /** Show "Select All" action. Defaults to true when > 3 options. */
  showSelectAll?: boolean;
  /** Max height of the options list in px. */
  maxOptionsHeight?: number;
  /** Dropdown width in px (defaults to 240, min 180). */
  dropdownWidth?: number;
  /** Additional className for the header cell. */
  className?: string;
};

export function ColumnHeaderFilter({
  label,
  options,
  selected,
  onChange,
  searchPlaceholder = "Search…",
  disabled = false,
  showSelectAll,
  maxOptionsHeight = 280,
  dropdownWidth = 240,
  className,
}: ColumnHeaderFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const hasActiveFilters = selected.length > 0;
  const shouldShowSelectAll = showSelectAll ?? options.length > 3;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(normalized),
    );
  }, [query, options]);

  // Position the portalled dropdown
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.max(dropdownWidth, 180);
    let left = rect.left;
    const maxLeft = window.innerWidth - width - 8;
    left = Math.max(8, Math.min(left, maxLeft));

    // If dropdown would go below viewport, show above
    const menuHeight = maxOptionsHeight + 100;
    let top = rect.bottom + 4;
    if (top + menuHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - menuHeight - 4);
    }

    setMenuStyle({ position: "fixed", top, left, width, zIndex: 99999 });
  }, [dropdownWidth, maxOptionsHeight]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setQuery("");
      setActiveIndex(-1);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setQuery("");
      setActiveIndex(-1);
    }
  }, [open]);

  const toggleValue = useCallback(
    (value: string) => {
      if (selectedSet.has(value)) {
        onChange(selected.filter((v) => v !== value));
      } else {
        onChange([...selected, value]);
      }
    },
    [selected, selectedSet, onChange],
  );

  const selectAll = useCallback(() => {
    onChange(options.map((o) => o.value));
  }, [options, onChange]);

  const clearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const selectAllFiltered = useCallback(() => {
    const filteredValues = filtered.map((o) => o.value);
    const newSelected = new Set(selected);
    filteredValues.forEach((v) => newSelected.add(v));
    onChange([...newSelected]);
  }, [filtered, selected, onChange]);

  const clearFiltered = useCallback(() => {
    const filteredSet = new Set(filtered.map((o) => o.value));
    onChange(selected.filter((v) => !filteredSet.has(v)));
  }, [filtered, selected, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      setActiveIndex(-1);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if ((e.key === "Enter" || e.key === " ") && activeIndex >= 0) {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) toggleValue(opt.value);
    }
  };

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      role="listbox"
      aria-multiselectable="true"
      onKeyDown={handleKeyDown}
      className="rounded-lg border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2"
      style={menuStyle ?? { visibility: "hidden" }}
    >
      {/* Search input */}
      <div className="border-b border-stroke p-2 dark:border-dark-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-dark-5"
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
            }}
            placeholder={searchPlaceholder}
            className="w-full rounded-md border border-stroke bg-transparent py-2 pl-8 pr-3 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
            role="combobox"
            aria-expanded="true"
          />
        </div>
      </div>

      {/* Select All / Clear actions */}
      {shouldShowSelectAll && (
        <div className="flex items-center justify-between gap-2 border-b border-stroke px-3 py-1.5 dark:border-dark-3">
          <button
            type="button"
            onClick={query ? selectAllFiltered : selectAll}
            className="text-xs font-medium text-primary hover:underline"
          >
            {query ? "Select all results" : "Select all"}
          </button>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={query ? clearFiltered : clearAll}
              className="text-xs font-medium text-dark-5 hover:text-red dark:text-dark-6"
            >
              {query ? "Clear results" : "Clear"}
            </button>
          )}
        </div>
      )}

      {/* Options list */}
      <div
        className="overflow-y-auto p-1"
        style={{ maxHeight: `${maxOptionsHeight}px` }}
      >
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-dark-5 dark:text-dark-6">
            {query ? "No results found." : "No options available."}
          </p>
        ) : (
          filtered.map((opt, idx) => {
            const checked = selectedSet.has(opt.value);
            const isActive = idx === activeIndex;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={checked}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => toggleValue(opt.value)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                  isActive && "bg-gray-1 dark:bg-dark-3",
                  !isActive && "hover:bg-gray-1 dark:hover:bg-dark-3",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition",
                    checked
                      ? "border-primary bg-primary text-white"
                      : "border-stroke dark:border-dark-3",
                  )}
                >
                  {checked && <Check className="size-3" aria-hidden />}
                </span>
                <span className="flex-1 truncate text-dark dark:text-white">
                  {opt.label}
                </span>
                {typeof opt.count === "number" && (
                  <span className="shrink-0 text-xs tabular-nums text-dark-5 dark:text-dark-6">
                    ({opt.count})
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  return (
    <th
      className={cn(
        "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider",
        "select-none",
        className,
      )}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
          "hover:text-primary",
          hasActiveFilters ? "text-primary" : "text-gray-500 dark:text-gray-400",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span>{label}</span>
        {/* Active filter indicator */}
        {hasActiveFilters && (
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {selected.length}
            </span>
          </span>
        )}
        {/* Filter dropdown chevron */}
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 opacity-60 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {/* Clear this column's filter */}
      {hasActiveFilters && !open && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            clearAll();
          }}
          className="ml-1 inline-flex items-center rounded p-0.5 text-dark-5 transition hover:bg-gray-1 hover:text-red dark:hover:bg-dark-3"
          aria-label={`Clear ${label} filter`}
        >
          <X className="size-3" aria-hidden />
        </button>
      )}

      {dropdown && createPortal(dropdown, document.body)}
    </th>
  );
}

/* ============================================================
   ColumnHeaderSortFilter — header cell with both sort and filter
   capability. Use for columns that support both sorting and
   filtering.
   ============================================================ */

type ColumnHeaderSortFilterProps = ColumnHeaderFilterProps & {
  /** Current sort direction for this column: "asc", "desc", or null. */
  sortDirection?: "asc" | "desc" | null;
  /** Called when the sort label is clicked. */
  onSortToggle: () => void;
};

export function ColumnHeaderSortFilter({
  label,
  sortDirection,
  onSortToggle,
  options,
  selected,
  onChange,
  searchPlaceholder,
  disabled,
  showSelectAll,
  maxOptionsHeight,
  dropdownWidth,
  className,
}: ColumnHeaderSortFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sortRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const hasActiveFilters = selected.length > 0;
  const shouldShowSelectAll = showSelectAll ?? options.length > 3;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(normalized),
    );
  }, [query, options]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.max(dropdownWidth ?? 240, 180);
    let left = rect.left;
    const maxLeft = window.innerWidth - width - 8;
    left = Math.max(8, Math.min(left, maxLeft));
    const menuHeight = (maxOptionsHeight ?? 280) + 100;
    let top = rect.bottom + 4;
    if (top + menuHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - menuHeight - 4);
    }
    setMenuStyle({ position: "fixed", top, left, width, zIndex: 99999 });
  }, [dropdownWidth, maxOptionsHeight]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if (dropdownRef.current?.contains(e.target as Node)) return;
      if (sortRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setQuery("");
      setActiveIndex(-1);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setQuery("");
      setActiveIndex(-1);
    }
  }, [open]);

  const toggleValue = useCallback(
    (value: string) => {
      if (selectedSet.has(value)) {
        onChange(selected.filter((v) => v !== value));
      } else {
        onChange([...selected, value]);
      }
    },
    [selected, selectedSet, onChange],
  );

  const clearAll = useCallback(() => onChange([]), [onChange]);

  const selectAll = useCallback(
    () => onChange(options.map((o) => o.value)),
    [options, onChange],
  );

  const selectAllFiltered = useCallback(() => {
    const filteredValues = filtered.map((o) => o.value);
    const newSelected = new Set(selected);
    filteredValues.forEach((v) => newSelected.add(v));
    onChange([...newSelected]);
  }, [filtered, selected, onChange]);

  const clearFiltered = useCallback(() => {
    const filteredSet = new Set(filtered.map((o) => o.value));
    onChange(selected.filter((v) => !filteredSet.has(v)));
  }, [filtered, selected, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      setActiveIndex(-1);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if ((e.key === "Enter" || e.key === " ") && activeIndex >= 0) {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) toggleValue(opt.value);
    }
  };

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      role="listbox"
      aria-multiselectable="true"
      onKeyDown={handleKeyDown}
      className="rounded-lg border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2"
      style={menuStyle ?? { visibility: "hidden" }}
    >
      <div className="border-b border-stroke p-2 dark:border-dark-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-dark-5"
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
            }}
            placeholder={searchPlaceholder ?? "Search…"}
            className="w-full rounded-md border border-stroke bg-transparent py-2 pl-8 pr-3 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
            role="combobox"
            aria-expanded="true"
          />
        </div>
      </div>
      {shouldShowSelectAll && (
        <div className="flex items-center justify-between gap-2 border-b border-stroke px-3 py-1.5 dark:border-dark-3">
          <button
            type="button"
            onClick={query ? selectAllFiltered : selectAll}
            className="text-xs font-medium text-primary hover:underline"
          >
            {query ? "Select all results" : "Select all"}
          </button>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={query ? clearFiltered : clearAll}
              className="text-xs font-medium text-dark-5 hover:text-red dark:text-dark-6"
            >
              {query ? "Clear results" : "Clear"}
            </button>
          )}
        </div>
      )}
      <div
        className="overflow-y-auto p-1"
        style={{ maxHeight: `${maxOptionsHeight ?? 280}px` }}
      >
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-dark-5 dark:text-dark-6">
            {query ? "No results found." : "No options available."}
          </p>
        ) : (
          filtered.map((opt, idx) => {
            const checked = selectedSet.has(opt.value);
            const isActive = idx === activeIndex;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={checked}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => toggleValue(opt.value)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                  isActive && "bg-gray-1 dark:bg-dark-3",
                  !isActive && "hover:bg-gray-1 dark:hover:bg-dark-3",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition",
                    checked
                      ? "border-primary bg-primary text-white"
                      : "border-stroke dark:border-dark-3",
                  )}
                >
                  {checked && <Check className="size-3" aria-hidden />}
                </span>
                <span className="flex-1 truncate text-dark dark:text-white">
                  {opt.label}
                </span>
                {typeof opt.count === "number" && (
                  <span className="shrink-0 text-xs tabular-nums text-dark-5 dark:text-dark-6">
                    ({opt.count})
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  return (
    <th
      className={cn(
        "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider select-none",
        className,
      )}
    >
      <div className="inline-flex items-center gap-1">
        {/* Sort button (label is clickable for sorting) */}
        <button
          ref={sortRef}
          type="button"
          onClick={onSortToggle}
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors hover:text-primary",
            sortDirection ? "text-primary" : "text-gray-500 dark:text-gray-400",
          )}
          aria-label={`Sort by ${label}`}
        >
          <span>{label}</span>
          {sortDirection === "asc" && (
            <svg className="size-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
            </svg>
          )}
          {sortDirection === "desc" && (
            <svg className="size-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {/* Filter button */}
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "inline-flex items-center gap-1 transition-colors",
            "hover:text-primary",
            hasActiveFilters ? "text-primary" : "text-gray-400 dark:text-gray-500",
            disabled && "cursor-not-allowed opacity-60",
          )}
          aria-label={`Filter by ${label}`}
        >
          {hasActiveFilters ? (
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {selected.length}
              </span>
            </span>
          ) : (
            <svg className="size-3.5 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M2.628 1.601C5.233 1.435 7.732 1 10 1s4.767.435 7.372.601a.75.75 0 01.628.733v3.09a.75.75 0 01-.276.585l-4.25 3.4a.75.75 0 00-.274.585v6.096c0 .21-.3.31-.45.13l-2.25-2.516a.75.75 0 01-.2-.503V8.81a.75.75 0 00-.274-.585l-4.25-3.4A.75.75 0 015 4.243V1.334a.75.75 0 01.628-.733z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {/* Clear this column's filter */}
        {hasActiveFilters && !open && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearAll();
            }}
            className="inline-flex items-center rounded p-0.5 text-dark-5 transition hover:bg-gray-1 hover:text-red dark:hover:bg-dark-3"
            aria-label={`Clear ${label} filter`}
          >
            <X className="size-3" aria-hidden />
          </button>
        )}
      </div>

      {dropdown && createPortal(dropdown, document.body)}
    </th>
  );
}
