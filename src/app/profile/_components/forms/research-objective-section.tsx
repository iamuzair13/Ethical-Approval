"use client";

import {
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { FormState } from "./form-stepper-types";
import { BaseTextarea, FieldGroup } from "./form-ui";
import { Required } from "./required";

/* ============================================================
   Types
   ============================================================ */

export type ResearchObjectiveSectionProps = {
  /**
   * Form-state keys for the 3 always-visible default objectives.
   * Exactly three keys; the first `requiredCount` are rendered with the
   * Required wrapper, the rest as plain optional FieldGroups.
   */
  defaultKeys: readonly [string, string, string];
  /**
   * Single form-state key holding any additional optional objectives.
   * Stored as a JSON-encoded `string[]` (or `""` when empty).
   */
  extrasKey: string;
  /** How many of the default keys are required. Defaults to 2. */
  requiredCount?: number;
  /** Label prefix for each row (default: "Research Objective"). */
  labelPrefix?: string;
  /** className applied to each row + the Add button (default: "md:col-span-2"). */
  rowClassName?: string;
  /** Number of textarea rows (default: 2). */
  textareaRows?: number;
  /** Placeholder for the required/default textareas. */
  placeholder?: string;
  /** Placeholder for extra (optional) textareas. */
  extrasPlaceholder?: string;
  /** Label for the Add button (default: "+ Add Research Objective"). */
  addButtonLabel?: string;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  onFieldChange: (
    key: string,
  ) => (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
};

/* ============================================================
   Helpers (extras stored as a JSON-encoded string[])
   ============================================================ */

export function parseObjectivesExtras(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.map((x) => (typeof x === "string" ? x : String(x ?? "")));
  } catch {
    return [];
  }
}

function serializeExtras(items: string[]): string {
  return items.length === 0 ? "" : JSON.stringify(items);
}

/* ============================================================
   Component
   ============================================================ */

export function ResearchObjectiveSection({
  defaultKeys,
  extrasKey,
  requiredCount = 2,
  labelPrefix = "Research Objective",
  rowClassName = "md:col-span-2",
  textareaRows = 2,
  placeholder = "Describe",
  extrasPlaceholder,
  addButtonLabel = "+ Add Research Objective",
  form,
  setForm,
  onFieldChange,
}: ResearchObjectiveSectionProps) {
  const extras = parseObjectivesExtras(form[extrasKey]);
  const extrasPlaceholderFinal = extrasPlaceholder ?? `${placeholder} (optional)`;

  const writeExtras = (next: string[]) => {
    setForm((prev) => ({ ...prev, [extrasKey]: serializeExtras(next) }));
  };

  const handleExtraChange =
    (index: number) =>
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const next = [...extras];
      next[index] = e.target.value;
      writeExtras(next);
    };

  const addExtra = () => writeExtras([...extras, ""]);

  const removeExtra = (index: number) => {
    writeExtras(extras.filter((_, i) => i !== index));
  };

  return (
    <>
      {defaultKeys.map((key, i) => {
        const number = i + 1;
        const isRequired = i < requiredCount;
        const label = `${labelPrefix} ${number}${isRequired ? " *" : ""}`;
        const textarea = (
          <BaseTextarea
            value={form[key] ?? ""}
            onChange={onFieldChange(key)}
            rows={textareaRows}
            placeholder={placeholder}
          />
        );
        return isRequired ? (
          <Required key={key} label={label} className={rowClassName}>
            {textarea}
          </Required>
        ) : (
          <FieldGroup key={key} label={label} className={rowClassName}>
            {textarea}
          </FieldGroup>
        );
      })}

      {extras.map((value, i) => {
        const number = defaultKeys.length + i + 1;
        return (
          <FieldGroup
            key={`extra-${i}`}
            label={`${labelPrefix} ${number}`}
            className={rowClassName}
          >
            <BaseTextarea
              value={value}
              onChange={handleExtraChange(i)}
              rows={textareaRows}
              placeholder={extrasPlaceholderFinal}
            />
            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                onClick={() => removeExtra(i)}
                className="text-xs font-medium text-dark-5 underline decoration-dark-5/60 underline-offset-2 transition hover:text-dark dark:text-gray-400 dark:hover:text-white"
              >
                Remove Objective {number}
              </button>
            </div>
          </FieldGroup>
        );
      })}

      <div className={rowClassName}>
        <button
          type="button"
          onClick={addExtra}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white dark:border-primary dark:text-primary"
        >
          {addButtonLabel}
        </button>
      </div>
    </>
  );
}
