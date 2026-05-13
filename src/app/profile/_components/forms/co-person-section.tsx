"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { FormState } from "./form-stepper-types";
import {
  BaseInput,
  BaseSelect,
  FieldGroup,
  FieldRow,
  FormSection,
} from "./form-ui";

/* ============================================================
   Types
   ============================================================ */

export type CoPersonUolKeys = {
  /** Form-state key for "SAP ID". */
  sapId: string;
  /** Form-state key for "Name". */
  name: string;
  /** Form-state key for "Email". */
  email: string;
  /** Form-state key for "Faculty". */
  faculty: string;
  /** Form-state key for "Department". */
  department: string;
};

export type CoPersonExternalKeys = {
  /** Form-state key for "Name". */
  name: string;
  /** Optional form-state key for UOL SAP ID / Reg. No. */
  regNo?: string;
  /** Form-state key for "Email". */
  email: string;
  /** Form-state key for "University". */
  university: string;
  /** Form-state key for "Faculty". */
  faculty: string;
  /** Form-state key for "Department". */
  department: string;
};

export type CoPersonEntryKeys = {
  /** Form-state key for the "UOL" / "External" select. */
  type: string;
  uol: CoPersonUolKeys;
  external: CoPersonExternalKeys;
};

export type CoPersonSectionProps = {
  /** FormSection title for the (collapsed) Add button card and the first entry. */
  title?: string;
  /** FormSection subtitle for the (collapsed) Add button card and the first entry. */
  subtitle?: string;
  /** Human label used in the Add button and additional headings. */
  entityLabel?: string;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  onFieldChange: (
    key: string,
  ) => (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  facultyOptions: string[];
  getDepartmentsForFaculty: (faculty: string) => string[];
  /** Field keys for the first (default) entry. */
  defaultKeys: CoPersonEntryKeys;
  /**
   * Optional additional entry slots (each with its own field keys).
   * Each is revealed one at a time by an "+ Add another {entityLabel}" button
   * after the default entry is shown.
   */
  extraKeysList?: CoPersonEntryKeys[];
};

/* ============================================================
   Helpers
   ============================================================ */

function hasTrimmedValue(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

/** Checks whether any meaningful (non-type) field has been filled. */
function hasEntryValue(form: FormState, k: CoPersonEntryKeys): boolean {
  const candidates = [
    form[k.uol.sapId],
    form[k.uol.name],
    form[k.uol.email],
    form[k.uol.faculty],
    form[k.uol.department],
    form[k.external.name],
    form[k.external.email],
    form[k.external.university],
    form[k.external.faculty],
    form[k.external.department],
  ];
  if (k.external.regNo) candidates.push(form[k.external.regNo]);
  return candidates.some(hasTrimmedValue);
}

function clearEntry(prev: FormState, k: CoPersonEntryKeys): FormState {
  const next: FormState = { ...prev };
  next[k.type] = "";
  next[k.uol.sapId] = "";
  next[k.uol.name] = "";
  next[k.uol.email] = "";
  next[k.uol.faculty] = "";
  next[k.uol.department] = "";
  next[k.external.name] = "";
  if (k.external.regNo) next[k.external.regNo] = "";
  next[k.external.email] = "";
  next[k.external.university] = "";
  next[k.external.faculty] = "";
  next[k.external.department] = "";
  return next;
}

function copyEntry(
  prev: FormState,
  src: CoPersonEntryKeys,
  dst: CoPersonEntryKeys,
): FormState {
  const next: FormState = { ...prev };
  next[dst.type] = prev[src.type] ?? "";
  next[dst.uol.sapId] = prev[src.uol.sapId] ?? "";
  next[dst.uol.name] = prev[src.uol.name] ?? "";
  next[dst.uol.email] = prev[src.uol.email] ?? "";
  next[dst.uol.faculty] = prev[src.uol.faculty] ?? "";
  next[dst.uol.department] = prev[src.uol.department] ?? "";
  next[dst.external.name] = prev[src.external.name] ?? "";
  if (dst.external.regNo && src.external.regNo) {
    next[dst.external.regNo] = prev[src.external.regNo] ?? "";
  }
  next[dst.external.email] = prev[src.external.email] ?? "";
  next[dst.external.university] = prev[src.external.university] ?? "";
  next[dst.external.faculty] = prev[src.external.faculty] ?? "";
  next[dst.external.department] = prev[src.external.department] ?? "";
  return next;
}

/* ============================================================
   Entry renderer (UOL / External fields, all optional)
   ============================================================ */

type EntryProps = {
  keys: CoPersonEntryKeys;
  form: FormState;
  onFieldChange: CoPersonSectionProps["onFieldChange"];
  facultyOptions: string[];
  getDepartmentsForFaculty: CoPersonSectionProps["getDepartmentsForFaculty"];
};

function CoPersonEntry({
  keys,
  form,
  onFieldChange,
  facultyOptions,
  getDepartmentsForFaculty,
}: EntryProps) {
  const type = form[keys.type] ?? "";

  return (
    <>
      <FieldGroup label="Please select:" className="mb-1">
        <BaseSelect
          value={type}
          onChange={onFieldChange(keys.type)}
          className="max-w-xs"
        >
          <option value="">Select Option</option>
          <option value="UOL">Option 1: UOL</option>
          <option value="External">Option 2: External</option>
        </BaseSelect>
      </FieldGroup>

      <FieldRow className="mt-4">
        {type === "UOL" ? (
          <>
            <FieldGroup label="SAP ID">
              <BaseInput
                value={form[keys.uol.sapId] ?? ""}
                onChange={onFieldChange(keys.uol.sapId)}
                placeholder="SAP ID"
              />
            </FieldGroup>
            <FieldGroup label="Name">
              <BaseInput
                value={form[keys.uol.name] ?? ""}
                onChange={onFieldChange(keys.uol.name)}
                placeholder="Name"
              />
            </FieldGroup>
            <FieldGroup label="Email">
              <BaseInput
                type="email"
                value={form[keys.uol.email] ?? ""}
                onChange={onFieldChange(keys.uol.email)}
                placeholder="Email"
              />
            </FieldGroup>
            <FieldGroup label="Faculty">
              <BaseSelect
                value={form[keys.uol.faculty] ?? ""}
                onChange={onFieldChange(keys.uol.faculty)}
              >
                <option value="">Select Faculty</option>
                {facultyOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </BaseSelect>
            </FieldGroup>
            <FieldGroup label="Department" className="md:col-span-2">
              <BaseSelect
                value={form[keys.uol.department] ?? ""}
                onChange={onFieldChange(keys.uol.department)}
                disabled={!form[keys.uol.faculty]}
              >
                <option value="">Select Department</option>
                {getDepartmentsForFaculty(form[keys.uol.faculty] ?? "").map(
                  (d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ),
                )}
              </BaseSelect>
            </FieldGroup>
          </>
        ) : type === "External" ? (
          <>
            <FieldGroup label="Name">
              <BaseInput
                value={form[keys.external.name] ?? ""}
                onChange={onFieldChange(keys.external.name)}
                placeholder="Name"
              />
            </FieldGroup>
            {keys.external.regNo ? (
              <FieldGroup label="UOL SAP ID (if any)">
                <BaseInput
                  value={form[keys.external.regNo] ?? ""}
                  onChange={onFieldChange(keys.external.regNo)}
                  placeholder="SAP ID"
                />
              </FieldGroup>
            ) : null}
            <FieldGroup label="Email">
              <BaseInput
                type="email"
                value={form[keys.external.email] ?? ""}
                onChange={onFieldChange(keys.external.email)}
                placeholder="Email"
              />
            </FieldGroup>
            <FieldGroup label="University">
              <BaseInput
                value={form[keys.external.university] ?? ""}
                onChange={onFieldChange(keys.external.university)}
                placeholder="University"
              />
            </FieldGroup>
            <FieldGroup label="Department" className="md:col-span-2">
              <BaseInput
                value={form[keys.external.department] ?? ""}
                onChange={onFieldChange(keys.external.department)}
                placeholder="Department"
              />
            </FieldGroup>
          </>
        ) : null}
      </FieldRow>
    </>
  );
}

/* ============================================================
   Main section
   ============================================================ */

export function CoPersonSection({
  title,
  subtitle,
  entityLabel = "Co-Author",
  form,
  setForm,
  onFieldChange,
  facultyOptions,
  getDepartmentsForFaculty,
  defaultKeys,
  extraKeysList = [],
}: CoPersonSectionProps) {
  /**
   * Number of optional extras currently visible (0..extraKeysList.length).
   * The default entry is always visible, independent of this count.
   */
  const [extraVisibleCount, setExtraVisibleCount] = useState(0);

  useEffect(() => {
    let derived = 0;
    for (let i = 0; i < extraKeysList.length; i++) {
      if (hasEntryValue(form, extraKeysList[i]!)) {
        derived = Math.max(derived, i + 1);
      }
    }
    if (derived > 0) {
      setExtraVisibleCount((prev) => Math.max(prev, derived));
    }
  }, [extraKeysList, form]);

  const addExtra = () =>
    setExtraVisibleCount((c) => Math.min(extraKeysList.length, c + 1));

  const removeExtra = (index: number) => {
    setForm((prev) => {
      let next = prev;
      for (let i = index; i < extraVisibleCount - 1; i++) {
        const src = extraKeysList[i + 1]!;
        const dst = extraKeysList[i]!;
        next = copyEntry(next, src, dst);
      }
      const last = extraKeysList[extraVisibleCount - 1]!;
      next = clearEntry(next, last);
      return next;
    });
    setExtraVisibleCount((c) => Math.max(0, c - 1));
  };

  const canAddMore = extraVisibleCount < extraKeysList.length;

  return (
    <>
      <FormSection title={title} subtitle={subtitle}>
        <CoPersonEntry
          keys={defaultKeys}
          form={form}
          onFieldChange={onFieldChange}
          facultyOptions={facultyOptions}
          getDepartmentsForFaculty={getDepartmentsForFaculty}
        />
      </FormSection>

      {extraKeysList.slice(0, extraVisibleCount).map((keys, i) => (
        <FormSection
          key={`co-person-extra-${i}`}
          title={`Additional ${entityLabel} #${i + 2}`}
          subtitle={`Optional \u2014 same fields as the primary ${entityLabel}.`}
        >
          <div className="mb-3 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => removeExtra(i)}
              className="text-sm font-medium text-dark-5 underline decoration-dark-5/60 underline-offset-2 transition hover:text-dark dark:text-gray-400 dark:hover:text-white"
            >
              Remove
            </button>
          </div>
          <CoPersonEntry
            keys={keys}
            form={form}
            onFieldChange={onFieldChange}
            facultyOptions={facultyOptions}
            getDepartmentsForFaculty={getDepartmentsForFaculty}
          />
        </FormSection>
      ))}

      {canAddMore && (
        <div>
          <button
            type="button"
            onClick={addExtra}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white dark:border-primary dark:text-primary"
          >
            + Add {entityLabel}
          </button>
        </div>
      )}
    </>
  );
}
