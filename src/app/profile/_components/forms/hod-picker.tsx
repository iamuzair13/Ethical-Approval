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

type SupervisorOption = {
  userId: string;
  facultyMemberId: string;
  sapId: string;
  name: string;
  email: string;
  designation: string | null;
  department: string;
  faculty: string | null;
};

type SupervisorPickerProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  /** Title for the section (e.g. "1.2 Supervisor's Information"). */
  sectionTitle?: string;
  /** When true, the picker is read-only (view mode). */
  readOnly?: boolean;
};

// ─── Component ───

/**
 * Reusable Department -> Supervisor -> auto-fill picker.
 *
 * Replaces the old manually-typed supervisor fields on the student thesis
 * forms (Form 1 and Form 3). The student:
 *   1. Selects a Department (populated from the centralized `departments`
 *      table — all active departments, no Faculty/Program dependency).
 *   2. Selects a Supervisor (filtered to active supervisors in that
 *      department, matched by `faculty_members.department_id`).
 *   3. The supervisor's SAP ID, name, email, faculty and department are
 *      auto-populated as read-only fields.
 *
 * The authoritative value is `form.supervisorUserId` (the admin_users id).
 * `form.supervisorDepartmentId` stores the selected department's numeric ID
 * (used for server-side validation). The snapshot text fields
 * (supervisorName, supervisorSapId, ...) are derived from the database and
 * stored on the form for display/submission, but the server re-validates
 * everything from supervisorUserId + supervisorDepartmentId alone.
 *
 * Both dropdowns include built-in client-side search (case-insensitive).
 */
export function SupervisorPicker({
  form,
  setForm,
  sectionTitle = "1.2 Supervisor's Information",
  readOnly = false,
}: SupervisorPickerProps) {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);
  const [supervisorsLoading, setSupervisorsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Track the in-flight department id so a slow response for a previous
  // department doesn't overwrite the list for the currently-selected one.
  const departmentRequestRef = useRef<string>("");

  // ─── Load departments once on mount ───
  useEffect(() => {
    let cancelled = false;
    setDepartmentsLoading(true);
    setLoadError(null);
    fetch("/api/profile/supervisor-departments")
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

  // ─── Load supervisors when the selected department changes ───
  const selectedDepartmentId = form.supervisorDepartmentId ?? "";
  useEffect(() => {
    const deptId = selectedDepartmentId.trim();
    if (!deptId) {
      setSupervisors([]);
      return;
    }
    departmentRequestRef.current = deptId;
    let cancelled = false;
    setSupervisorsLoading(true);
    setLoadError(null);
    fetch(`/api/profile/supervisors?departmentId=${encodeURIComponent(deptId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || departmentRequestRef.current !== deptId) return;
        if (!data?.ok) {
          setSupervisors([]);
          return;
        }
        setSupervisors(data.supervisors as SupervisorOption[]);
      })
      .catch(() => {
        if (cancelled || departmentRequestRef.current !== deptId) return;
        setLoadError("Failed to load supervisors.");
        setSupervisors([]);
      })
      .finally(() => {
        if (cancelled || departmentRequestRef.current !== deptId) return;
        setSupervisorsLoading(false);
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
      supervisorDepartmentId: deptId,
      supervisorDepartment: dept?.name ?? "",
      // Clear the supervisor selection and all auto-filled fields when the
      // department changes — a supervisor from the previous department must
      // not remain selected.
      supervisorUserId: "",
      supervisorSapId: "",
      supervisorName: "",
      supervisorEmail: "",
      supervisorFaculty: "",
      supervisorDesignation: "",
    }));
  };

  const handleSupervisorChange = (value: string) => {
    const userId = value;
    if (!userId) {
      setForm((prev) => ({
        ...prev,
        supervisorUserId: "",
        supervisorSapId: "",
        supervisorName: "",
        supervisorEmail: "",
        supervisorFaculty: "",
        supervisorDesignation: "",
      }));
      return;
    }
    const selected = supervisors.find((s) => s.userId === userId);
    if (!selected) return;
    setForm((prev) => ({
      ...prev,
      supervisorUserId: selected.userId,
      supervisorSapId: selected.sapId,
      supervisorName: selected.name,
      supervisorEmail: selected.email,
      supervisorFaculty: selected.faculty ?? "",
      supervisorDesignation: selected.designation ?? "",
      // Department is already set by the department dropdown, but ensure it
      // matches the supervisor's record exactly.
      supervisorDepartment: selected.department,
    }));
  };

  // ─── Build searchable options ───

  const departmentOptions: SearchableOption[] = departments.map((d) => ({
    value: String(d.id),
    label: d.name,
  }));

  const supervisorOptions: SearchableOption[] = supervisors.map((s) => ({
    value: s.userId,
    label: s.name,
    hint: s.sapId,
  }));

  // ─── Render ───

  const departmentDisabled = readOnly || departmentsLoading;
  const supervisorDisabled = readOnly || supervisorsLoading || !selectedDepartmentId;

  return (
    <FormSection title={sectionTitle}>
      <FieldRow>
        <Required label="Department *">
          <SearchableSelect
            options={departmentOptions}
            value={form.supervisorDepartmentId ?? ""}
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

        <Required label="Supervisor *">
          <SearchableSelect
            options={supervisorOptions}
            value={form.supervisorUserId ?? ""}
            onChange={handleSupervisorChange}
            disabled={supervisorDisabled}
            loading={supervisorsLoading}
            searchPlaceholder="Search supervisors…"
            defaultPlaceholder={
              !selectedDepartmentId
                ? "Select Department First"
                : supervisorsLoading
                  ? "Loading supervisors…"
                  : supervisors.length === 0
                    ? "No supervisors available for this department."
                    : "Select Supervisor"
            }
            emptyMessage="No supervisors available for this department."
            noResultsMessage='No supervisors match your search.'
          />
        </Required>
      </FieldRow>

      {loadError && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{loadError}</p>
      )}

      {/* Auto-populated read-only supervisor details */}
      <FieldRow className="mt-4">
        <Required label="SAP ID">
          <ReadOnlyInput
            value={form.supervisorSapId ?? ""}
            placeholder="Auto-filled from supervisor selection"
          />
        </Required>
        <Required label="Email">
          <ReadOnlyInput
            value={form.supervisorEmail ?? ""}
            placeholder="Auto-filled from supervisor selection"
          />
        </Required>
      </FieldRow>
      <FieldRow className="mt-4">
        <Required label="Designation">
          <ReadOnlyInput
            value={form.supervisorDesignation ?? ""}
            placeholder="Auto-filled from supervisor selection"
          />
        </Required>
         <Required label="Department">
          <ReadOnlyInput
            value={form.supervisorDepartment ?? ""}
            placeholder="Auto-filled from supervisor selection"
          />
        </Required>
      </FieldRow>
      
    </FormSection>
  );
}
