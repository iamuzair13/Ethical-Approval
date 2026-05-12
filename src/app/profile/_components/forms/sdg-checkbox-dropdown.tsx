"use client";

import { useEffect, useRef, useState } from "react";

/* ============================================================
   The 17 UN Sustainable Development Goals
   ============================================================
   `value` is what we store in form state (bare name) — kept stable
   so existing drafts keep working with `hasCsvOption`/`toggleCsvOption`.
   `display` is the label shown in the UI: "Goal N: <Name>".
   ============================================================ */

export const SDG_GOALS: ReadonlyArray<{ value: string; display: string }> = [
  { value: "No Poverty", display: "Goal 1: No Poverty" },
  { value: "Zero Hunger", display: "Goal 2: Zero Hunger" },
  {
    value: "Good Health and Well-Being",
    display: "Goal 3: Good Health and Well-Being",
  },
  { value: "Quality Education", display: "Goal 4: Quality Education" },
  { value: "Gender Equality", display: "Goal 5: Gender Equality" },
  {
    value: "Clean Water and Sanitation",
    display: "Goal 6: Clean Water and Sanitation",
  },
  {
    value: "Affordable and Clean Energy",
    display: "Goal 7: Affordable and Clean Energy",
  },
  {
    value: "Decent Work and Economic Growth",
    display: "Goal 8: Decent Work and Economic Growth",
  },
  {
    value: "Industry, Innovation, and Infrastructure",
    display: "Goal 9: Industry, Innovation, and Infrastructure",
  },
  { value: "Reduced Inequalities", display: "Goal 10: Reduced Inequalities" },
  {
    value: "Sustainable Cities and Communities",
    display: "Goal 11: Sustainable Cities and Communities",
  },
  {
    value: "Responsible Consumption and Production",
    display: "Goal 12: Responsible Consumption and Production",
  },
  { value: "Climate Action", display: "Goal 13: Climate Action" },
  { value: "Life Below Water", display: "Goal 14: Life Below Water" },
  { value: "Life on Land", display: "Goal 15: Life on Land" },
  {
    value: "Peace, Justice and Strong Institutions",
    display: "Goal 16: Peace, Justice and Strong Institutions",
  },
  {
    value: "Partnership for the Goals",
    display: "Goal 17: Partnership for the Goals",
  },
];

/* ============================================================
   Component
   ============================================================ */

export type SdgCheckboxDropdownProps = {
  /** Form-state key holding the pipe-delimited SDG selections. Defaults to "sdgs". */
  fieldKey?: string;
  /** Predicate from the parent: should be `(v) => hasCsvOption(fieldKey, v)`. */
  isChecked: (value: string) => boolean;
  /** Toggler from the parent: should be `(v) => toggleCsvOption(fieldKey, v)`. */
  onToggle: (value: string) => void;
  /** Placeholder shown in the trigger when nothing is selected. */
  placeholder?: string;
  /** Extra className for the wrapper. */
  className?: string;
  /** Optional id forwarded to the trigger button (useful for label/htmlFor). */
  id?: string;
};

export function SdgCheckboxDropdown({
  isChecked,
  onToggle,
  placeholder = "Select Sustainable Development Goals…",
  className = "",
  id,
}: SdgCheckboxDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const root = wrapperRef.current;
      if (root && !root.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = SDG_GOALS.filter((g) => isChecked(g.value));
  const selectedCount = selected.length;

  return (
    <div ref={wrapperRef} className={`relative ${className}`.trim()}>
      {/*
       * Sentinel checkbox: always rendered (visually hidden) so the parent
       * `<Required kind="selection">` wrapper's DOM validator always sees a
       * control whose checked state reflects whether any SDG is selected —
       * even when the dropdown panel is closed.
       */}
      <input
        type="checkbox"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        checked={selectedCount > 0}
        onChange={() => {
          /* state is derived from real SDG selections */
        }}
      />

      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-stroke bg-transparent px-4 py-3 text-left text-sm text-dark transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-3 dark:text-white"
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            selectedCount === 0
              ? "text-body/60 dark:text-dark-6"
              : "text-dark dark:text-white"
          }`}
        >
          {selectedCount === 0
            ? placeholder
            : selectedCount === 1
              ? selected[0].display
              : `${selectedCount} goals selected`}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className={`shrink-0 text-body transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {selectedCount > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((g) => (
            <button
              type="button"
              key={`chip-${g.value}`}
              onClick={() => onToggle(g.value)}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              aria-label={`Remove ${g.display}`}
            >
              <span>{g.display}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 right-0 z-30 mt-2 max-h-80 overflow-y-auto rounded-lg border border-stroke bg-white p-2 shadow-lg dark:border-dark-3 dark:bg-dark-2"
        >
          <div className="grid gap-1 sm:grid-cols-2">
            {SDG_GOALS.map((g) => {
              const checked = isChecked(g.value);
              return (
                <label
                  key={g.value}
                  className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    checked
                      ? "bg-primary/10 text-dark dark:bg-primary/15 dark:text-white"
                      : "text-dark hover:bg-gray-1 dark:text-white dark:hover:bg-dark-3"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(g.value)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  />
                  <span className="leading-snug">{g.display}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
