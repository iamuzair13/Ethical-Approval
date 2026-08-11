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
import { Check, Search } from "lucide-react";

/* ============================================================
   SearchableSelect — single-select dropdown with built-in
   client-side search. Designed for form inputs (NOT filters).
   Supports portal rendering for use inside modals/dialogs.
   ============================================================ */

export type SelectOption = {
  value: string;
  label: string;
  /** Optional secondary text shown beneath the label. */
  hint?: string;
};

type SearchableSelectProps = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  noResultsMessage?: string;
  /** Use a portal to avoid clipping inside modals (default: true). */
  portalled?: boolean;
  /** Align dropdown relative to trigger. */
  align?: "start" | "end";
  /** Optional className for the trigger button. */
  triggerClassName?: string;
  /** Optional label shown above the trigger. */
  label?: string;
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  disabled = false,
  loading = false,
  emptyMessage = "No options available.",
  noResultsMessage = "No matching results.",
  portalled = true,
  align = "start",
  triggerClassName,
  label,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(normalized) ||
        (opt.hint ?? "").toLowerCase().includes(normalized),
    );
  }, [query, options]);

  const selected = options.find((opt) => opt.value === value);

  const updatePosition = useCallback(() => {
    if (!portalled || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, 200);
    let left = rect.left;
    if (align === "end") {
      left = rect.right - width;
    }
    const maxLeft = window.innerWidth - width - 8;
    left = Math.max(8, Math.min(left, maxLeft));

    const menuHeight = 340;
    let top = rect.bottom + 4;
    if (top + menuHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - menuHeight - 4);
    }

    setMenuStyle({ position: "fixed", top, left, width, zIndex: 9999 });
  }, [portalled, align]);

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

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
  };

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
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) handleSelect(opt.value);
    }
  };

  const triggerClass = cn(
    "w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark transition-colors flex items-center justify-between text-left",
    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15",
    "dark:border-dark-3 dark:text-white",
    disabled && "cursor-not-allowed opacity-60",
    triggerClassName,
  );

  const menuContent = open ? (
    <div
      ref={listRef}
      role="listbox"
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
          />
        </div>
      </div>

      {/* Options list */}
      <div className="max-h-56 overflow-y-auto p-1">
        {loading ? (
          <p className="px-3 py-4 text-center text-sm text-dark-5 dark:text-dark-6">
            Loading…
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-dark-5 dark:text-dark-6">
            {query ? noResultsMessage : emptyMessage}
          </p>
        ) : (
          filtered.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isActive = idx === activeIndex;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                  isActive && "bg-gray-1 dark:bg-dark-3",
                  !isActive && "hover:bg-gray-1 dark:hover:bg-dark-3",
                  isSelected && "bg-primary/5",
                )}
              >
                <span className="flex w-full items-center gap-2">
                  <span className="flex-1 truncate font-medium text-dark dark:text-white">
                    {opt.label}
                  </span>
                  {isSelected && (
                    <Check className="size-4 shrink-0 text-primary" aria-hidden />
                  )}
                </span>
                {opt.hint && (
                  <span className="text-xs text-dark-5 dark:text-dark-6">
                    {opt.hint}
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
        <span className="truncate">
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={cn(
            "ml-2 size-4 shrink-0 opacity-60 transition-transform",
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
      </button>

      {portalled && menuContent
        ? createPortal(menuContent, document.body)
        : menuContent}
    </div>
  );
}
