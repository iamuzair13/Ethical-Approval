"use client";

import { useEffect, useState } from "react";
import type { FormState } from "./form-stepper-types";
import {
  FieldRow,
  FormSection,
  ReadOnlyInput,
  SearchableSelect,
  type SearchableOption,
} from "./form-ui";
import { Required } from "./required";

// ─── Types ───

type HodOption = {
  userId: string;
  facultyMemberId: string;
  sapId: string;
  name: string;
  email: string;
  designation: string | null;
  department: string;
  faculty: string | null;
  departmentId: number | null;
};

type HodPickerProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  /** Title for the section (e.g. "1.2 HOD's Information"). */
  sectionTitle?: string;
  /** When true, the picker is read-only (view mode). */
  readOnly?: boolean;
};

// ─── Component ───

/**
 * Reusable HOD -> auto-fill picker.
 *
 * Replaces the old manually-typed hod fields on the student thesis
 * forms (Form 1 and Form 3). The student:
 *   1. Selects a HOD from the full list of eligible hods (all active
 *      faculty members with a linked admin_users account).
 *   2. The hod's SAP ID, name, email, designation, faculty and
 *      department are auto-populated as read-only fields — including
 *      `hodDepartmentId`, which is derived from the HOD's own record.
 *
 * The authoritative value is `form.hodUserId` (the admin_users id).
 * `form.hodDepartmentId` stores the hod's department numeric ID
 * (used for server-side validation). The snapshot text fields
 * (hodName, hodSapId, ...) are derived from the database and
 * stored on the form for display/submission, but the server re-validates
 * everything from hodUserId + hodDepartmentId alone.
 *
 * The dropdown includes built-in client-side search (case-insensitive).
 */
export function HodPicker({
  form,
  setForm,
  sectionTitle = "1.2 HOD's Information",
  readOnly = false,
}: HodPickerProps) {
  const [hods, setHods] = useState<HodOption[]>([]);
  const [hodsLoading, setHodsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ─── Load all eligible hods once on mount ───
  useEffect(() => {
    let cancelled = false;
    setHodsLoading(true);
    setLoadError(null);
    fetch("/api/profile/hods")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.ok) return;
        setHods(data.hods as HodOption[]);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Failed to load hods.");
      })
      .finally(() => {
        if (!cancelled) setHodsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Handlers ───

  const handleHodChange = (value: string) => {
    const userId = value;
    if (!userId) {
      setForm((prev) => ({
        ...prev,
        hodUserId: "",
        hodSapId: "",
        hodName: "",
        hodEmail: "",
        hodFaculty: "",
        hodDesignation: "",
        hodDepartment: "",
        hodDepartmentId: "",
      }));
      return;
    }
    const selected = hods.find((s) => s.userId === userId);
    if (!selected) return;
    setForm((prev) => ({
      ...prev,
      hodUserId: selected.userId,
      hodSapId: selected.sapId,
      hodName: selected.name,
      hodEmail: selected.email,
      hodFaculty: selected.faculty ?? "",
      hodDesignation: selected.designation ?? "",
      // Department is derived from the hod's own record — both the display
      // name and the numeric id the server validates against.
      hodDepartment: selected.department,
      hodDepartmentId:
        selected.departmentId != null ? String(selected.departmentId) : "",
    }));
  };

  // ─── Build searchable options ───

  const hodOptions: SearchableOption[] = hods.map((s) => ({
    value: s.userId,
    label: s.name,
    hint: s.department,
  }));

  // ─── Render ───

  const hodDisabled = readOnly || hodsLoading;

  return (
    <FormSection title={sectionTitle}>
      <FieldRow>
        <Required label="HOD *">
          <SearchableSelect
            options={hodOptions}
            value={form.hodUserId ?? ""}
            onChange={handleHodChange}
            disabled={hodDisabled}
            loading={hodsLoading}
            searchPlaceholder="Search hods…"
            defaultPlaceholder={
              hodsLoading
                ? "Loading hods…"
                : hods.length === 0
                  ? "No hods available."
                  : "Select HOD"
            }
            emptyMessage="No hods available."
            noResultsMessage='No hods match your search.'
          />
        </Required>
      </FieldRow>

      {loadError && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{loadError}</p>
      )}

      {/* Auto-populated read-only hod details */}
      <FieldRow className="mt-4">
        <Required label="SAP ID">
          <ReadOnlyInput
            value={form.hodSapId ?? ""}
            placeholder="Auto-filled from hod selection"
          />
        </Required>
        <Required label="Email">
          <ReadOnlyInput
            value={form.hodEmail ?? ""}
            placeholder="Auto-filled from hod selection"
          />
        </Required>
      </FieldRow>
      <FieldRow className="mt-4">
        <Required label="Designation">
          <ReadOnlyInput
            value={form.hodDesignation ?? ""}
            placeholder="Auto-filled from hod selection"
          />
        </Required>
         <Required label="Department">
          <ReadOnlyInput
            value={form.hodDepartment ?? ""}
            placeholder="Auto-filled from hod selection"
          />
        </Required>
      </FieldRow>
      
    </FormSection>
  );
}
