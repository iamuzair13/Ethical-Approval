"use client";

import { useEffect, useRef, useState } from "react";
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

type DepartmentOption = { id: number; name: string };

type HodOption = {
  userId: string;
  facultyMemberId: string;
  sapId: string;
  name: string;
  email: string;
  designation: string | null;
  department: string;
  faculty: string | null;
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
 * Reusable Department -> HOD -> auto-fill picker.
 *
 * Replaces the old manually-typed hod fields on the student thesis
 * forms (Form 1 and Form 3). The student:
 *   1. Selects a Department (populated from the centralized `departments`
 *      table — all active departments, no Faculty/Program dependency).
 *   2. Selects a HOD (filtered to active hods in that
 *      department, matched by `faculty_members.department_id`).
 *   3. The hod's SAP ID, name, email, faculty and department are
 *      auto-populated as read-only fields.
 *
 * The authoritative value is `form.hodUserId` (the admin_users id).
 * `form.hodDepartmentId` stores the selected department's numeric ID
 * (used for server-side validation). The snapshot text fields
 * (hodName, hodSapId, ...) are derived from the database and
 * stored on the form for display/submission, but the server re-validates
 * everything from hodUserId + hodDepartmentId alone.
 *
 * Both dropdowns include built-in client-side search (case-insensitive).
 */
export function HodPicker({
  form,
  setForm,
  sectionTitle = "1.2 HOD's Information",
  readOnly = false,
}: HodPickerProps) {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [hods, setHods] = useState<HodOption[]>([]);
  const [hodsLoading, setHodsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Track the in-flight department id so a slow response for a previous
  // department doesn't overwrite the list for the currently-selected one.
  const departmentRequestRef = useRef<string>("");

  // ─── Load departments once on mount ───
  useEffect(() => {
    let cancelled = false;
    setDepartmentsLoading(true);
    setLoadError(null);
    fetch("/api/profile/hod-departments")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.ok) return;
        setDepartments(data.departments as DepartmentOption[]);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Failed to load departments.");
      })
      .finally(() => {
        if (!cancelled) setDepartmentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Load hods when the selected department changes ───
  const selectedDepartmentId = form.hodDepartmentId ?? "";
  useEffect(() => {
    const deptId = selectedDepartmentId.trim();
    if (!deptId) {
      setHods([]);
      return;
    }
    departmentRequestRef.current = deptId;
    let cancelled = false;
    setHodsLoading(true);
    setLoadError(null);
    fetch(`/api/profile/hods?departmentId=${encodeURIComponent(deptId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || departmentRequestRef.current !== deptId) return;
        if (!data?.ok) {
          setHods([]);
          return;
        }
        setHods(data.hods as HodOption[]);
      })
      .catch(() => {
        if (cancelled || departmentRequestRef.current !== deptId) return;
        setLoadError("Failed to load hods.");
        setHods([]);
      })
      .finally(() => {
        if (cancelled || departmentRequestRef.current !== deptId) return;
        setHodsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDepartmentId]);

  // ─── Handlers ───

  const handleDepartmentChange = (value: string) => {
    const deptId = value;
    const dept = departments.find((d) => String(d.id) === deptId);
    setForm((prev) => ({
      ...prev,
      hodDepartmentId: deptId,
      hodDepartment: dept?.name ?? "",
      // Clear the hod selection and all auto-filled fields when the
      // department changes — a hod from the previous department must
      // not remain selected.
      hodUserId: "",
      hodSapId: "",
      hodName: "",
      hodEmail: "",
      hodFaculty: "",
      hodDesignation: "",
    }));
  };

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
      // Department is already set by the department dropdown, but ensure it
      // matches the hod's record exactly.
      hodDepartment: selected.department,
    }));
  };

  // ─── Build searchable options ───

  const departmentOptions: SearchableOption[] = departments.map((d) => ({
    value: String(d.id),
    label: d.name,
  }));

  const hodOptions: SearchableOption[] = hods.map((s) => ({
    value: s.userId,
    label: s.name,
    hint: s.sapId,
  }));

  // ─── Render ───

  const departmentDisabled = readOnly || departmentsLoading;
  const hodDisabled = readOnly || hodsLoading || !selectedDepartmentId;

  return (
    <FormSection title={sectionTitle}>
      <FieldRow>
        <Required label="Department *">
          <SearchableSelect
            options={departmentOptions}
            value={form.hodDepartmentId ?? ""}
            onChange={handleDepartmentChange}
            disabled={departmentDisabled}
            loading={departmentsLoading}
            searchPlaceholder="Search departments…"
            defaultPlaceholder={
              departmentsLoading ? "Loading departments…" : "Select Department"
            }
            emptyMessage="No departments available."
            noResultsMessage='No departments match your search.'
          />
        </Required>

        <Required label="HOD *">
          <SearchableSelect
            options={hodOptions}
            value={form.hodUserId ?? ""}
            onChange={handleHodChange}
            disabled={hodDisabled}
            loading={hodsLoading}
            searchPlaceholder="Search hods…"
            defaultPlaceholder={
              !selectedDepartmentId
                ? "Select Department First"
                : hodsLoading
                  ? "Loading hods…"
                  : hods.length === 0
                    ? "No hods available for this department."
                    : "Select HOD"
            }
            emptyMessage="No hods available for this department."
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
