"use client";

import {
  csvItems,
  fieldLabel,
  formatValue,
  isChipKey,
  isEmptyValue,
} from "@/lib/submission-form-steps";
import { cn } from "@/lib/utils";
import { useState } from "react";

/** Answers longer than this collapse behind the › expander. */
const COLLAPSE_LIMIT = 90;
/** Chips shown when a collapsed multi-select field. */
const COLLAPSED_CHIP_COUNT = 3;

function YesNoPill({ text }: { text: string }) {
  const lower = text.toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        lower === "yes"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-gray-1 text-body dark:bg-dark-2",
      )}
    >
      {text}
    </span>
  );
}

function FieldRow({ k, v }: { k: string; v: unknown }) {
  const [expanded, setExpanded] = useState(false);

  const chips = isChipKey(k) ? csvItems(v) : null;
  const raw = chips ? chips.join(" · ") : formatValue(v);
  const expandable = raw.length > COLLAPSE_LIMIT;

  const isLong = raw.length > 110 || (chips && chips.length > 4);

  const label = (
    <>
      {expandable && (
        <span
          className={cn(
            "text-sm leading-none text-primary transition-transform duration-150",
            expanded && "rotate-90",
          )}
          aria-hidden
        >
          ›
        </span>
      )}
      {fieldLabel(k)}
    </>
  );

  let value: React.ReactNode;
  const lower = raw.toLowerCase();
  if (lower === "yes" || lower === "no" || lower === "n/a") {
    value = <YesNoPill text={raw} />;
  } else if (chips) {
    const shown = expandable && !expanded ? chips.slice(0, COLLAPSED_CHIP_COUNT) : chips;
    value = (
      <span className="flex flex-wrap gap-1.5">
        {shown.map((item, i) => (
          <span
            key={i}
            className="inline-block rounded-md bg-primary/[0.07] px-2 py-0.5 text-xs font-medium text-primary"
          >
            {item}
          </span>
        ))}
        {expandable && !expanded && (
          <span className="inline-block rounded-md bg-gray-1 px-2 py-0.5 text-xs font-medium text-body dark:bg-dark-2">
            +{chips.length - COLLAPSED_CHIP_COUNT} more
          </span>
        )}
      </span>
    );
  } else {
    value = (
      <span className="whitespace-pre-wrap break-words">
        {expandable && !expanded ? `${raw.slice(0, COLLAPSE_LIMIT).trimEnd()}…` : raw}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-[170px_minmax(0,1fr)] items-baseline gap-4 border-b border-stroke py-3 last:border-b-0 dark:border-dark-3 sm:last:border-b",
        isLong && "sm:col-span-2 sm:grid-cols-[240px_minmax(0,1fr)]",
      )}
    >
      {expandable ? (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="flex items-center gap-1.5 text-left text-xs font-bold uppercase tracking-wider text-dark transition-colors hover:text-primary dark:text-white"
        >
          {label}
        </button>
      ) : (
        <dt className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-dark dark:text-white">
          {label}
        </dt>
      )}
      <dd className="min-w-0 text-sm leading-relaxed text-body">{value}</dd>
    </div>
  );
}

/** Aligned label/value rows in two columns with collapsible long answers. */
export function FieldRows({ pairs }: { pairs: [string, unknown][] }) {
  const entries = pairs.filter(([, v]) => !isEmptyValue(v));
  if (entries.length === 0) {
    return <p className="text-sm text-body">No responses recorded in this step.</p>;
  }
  return (
    <dl className="grid sm:grid-cols-2 sm:gap-x-10">
      {entries.map(([k, v]) => (
        <FieldRow key={k} k={k} v={v} />
      ))}
    </dl>
  );
}
