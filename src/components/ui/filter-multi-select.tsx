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
import { Check, Search, X } from "lucide-react";

/* ============================================================
   FilterMultiSelect — searchable multi-select dropdown for
   filter toolbars. Supports:
   - Client-side case-insensitive search
   - Multi-select (toggle without closing)
   - Optional per-option counts
   - "Select All" / "Clear" actions
   - Portalled rendering (works inside modals, tables, etc.)
   - Keyboard navigation (Arrow/Enter/Escape/Tab)
   - Empty / no-results states
   ============================================================ */

export type FilterOption = {
  value: string;
  label: string;
  /** Optional count shown next to the label, e.g. "Computer Science (42)". */
  count?: number;
};

type FilterMultiSelectProps = {
  options: FilterOption[];
  /** Currently selected values. */
  selected: string[];
  /** Called whenever the selection changes (full new array). */
  onChange: (selected: string[]) => void;
  /** Label shown above the trigger (filter toolbar label). */
  label?: string;
  /** Placeholder when nothing is selected. */
  placeholder?: string;
  /** Search input placeholder. */
  searchPlaceholder?: string;
  disabled?: boolean;
  /** Show "Select All" action. Defaults to true when > 3 options. */
  showSelectAll?: boolean;
  /** Max height of the options list in px. */
  maxOptionsHeight?: number;
  /** Dropdown width in px (defaults to trigger width, min 200). */
  dropdownWidth?: number;
  /** Use a portal to avoid clipping (default: true). */
  portalled?: boolean;
  /** Align dropdown relative to trigger. */
  align?: "start" | "end";
  /** Optional className for the trigger button. */
  triggerClassName?: string;
};

export function FilterMultiSelect({
  options,
  selected,
  onChange,
  label,
  placeholder = "All",
  searchPlaceholder = "Search…",
  disabled = false,
  showSelectAll,
  maxOptionsHeight = 280,
  dropdownWidth,
  portalled = true,
  align = "start",
  triggerClassName,
}: FilterMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(normalized),
    );
  }, [query, options]);

  const shouldShowSelectAll =
    showSelectAll ?? (options.length > 3);

  // Position the portalled menu
  const updatePosition = useCallback(() => {
    if (!portalled || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = dropdownWidth ?? Math.max(rect.width, 200);
    let left = rect.left;
    if (align === "end") {
      left = rect.right - width;
    }
    const maxLeft = window.innerWidth - width - 8;
    left = Math.max(8, Math.min(left, maxLeft));

    // If menu would go below viewport, show above
    const menuHeight = maxOptionsHeight + 80; // search + actions + list
    let top = rect.bottom + 4;
    if (top + menuHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - menuHeight - 4);
    }

    setMenuStyle({ position: "fixed", top, left, width, zIndex: 9999 });
  }, [portalled, dropdownWidth, align, maxOptionsHeight]);

  useLayoutEffect(() => {
    if (!open || !portalled) {
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
  }, [open, portalled, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      // For portalled, also check the menu element
      if (listRef.current?.contains(e.target as Node)) return;
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
      setActiveIndex((prev) =>
        Math.min(prev + 1, filtered.length - 1),
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) toggleValue(opt.value);
    } else if (e.key === " " && activeIndex >= 0) {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) toggleValue(opt.value);
    }
  };

  const triggerLabel =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? options.find((o) => o.value === selected[0])?.label ?? `${selected.length} selected`
        : `${selected.length} selected`;

  const triggerClass = cn(
    "w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark transition-colors flex items-center justify-between text-left",
    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15",
    "dark:border-dark-3 dark:text-white",
    disabled && "cursor-not-allowed opacity-60",
    selected.length > 0 && "border-primary text-primary",
    triggerClassName,
  );

  const menuContent = open ? (
    <div
      ref={listRef}
      role="listbox"
      aria-multiselectable="true"
      onKeyDown={handleKeyDown}
      className={cn(
        "rounded-lg border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2",
        "flex flex-col",
        !portalled && "absolute z-50 mt-1 w-full",
      )}
      style={portalled ? menuStyle ?? { visibility: "hidden" } : undefined}
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
            aria-controls="filter-multiselect-list"
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
        id="filter-multiselect-list"
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
    <div ref={containerRef} className="relative">
      {label && (
        <span className="mb-1.5 block text-xs font-medium text-dark-5 dark:text-dark-6">
          {label}
        </span>
      )}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={triggerClass}
      >
        <span className="truncate">{triggerLabel}</span>
        <span className="ml-2 flex shrink-0 items-center gap-1">
          {selected.length > 0 && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
              className="rounded p-0.5 text-dark-5 transition hover:bg-gray-1 hover:text-red dark:hover:bg-dark-3"
              aria-label="Clear selection"
            >
              <X className="size-3.5" aria-hidden />
            </span>
          )}
          <svg
            className={cn(
              "size-4 shrink-0 opacity-60 transition-transform",
              open && "rotate-180",
            )}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {portalled && menuContent
        ? createPortal(menuContent, document.body)
        : menuContent}
    </div>
  );
}
