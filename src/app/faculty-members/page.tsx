"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableTopScrollArea } from "@/components/ui/table-top-scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal, ModalButton } from "@/components/ui/modal";
import {
  Dropdown,
  DropdownClose,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";

// ─── Types ───

type AdminRole = "administrator" | "supervisor" | "ireb";

type FacultyMember = {
  id: string;
  sapId: string;
  employeeCode: string | null;
  name: string;
  email: string;
  designation: string | null;
  faculty: string | null;
  department: string;
  program: string | null;
  facultyId: number | null;
  departmentId: number | null;
  programId: number | null;
  status: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  userId: string | null;
  userRole: string | null;
  userStatus: string | null;
};

type FilterOptions = {
  faculties: { id: number; name: string; count: number }[];
  departments: { id: number; name: string; faculty_id: number; count: number }[];
  programs: { id: number; name: string; department_id: number; count: number }[];
  designations: { value: string; count: number }[];
  roles: { value: string; label: string; count: number }[];
  statuses: { value: string; label: string; count: number }[];
};

type Stats = {
  total: number;
  active: number;
  inactive: number;
  lastSynced: string | null;
};

type SyncReport = {
  totalRecords: number;
  academicEmployees: number;
  inserted: number;
  updated: number;
  facultyMapped: number;
  facultyMappingFailed: number;
  departmentNotFound: number;
  skipped: number;
  failed: number;
};

type SyncResult = {
  ok: boolean;
  syncHistoryId?: number;
  report?: SyncReport;
  error?: string;
  errorCode?: string;
};

type FacultyDetail = {
  id: string;
  sapId: string;
  employeeId: string | null;
  employeeCode: string | null;
  name: string;
  email: string;
  designation: string | null;
  faculty: string | null;
  department: string;
  program: string | null;
  facultyId: number | null;
  departmentId: number | null;
  programId: number | null;
  employeeType: string | null;
  employeeStatus: string | null;
  status: string;
  isActive: boolean;
  lastLoginAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
};

type FacultyUser = {
  id: string;
  role: string | null;
  status: string;
  tokenVersion: number | null;
};

type FacultyScope = {
  supervisorFacultyId: number | null;
  supervisorDepartmentId: number | null;
  supervisorProgramId: number | null;
  irebFacultyIds: number[];
} | null;

type OrgFaculty = { id: number; code: string; name: string };
type OrgDepartment = { id: number; faculty_id: number; name: string };
type OrgProgram = { id: number; department_id: number; name: string };

type FacultyForm = {
  name: string;
  email: string;
  sapId: string;
  employeeCode: string;
  designation: string;
  facultyId: number | "";
  departmentId: number | "";
  programId: number | "";
  role: AdminRole | "";
  password: string;
  status: "active" | "inactive";
  supervisorFacultyId: number | "";
  supervisorDepartmentId: number | "";
  supervisorProgramId: number | "";
  irebFacultyIds: number[];
  irebScopeAll: boolean;
};

// ─── Shared style constants ───

const inputClass =
  "w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark transition-colors placeholder:text-dark-5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-dark-3 dark:bg-transparent dark:text-white dark:placeholder:text-dark-6";

const selectClass =
  "w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-dark-3 dark:text-white";

const labelClass =
  "mb-1.5 block text-xs font-medium text-dark-5 dark:text-dark-6";

const sectionTitleClass =
  "mb-3 text-xs font-semibold uppercase tracking-wider text-dark-5 dark:text-dark-6";

// ─── Sub-components ───

function StatCard({
  label,
  value,
  helper,
  icon,
  accent,
}: {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
  accent: "primary" | "green" | "amber" | "neutral";
}) {
  return (
    <div className="card-lift rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-body-sm text-dark-5">{label}</p>
          <h3 className="mt-2 text-2xl font-bold text-dark dark:text-white">
            {value}
          </h3>
          <p className="mt-1 text-xs text-dark-5">{helper}</p>
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            accent === "primary" && "bg-primary/10 text-primary",
            accent === "green" && "bg-[#10B981]/[0.12] text-green",
            accent === "amber" && "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
            accent === "neutral" && "bg-gray-2 text-dark-5 dark:bg-dark-2",
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) {
    return (
      <span className="inline-flex items-center rounded-md bg-gray-2 px-2 py-0.5 text-xs font-medium text-dark-5 dark:bg-dark-2 dark:text-dark-6">
        Faculty
      </span>
    );
  }
  const label =
    role === "administrator"
      ? "Super Admin"
      : role === "supervisor"
        ? "Supervisor"
        : role === "ireb"
          ? "IREB"
          : role;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        role === "administrator" && "bg-primary/10 text-primary",
        role === "supervisor" && "bg-[#3C50E0]/10 text-[#3C50E0] dark:text-blue-400",
        role === "ireb" && "bg-[#10B981]/[0.12] text-green",
      )}
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const isActive = status === "active";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        isActive
          ? "bg-[#10B981]/[0.12] text-green"
          : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          isActive ? "bg-green" : "bg-amber-500",
        )}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// ─── Scope Fields ───

function ScopeFields({
  role,
  faculties,
  departments,
  programs,
  supervisorFacultyId,
  supervisorDepartmentId,
  supervisorProgramId,
  irebFacultyIds,
  irebScopeAll,
  onSupervisorFacultyChange,
  onSupervisorDepartmentChange,
  onSupervisorProgramChange,
  onIrebFacultyIdsChange,
  onIrebScopeAllChange,
  idPrefix,
}: {
  role: AdminRole | "";
  faculties: OrgFaculty[];
  departments: OrgDepartment[];
  programs: OrgProgram[];
  supervisorFacultyId: number | "";
  supervisorDepartmentId: number | "";
  supervisorProgramId: number | "";
  irebFacultyIds: number[];
  irebScopeAll: boolean;
  onSupervisorFacultyChange: (value: number | "") => void;
  onSupervisorDepartmentChange: (value: number | "") => void;
  onSupervisorProgramChange: (value: number | "") => void;
  onIrebFacultyIdsChange: (values: number[]) => void;
  onIrebScopeAllChange: (value: boolean) => void;
  idPrefix: string;
}) {
  const supervisorDepartments = useMemo(
    () =>
      typeof supervisorFacultyId === "number"
        ? departments.filter((dep) => Number(dep.faculty_id) === supervisorFacultyId)
        : [],
    [departments, supervisorFacultyId],
  );

  const supervisorPrograms = useMemo(
    () =>
      typeof supervisorDepartmentId === "number"
        ? programs.filter((prog) => Number(prog.department_id) === supervisorDepartmentId)
        : [],
    [programs, supervisorDepartmentId],
  );

  const toggleIrebFaculty = (facultyIdToToggle: number, checked: boolean) => {
    onIrebFacultyIdsChange(
      checked
        ? [...irebFacultyIds, facultyIdToToggle]
        : irebFacultyIds.filter((id) => id !== facultyIdToToggle),
    );
  };

  if (role === "administrator") {
    return (
      <p className="rounded-lg bg-primary/5 px-3 py-2 text-sm text-dark-5 dark:bg-primary/10 dark:text-dark-6">
        Administrators have access to all faculties and departments.
      </p>
    );
  }

  if (role === "supervisor") {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className={labelClass}>
            Supervisor Faculty <span className="text-red">*</span>
          </span>
          <select
            id={`${idPrefix}-sup-faculty`}
            value={supervisorFacultyId}
            onChange={(e) => {
              onSupervisorFacultyChange(e.target.value ? Number(e.target.value) : "");
              onSupervisorDepartmentChange("");
              onSupervisorProgramChange("");
            }}
            className={selectClass}
            required
          >
            <option value="">Select faculty</option>
            {faculties.map((faculty) => (
              <option key={faculty.id} value={faculty.id}>
                {faculty.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>
            Supervisor Department <span className="text-red">*</span>
          </span>
          <select
            id={`${idPrefix}-sup-dept`}
            value={supervisorDepartmentId}
            onChange={(e) => {
              onSupervisorDepartmentChange(e.target.value ? Number(e.target.value) : "");
              onSupervisorProgramChange("");
            }}
            className={selectClass}
            disabled={supervisorDepartments.length === 0}
            required
          >
            <option value="">
              {typeof supervisorFacultyId !== "number"
                ? "Select faculty first"
                : supervisorDepartments.length === 0
                  ? "No departments"
                  : "Select department"}
            </option>
            {supervisorDepartments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Supervisor Program</span>
          <select
            id={`${idPrefix}-sup-prog`}
            value={supervisorProgramId}
            onChange={(e) =>
              onSupervisorProgramChange(e.target.value ? Number(e.target.value) : "")
            }
            className={selectClass}
            disabled={supervisorPrograms.length === 0}
          >
            <option value="">
              {typeof supervisorDepartmentId !== "number"
                ? "Select dept first"
                : supervisorPrograms.length === 0
                  ? "No programs"
                  : "Select program"}
            </option>
            {supervisorPrograms.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  if (role === "ireb") {
    return (
      <div className="space-y-4">
        <fieldset className="flex flex-wrap gap-4">
          <legend className="sr-only">IREB access scope</legend>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-dark dark:text-white">
            <input
              type="radio"
              name={`${idPrefix}-ireb-scope`}
              checked={irebScopeAll}
              onChange={() => {
                onIrebScopeAllChange(true);
                onIrebFacultyIdsChange([]);
              }}
              className="size-4 accent-primary"
            />
            All faculties
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-dark dark:text-white">
            <input
              type="radio"
              name={`${idPrefix}-ireb-scope`}
              checked={!irebScopeAll}
              onChange={() => onIrebScopeAllChange(false)}
              className="size-4 accent-primary"
            />
            Restricted to selected faculties
          </label>
        </fieldset>

        {!irebScopeAll && (
          <div>
            <p className={labelClass}>
              Faculties <span className="text-red">*</span>
            </p>
            <p className="mb-2 text-xs text-dark-5">
              Select one or more faculties. The member can review submissions from
              all departments within each selected faculty.
            </p>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-stroke p-2 dark:border-dark-3">
              {faculties.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-dark-5">
                  No faculties available.
                </p>
              ) : (
                faculties.map((faculty) => (
                  <label
                    key={faculty.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-gray-1 dark:hover:bg-dark-2"
                  >
                    <input
                      type="checkbox"
                      checked={irebFacultyIds.includes(faculty.id)}
                      onChange={(e) =>
                        toggleIrebFaculty(faculty.id, e.target.checked)
                      }
                      className="size-4 accent-primary"
                    />
                    <span className="text-sm text-dark dark:text-white">
                      {faculty.name}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <p className="rounded-lg bg-gray-2 px-3 py-2 text-sm text-dark-5 dark:bg-dark-2 dark:text-dark-6">
      No role assigned. The user will have faculty-only access.
    </p>
  );
}

// ─── Faculty Form Dialog (Create / Edit) ───

function FacultyFormDialog({
  open,
  mode,
  form,
  orgData,
  submitting,
  onClose,
  onFormChange,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  form: FacultyForm;
  orgData: {
    faculties: OrgFaculty[];
    departments: OrgDepartment[];
    programs: OrgProgram[];
  } | null;
  submitting: boolean;
  onClose: () => void;
  onFormChange: (patch: Partial<FacultyForm>) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const isEdit = mode === "edit";
  const [showPassword, setShowPassword] = useState(false);

  // Reset show-password state when dialog opens/closes
  useEffect(() => {
    if (!open) setShowPassword(false);
  }, [open]);

  const formId = `${isEdit ? "edit" : "create"}-faculty-form`;

  const footer = (
    <>
      <ModalButton onClick={onClose} disabled={submitting}>
        Cancel
      </ModalButton>
      <ModalButton
        variant="primary"
        type="submit"
        form={formId}
        disabled={submitting}
      >
        {submitting
          ? "Saving…"
          : isEdit
            ? "Save Changes"
            : "Create Faculty Member"}
      </ModalButton>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Faculty Member" : "Add Faculty Member"}
      description={
        isEdit
          ? "Update faculty profile and user account information."
          : "Create a new faculty member with a linked user account."
      }
      size="2xl"
      footer={footer}
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-6">
        {/* Basic Information */}
        <section>
          <h4 className={sectionTitleClass}>Basic Information</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>
                Name <span className="text-red">*</span>
              </span>
              <input
                value={form.name}
                onChange={(e) => onFormChange({ name: e.target.value })}
                className={inputClass}
                placeholder="Full name"
                required
              />
            </label>
            <label className="block">
              <span className={labelClass}>
                Email <span className="text-red">*</span>
              </span>
              <input
                value={form.email}
                onChange={(e) => onFormChange({ email: e.target.value })}
                className={inputClass}
                placeholder="Email address"
                type="email"
                required
              />
            </label>
            <label className="block">
              <span className={labelClass}>
                SAP ID {isEdit ? "" : <span className="text-red">*</span>}
              </span>
              <input
                value={form.sapId}
                onChange={(e) => onFormChange({ sapId: e.target.value })}
                className={inputClass}
                placeholder="SAP ID"
                required={!isEdit}
                disabled={isEdit}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Employee Code</span>
              <input
                value={form.employeeCode}
                onChange={(e) => onFormChange({ employeeCode: e.target.value })}
                className={inputClass}
                placeholder="Employee code"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>Designation</span>
              <input
                value={form.designation}
                onChange={(e) => onFormChange({ designation: e.target.value })}
                className={inputClass}
                placeholder="Designation / job title"
              />
            </label>
          </div>
        </section>

        {/* Organization */}
        <section>
          <h4 className={sectionTitleClass}>Organization</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={labelClass}>Faculty</span>
              <select
                value={form.facultyId}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : "";
                  onFormChange({ facultyId: val, departmentId: "", programId: "" });
                }}
                className={selectClass}
              >
                <option value="">Select faculty</option>
                {(orgData?.faculties ?? []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Department</span>
              <select
                value={form.departmentId}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : "";
                  onFormChange({ departmentId: val, programId: "" });
                }}
                className={selectClass}
                disabled={!form.facultyId}
              >
                <option value="">Select department</option>
                {(orgData?.departments ?? [])
                  .filter(
                    (d) =>
                      !form.facultyId || d.faculty_id === form.facultyId,
                  )
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Program</span>
              <select
                value={form.programId}
                onChange={(e) =>
                  onFormChange({
                    programId: e.target.value ? Number(e.target.value) : "",
                  })
                }
                className={selectClass}
                disabled={!form.departmentId}
              >
                <option value="">Select program</option>
                {(orgData?.programs ?? [])
                  .filter(
                    (p) =>
                      !form.departmentId ||
                      p.department_id === form.departmentId,
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        </section>

        {/* User Account */}
        <section>
          <h4 className={sectionTitleClass}>Account Information</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Role</span>
              <select
                value={form.role}
                onChange={(e) => {
                  const val = e.target.value as AdminRole | "";
                  onFormChange({
                    role: val,
                    supervisorFacultyId: "",
                    supervisorDepartmentId: "",
                    supervisorProgramId: "",
                    irebFacultyIds: [],
                    irebScopeAll: true,
                  });
                }}
                className={selectClass}
              >
                <option value="">No admin role (faculty only)</option>
                <option value="administrator">Administrator</option>
                <option value="supervisor">Supervisor</option>
                <option value="ireb">IREB</option>
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Account Status</span>
              <select
                value={form.status}
                onChange={(e) =>
                  onFormChange({
                    status: e.target.value as "active" | "inactive",
                  })
                }
                className={selectClass}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <div className="sm:col-span-2">
              <span className={labelClass}>Password</span>
              <div className="flex gap-2">
                <input
                  value={form.password}
                  onChange={(e) => onFormChange({ password: e.target.value })}
                  className={inputClass}
                  placeholder={
                    isEdit
                      ? "New password (leave blank to keep current)"
                      : "Password (optional — leave blank for SSO only)"
                  }
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="btn-press shrink-0 rounded-lg border border-stroke px-3 py-2 text-xs font-medium text-dark-5 transition hover:bg-gray-1 dark:border-dark-3 dark:hover:bg-dark-2"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          {/* Role Scope */}
          {form.role && (
            <div className="mt-4">
              <p className={labelClass}>Role Scope</p>
              <ScopeFields
                role={form.role}
                faculties={orgData?.faculties ?? []}
                departments={orgData?.departments ?? []}
                programs={orgData?.programs ?? []}
                supervisorFacultyId={form.supervisorFacultyId}
                supervisorDepartmentId={form.supervisorDepartmentId}
                supervisorProgramId={form.supervisorProgramId}
                irebFacultyIds={form.irebFacultyIds}
                irebScopeAll={form.irebScopeAll}
                idPrefix={isEdit ? "edit" : "create"}
                onSupervisorFacultyChange={(val) =>
                  onFormChange({
                    supervisorFacultyId: val,
                    supervisorDepartmentId: "",
                    supervisorProgramId: "",
                  })
                }
                onSupervisorDepartmentChange={(val) =>
                  onFormChange({
                    supervisorDepartmentId: val,
                    supervisorProgramId: "",
                  })
                }
                onSupervisorProgramChange={(val) =>
                  onFormChange({ supervisorProgramId: val })
                }
                onIrebFacultyIdsChange={(val) =>
                  onFormChange({ irebFacultyIds: val })
                }
                onIrebScopeAllChange={(val) =>
                  onFormChange({ irebScopeAll: val })
                }
              />
            </div>
          )}
        </section>
      </form>
    </Modal>
  );
}

// ─── Sync Result Dialog ───

function SyncResultDialog({
  open,
  result,
  onClose,
}: {
  open: boolean;
  result: SyncResult | null;
  onClose: () => void;
}) {
  const success = result?.ok ?? false;
  const r = result?.report;
  const stats = success && r
    ? [
        { label: "Total Records", value: r.totalRecords, variant: "blue" as const },
        { label: "Academic Employees", value: r.academicEmployees, variant: "blue" as const },
        { label: "Inserted", value: r.inserted, variant: "green" as const },
        { label: "Updated", value: r.updated, variant: "blue" as const },
        { label: "Faculty Mapped", value: r.facultyMapped, variant: "green" as const },
        { label: "Faculty Mapping Failed", value: r.facultyMappingFailed, variant: "amber" as const },
        { label: "Department Not Found", value: r.departmentNotFound, variant: "amber" as const },
        { label: "Skipped", value: r.skipped, variant: "amber" as const },
        { label: "Failed", value: r.failed, variant: "amber" as const },
      ]
    : [];

  const footer = (
    <ModalButton variant="primary" onClick={onClose}>
      Close
    </ModalButton>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={success ? "Sync Complete" : "Sync Failed"}
      size="md"
      footer={footer}
    >
      {success ? (
        <>
          <p className="text-sm text-dark-5 dark:text-dark-6">
            Faculty member synchronization from SAP has completed. The report
            below shows counts for each stage of the filtering and mapping
            pipeline.
          </p>
          <div className="mt-4 space-y-2">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between rounded-lg border border-stroke px-3 py-2 dark:border-dark-3"
              >
                <span className="text-sm text-dark-5">{s.label}</span>
                <span
                  className={cn(
                    "inline-flex rounded-md px-2.5 py-0.5 text-xs font-semibold tabular-nums",
                    s.variant === "green" && "bg-[#10B981]/[0.12] text-green",
                    s.variant === "amber" && "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
                    s.variant === "blue" && "bg-primary/10 text-primary",
                  )}
                >
                  {String(s.value)}
                </span>
              </div>
            ))}
          </div>
          {r && r.facultyMappingFailed > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              {r.facultyMappingFailed} faculty member(s) were saved without
              faculty/department mapping because their SAP department could not
              be matched to the organization hierarchy. These members will be
              automatically mapped on the next sync if the department is added
              to the system.
            </p>
          )}
        </>
      ) : (
        <p className="rounded-lg bg-red/5 px-3 py-2 text-sm text-red dark:bg-red/10">
          {result?.error === "SAP_TIMEOUT"
            ? "SAP did not respond within the timeout period. The SAP server may be slow or unavailable. Please try again later."
            : result?.error === "SAP_ERROR"
              ? "The SAP service returned an error or could not be reached. Check server logs for details."
              : result?.error ?? result?.errorCode ?? "An unexpected error occurred during sync."}
        </p>
      )}
    </Modal>
  );
}

// ─── Row Actions Dropdown ───

function RowActions({
  member,
  busy,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  member: FacultyMember;
  busy: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuItemClass =
    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition hover:bg-gray-50 dark:hover:bg-gray-700";

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger
        aria-label={`Actions for ${member.name}`}
        className="btn-press inline-flex items-center justify-center rounded-lg border border-stroke p-1.5 text-dark-5 transition hover:bg-gray-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-dark-3 dark:hover:bg-dark-2"
      >
        <MoreVertical className="size-4" aria-hidden />
      </DropdownTrigger>
      <DropdownContent
        portalled
        align="end"
        placement="bottom"
        className="w-48 overflow-hidden rounded-lg border border-stroke bg-white p-1 shadow-lg dark:border-dark-3 dark:bg-dark-2"
      >
        <DropdownClose>
          <button
            type="button"
            onClick={onEdit}
            className={cn(menuItemClass, "text-dark dark:text-white")}
          >
            <Pencil className="size-4 shrink-0" aria-hidden />
            Edit
          </button>
        </DropdownClose>
        <DropdownClose>
          <button
            type="button"
            disabled={busy}
            onClick={onToggleStatus}
            className={cn(
              menuItemClass,
              "text-amber-600 dark:text-amber-400 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {member.userStatus === "active" ? (
              <UserMinus className="size-4 shrink-0" aria-hidden />
            ) : (
              <UserPlus className="size-4 shrink-0" aria-hidden />
            )}
            {member.userStatus === "active" ? "Deactivate" : "Activate"}
          </button>
        </DropdownClose>
        <div className="my-1 border-t border-stroke dark:border-dark-3" />
        <DropdownClose>
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className={cn(
              menuItemClass,
              "text-red dark:text-red-400 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <Trash2 className="size-4 shrink-0" aria-hidden />
            Delete
          </button>
        </DropdownClose>
      </DropdownContent>
    </Dropdown>
  );
}

// ─── Skeleton Table Rows ───

function TableSkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          <TableCell className="py-3.5">
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell className="py-3.5">
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell className="py-3.5">
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell className="py-3.5">
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell className="py-3.5">
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell className="py-3.5">
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell className="py-3.5">
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell className="py-3.5">
            <Skeleton className="h-5 w-20 rounded-md" />
          </TableCell>
          <TableCell className="py-3.5">
            <Skeleton className="h-5 w-16 rounded-md" />
          </TableCell>
          <TableCell className="py-3.5">
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell className="py-3.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ─── Empty State ───

function EmptyState({
  hasFilters,
  onAdd,
  onClearFilters,
}: {
  hasFilters: boolean;
  onAdd: () => void;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-gray-2 dark:bg-dark-2">
        <Users className="size-8 text-dark-5" aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-semibold text-dark dark:text-white">
        {hasFilters ? "No matching faculty members" : "No faculty members yet"}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-dark-5">
        {hasFilters
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Get started by adding a faculty member manually, or sync from SAP to import all academic employees."}
      </p>
      <div className="mt-5 flex gap-2">
        {hasFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="btn-press rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark-5 transition hover:bg-gray-1 dark:border-dark-3 dark:hover:bg-dark-2"
          >
            Clear filters
          </button>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className="btn-press inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
          >
            <Plus className="size-4" aria-hidden />
            Add Faculty Member
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───

const emptyForm: FacultyForm = {
  name: "",
  email: "",
  sapId: "",
  employeeCode: "",
  designation: "",
  facultyId: "",
  departmentId: "",
  programId: "",
  role: "",
  password: "",
  status: "active",
  supervisorFacultyId: "",
  supervisorDepartmentId: "",
  supervisorProgramId: "",
  irebFacultyIds: [],
  irebScopeAll: true,
};

export default function FacultyMembersPage() {
  const [members, setMembers] = useState<FacultyMember[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    inactive: 0,
    lastSynced: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [filtersLoading, setFiltersLoading] = useState(true);

  // Filters
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [programId, setProgramId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [sort, setSort] = useState("name-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Sync state
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showSyncResult, setShowSyncResult] = useState(false);

  // Form dialog state (create/edit)
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState<FacultyForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submittingForm, setSubmittingForm] = useState(false);

  // Org data for forms
  const [orgData, setOrgData] = useState<{
    faculties: OrgFaculty[];
    departments: OrgDepartment[];
    programs: OrgProgram[];
  } | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<FacultyMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Status toggle busy state
  const [busyId, setBusyId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  // Load filter options (data-driven, with counts). Called on mount and
  // after any CRUD operation so new records appear automatically.
  const refreshFilterOptions = useCallback(async () => {
    setFiltersLoading(true);
    try {
      const r = await fetch("/api/admin/faculty-members/filters", { cache: "no-store" });
      const p = (await r.json()) as { ok: boolean } & Partial<FilterOptions>;
      if (p.ok) {
        setFilterOptions({
          faculties: p.faculties ?? [],
          departments: p.departments ?? [],
          programs: p.programs ?? [],
          designations: p.designations ?? [],
          roles: p.roles ?? [],
          statuses: p.statuses ?? [],
        });
      }
    } catch {
      /* ignore — filters will just be empty */
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshFilterOptions();
  }, [refreshFilterOptions]);

  // Load org data for forms
  const fetchOrgData = useCallback(async () => {
    if (orgData) return;
    try {
      const [fRes, dRes, pRes] = await Promise.all([
        fetch("/api/admin/faculties", { cache: "no-store" }),
        fetch("/api/admin/departments?all=1", { cache: "no-store" }),
        fetch("/api/admin/programs?all=1", { cache: "no-store" }),
      ]);
      const fBody = (await fRes.json()) as { ok: boolean; faculties?: OrgFaculty[] };
      const dBody = (await dRes.json()) as { ok: boolean; departments?: OrgDepartment[] };
      const pBody = (await pRes.json()) as { ok: boolean; programs?: OrgProgram[] };
      if (fBody.ok && dBody.ok && pBody.ok) {
        setOrgData({
          faculties: fBody.faculties ?? [],
          departments: dBody.departments ?? [],
          programs: pBody.programs ?? [],
        });
      }
    } catch {
      /* ignore */
    }
  }, [orgData]);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (facultyId) params.set("facultyId", facultyId);
    if (departmentId) params.set("departmentId", departmentId);
    if (programId) params.set("programId", programId);
    if (statusFilter) params.set("status", statusFilter);
    if (roleFilter) params.set("role", roleFilter);
    if (designationFilter) params.set("designation", designationFilter);
    params.set("sort", sort);
    params.set("page", String(currentPage));
    params.set("pageSize", String(pageSize));
    return params;
  }, [
    debouncedQuery,
    facultyId,
    departmentId,
    programId,
    statusFilter,
    roleFilter,
    designationFilter,
    sort,
    currentPage,
  ]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/faculty-members?${buildParams().toString()}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        ok: boolean;
        members?: FacultyMember[];
        total?: number;
        stats?: Stats;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Unable to load faculty members.");
        return;
      }
      setMembers(payload.members ?? []);
      setTotal(payload.total ?? 0);
      setStats(
        payload.stats ?? {
          total: 0,
          active: 0,
          inactive: 0,
          lastSynced: null,
        },
      );
    } catch {
      setError("Network error while loading faculty members.");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedQuery,
    facultyId,
    departmentId,
    programId,
    statusFilter,
    roleFilter,
    designationFilter,
    sort,
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Cascading department/program options
  const filteredDepartments = useMemo(
    () =>
      filterOptions
        ? facultyId
          ? filterOptions.departments.filter(
              (d) => String(d.faculty_id) === facultyId,
            )
          : filterOptions.departments
        : [],
    [filterOptions, facultyId],
  );

  const filteredPrograms = useMemo(
    () =>
      filterOptions
        ? departmentId
          ? filterOptions.programs.filter(
              (p) => String(p.department_id) === departmentId,
            )
          : facultyId
            ? filterOptions.programs.filter((p) => {
                const dept = filterOptions.departments.find(
                  (d) => String(d.id) === String(p.department_id),
                );
                return dept && String(dept.faculty_id) === facultyId;
              })
            : filterOptions.programs
        : [],
    [filterOptions, facultyId, departmentId],
  );

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000);
      let response: Response;
      try {
        response = await fetch("/api/admin/sync-faculty-members", {
          method: "POST",
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      const payload = (await response.json()) as SyncResult;
      setSyncResult(payload);
      setShowSyncResult(true);
      if (payload.ok) {
        toast.success("Faculty sync completed.");
        await Promise.all([fetchMembers(), refreshFilterOptions()]);
      } else {
        toast.error(payload.error ?? payload.errorCode ?? "Sync failed.");
      }
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      const failResult: SyncResult = {
        ok: false,
        error: isAbort ? "SAP_TIMEOUT" : "Network error during sync.",
      };
      setSyncResult(failResult);
      setShowSyncResult(true);
      toast.error(
        isAbort
          ? "Sync timed out. SAP may be slow or unavailable."
          : "Network error during sync.",
      );
    } finally {
      setSyncing(false);
      setShowSyncConfirm(false);
    }
  };

  // ─── Create / Edit handlers ───

  const openCreateForm = async () => {
    await fetchOrgData();
    setFormData({ ...emptyForm });
    setFormMode("create");
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = async (member: FacultyMember) => {
    await fetchOrgData();
    try {
      const res = await fetch(`/api/admin/faculty-members/${member.id}`, {
        cache: "no-store",
      });
      const payload = (await res.json()) as {
        ok: boolean;
        member?: FacultyDetail;
        user?: FacultyUser;
        scope?: FacultyScope;
        error?: string;
      };
      if (!payload.ok || !payload.member) {
        toast.error(payload.error ?? "Unable to load faculty member details.");
        return;
      }

      const m = payload.member;
      const u = payload.user;
      const s = payload.scope;

      setFormData({
        name: m.name,
        email: m.email,
        sapId: m.sapId,
        employeeCode: m.employeeCode ?? "",
        designation: m.designation ?? "",
        facultyId: m.facultyId ?? "",
        departmentId: m.departmentId ?? "",
        programId: m.programId ?? "",
        role: (u?.role as AdminRole) ?? "",
        password: "",
        status: (u?.status as "active" | "inactive") ?? "active",
        supervisorFacultyId: s?.supervisorFacultyId ?? "",
        supervisorDepartmentId: s?.supervisorDepartmentId ?? "",
        supervisorProgramId: s?.supervisorProgramId ?? "",
        irebFacultyIds: s?.irebFacultyIds ?? [],
        irebScopeAll: (s?.irebFacultyIds ?? []).length === 0,
      });
      setFormMode("edit");
      setEditingId(member.id);
      setShowForm(true);
    } catch {
      toast.error("Network error while loading details.");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingForm(true);
    setError(null);

    try {
      if (formMode === "create") {
        const payload = {
          name: formData.name,
          email: formData.email,
          sapId: formData.sapId,
          employeeCode: formData.employeeCode || null,
          designation: formData.designation || null,
          facultyId: formData.facultyId || null,
          departmentId: formData.departmentId || null,
          programId: formData.programId || null,
          role: formData.role || null,
          password: formData.password || undefined,
          status: formData.status,
          supervisorFacultyId:
            formData.role === "supervisor"
              ? formData.supervisorFacultyId || null
              : null,
          supervisorDepartmentId:
            formData.role === "supervisor"
              ? formData.supervisorDepartmentId || null
              : null,
          supervisorProgramId:
            formData.role === "supervisor"
              ? formData.supervisorProgramId || null
              : null,
          irebFacultyIds:
            formData.role === "ireb" ? formData.irebFacultyIds : [],
        };

        const res = await fetch("/api/admin/faculty-members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await res.json()) as { ok: boolean; error?: string };
        if (!res.ok || !body.ok) {
          const msg = body.error ?? "Unable to create faculty member.";
          setError(msg);
          toast.error(msg);
          return;
        }
        toast.success("Faculty member created successfully.");
      } else if (formMode === "edit" && editingId) {
        const payload = {
          name: formData.name,
          email: formData.email,
          designation: formData.designation || null,
          facultyId: formData.facultyId || null,
          departmentId: formData.departmentId || null,
          programId: formData.programId || null,
          role: formData.role || null,
          password: formData.password || undefined,
          status: formData.status,
          supervisorFacultyId:
            formData.role === "supervisor"
              ? formData.supervisorFacultyId || null
              : null,
          supervisorDepartmentId:
            formData.role === "supervisor"
              ? formData.supervisorDepartmentId || null
              : null,
          supervisorProgramId:
            formData.role === "supervisor"
              ? formData.supervisorProgramId || null
              : null,
          irebFacultyIds:
            formData.role === "ireb" ? formData.irebFacultyIds : [],
        };

        const res = await fetch(`/api/admin/faculty-members/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await res.json()) as { ok: boolean; error?: string };
        if (!res.ok || !body.ok) {
          const msg = body.error ?? "Unable to update faculty member.";
          setError(msg);
          toast.error(msg);
          return;
        }
        toast.success("Faculty member updated successfully.");
      }

      setShowForm(false);
      await Promise.all([fetchMembers(), refreshFilterOptions()]);
    } finally {
      setSubmittingForm(false);
    }
  };

  // ─── Status toggle ───

  const toggleStatus = async (member: FacultyMember) => {
    setBusyId(member.id);
    setError(null);
    try {
      const newStatus =
        member.userStatus === "active" ? "inactive" : "active";
      const res = await fetch(`/api/admin/faculty-members/${member.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !body.ok) {
        const msg = body.error ?? "Unable to update status.";
        setError(msg);
        toast.error(msg);
        return;
      }
      await Promise.all([fetchMembers(), refreshFilterOptions()]);
      toast.success(
        newStatus === "active" ? "Account activated." : "Account deactivated.",
      );
    } finally {
      setBusyId(null);
    }
  };

  // ─── Delete ───

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/faculty-members/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !body.ok) {
        const msg = body.error ?? "Unable to delete faculty member.";
        setError(msg);
        toast.error(msg);
        return;
      }
      await Promise.all([fetchMembers(), refreshFilterOptions()]);
      toast.success("Faculty member deleted.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const hasActiveFilters =
    debouncedQuery ||
    facultyId ||
    departmentId ||
    programId ||
    statusFilter ||
    roleFilter ||
    designationFilter;

  const clearFilters = () => {
    setQuery("");
    setFacultyId("");
    setDepartmentId("");
    setProgramId("");
    setStatusFilter("");
    setRoleFilter("");
    setDesignationFilter("");
    setSort("name-asc");
    setCurrentPage(1);
  };

  // Sync confirm footer
  const syncConfirmFooter = (
    <>
      <ModalButton
        onClick={() => {
          if (!syncing) setShowSyncConfirm(false);
        }}
        disabled={syncing}
      >
        Cancel
      </ModalButton>
      <ModalButton
        variant="primary"
        onClick={() => void handleSync()}
        disabled={syncing}
      >
        {syncing ? "Syncing…" : "Start sync"}
      </ModalButton>
    </>
  );

  // Delete confirm footer
  const deleteConfirmFooter = (
    <>
      <ModalButton
        onClick={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        disabled={deleting}
      >
        Cancel
      </ModalButton>
      <ModalButton
        variant="danger"
        onClick={() => void confirmDelete()}
        disabled={deleting}
      >
        {deleting ? "Deleting…" : "Delete permanently"}
      </ModalButton>
    </>
  );

  return (
    <div className="mx-auto w-full max-w-[1250px]">
      {/* ─── Page Header ─── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-dark dark:text-white sm:text-2xl">
            Faculty Member Administration
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-dark-5 dark:text-dark-6">
            Manage faculty profiles, user accounts, roles, and organization
            access in one place. Use sync to refresh from SAP.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={openCreateForm}
            className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
          >
            <Plus className="size-4" aria-hidden />
            Add Faculty Member
          </button>
          <button
            type="button"
            disabled={syncing}
            onClick={() => setShowSyncConfirm(true)}
            className="btn-press inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCw
              className={cn("size-4", syncing && "animate-spin")}
              aria-hidden
            />
            {syncing ? "Syncing…" : "Sync from SAP"}
          </button>
        </div>
      </div>

      {/* ─── Stat Cards ─── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="animate-stagger-1">
          <StatCard
            label="Total Faculty"
            value={String(stats.total)}
            helper="All synced from SAP"
            icon={<Users className="size-5" aria-hidden />}
            accent="primary"
          />
        </div>
        <div className="animate-stagger-2">
          <StatCard
            label="Active"
            value={String(stats.active)}
            helper="Currently eligible"
            icon={<Check className="size-5" aria-hidden />}
            accent="green"
          />
        </div>
        <div className="animate-stagger-3">
          <StatCard
            label="Inactive"
            value={String(stats.inactive)}
            helper="Deactivated or left"
            icon={<UserMinus className="size-5" aria-hidden />}
            accent="amber"
          />
        </div>
        <div className="animate-stagger-4">
          <StatCard
            label={""}
            value={
              stats.lastSynced ? formatDate(stats.lastSynced) : "Never"
            }
            helper="Most recent SAP sync"
            icon={<RefreshCw className="size-5" aria-hidden />}
            accent="neutral"
          />
        </div>
      </div>

      {/* ─── Main Card: Filters + Table ─── */}
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-5 rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">
            {error}
          </div>
        )}

        {/* ─── Filter Toolbar ─── */}
        <div className="border-b border-stroke p-5 dark:border-dark-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            {/* Search — spans more on large screens */}
            <div className="lg:col-span-4">
              <label className="block">
                <span className={labelClass}>Search</span>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dark-5"
                    aria-hidden
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Name, email, SAP ID…"
                    className={cn(inputClass, "pl-9")}
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-dark-5 transition hover:bg-gray-1 dark:hover:bg-dark-2"
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  )}
                </div>
              </label>
            </div>

            <div className="lg:col-span-2">
              <label className="block">
                <span className={labelClass}>Faculty</span>
                <select
                  value={facultyId}
                  onChange={(e) => {
                    setFacultyId(e.target.value);
                    setDepartmentId("");
                    setProgramId("");
                  }}
                  className={selectClass}
                  disabled={filtersLoading}
                >
                  <option value="">All</option>
                  {(filterOptions?.faculties ?? []).map((f) => (
                    <option key={f.id} value={String(f.id)}>
                      {f.name} ({f.count})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="lg:col-span-2">
              <label className="block">
                <span className={labelClass}>Department</span>
                <select
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    setProgramId("");
                  }}
                  className={selectClass}
                  disabled={filtersLoading || filteredDepartments.length === 0}
                >
                  <option value="">All</option>
                  {filteredDepartments.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.name} ({d.count})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="lg:col-span-2">
              <label className="block">
                <span className={labelClass}>Role</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className={selectClass}
                  disabled={filtersLoading}
                >
                  <option value="">All</option>
                  {(filterOptions?.roles ?? []).map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} ({r.count})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="lg:col-span-2">
              <label className="block">
                <span className={labelClass}>Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={selectClass}
                  disabled={filtersLoading}
                >
                  <option value="">All</option>
                  {(filterOptions?.statuses ?? []).map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label} ({s.count})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Secondary row: Designation, Sort, Clear */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <label className="block">
                <span className={labelClass}>Designation</span>
                <select
                  value={designationFilter}
                  onChange={(e) => setDesignationFilter(e.target.value)}
                  className={selectClass}
                  disabled={filtersLoading}
                >
                  <option value="">All</option>
                  {(filterOptions?.designations ?? []).map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.value} ({d.count})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="lg:col-span-3">
              <label className="block">
                <span className={labelClass}>Sort by</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className={selectClass}
                >
                  <option value="name-asc">Name (A–Z)</option>
                  <option value="name-desc">Name (Z–A)</option>
                  <option value="sap-id-asc">SAP ID (low–high)</option>
                  <option value="sap-id-desc">SAP ID (high–low)</option>
                  <option value="email-asc">Email (A–Z)</option>
                  <option value="email-desc">Email (Z–A)</option>
                  <option value="synced-desc">Last synced (newest)</option>
                  <option value="synced-asc">Last synced (oldest)</option>
                </select>
              </label>
            </div>
            <div className="flex items-end lg:col-span-6 lg:justify-end">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-stroke px-3 py-2 text-sm font-medium text-dark-5 transition hover:bg-gray-1 dark:border-dark-3 dark:hover:bg-dark-2"
                >
                  <X className="size-4" aria-hidden />
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── Table ─── */}
        <TableTopScrollArea maxHeight="560px" className="border-b border-stroke dark:border-dark-3">
          <Table unwrapped>
            <TableHeader className="sticky top-0 z-10 bg-white dark:bg-gray-dark">
              <TableRow className="[&>th]:px-4 [&>th]:py-3">
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider">
                  SAP ID
                </TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider">
                  Name
                </TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider">
                  Email
                </TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider">
                  Designation
                </TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider">
                  Faculty
                </TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider">
                  Department
                </TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider">
                  Program
                </TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider">
                  Role
                </TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider">
                  Last Synced
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeletonRows count={6} />
              ) : members.length === 0 ? (
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell colSpan={11} className="p-0">
                    <EmptyState
                      hasFilters={Boolean(hasActiveFilters)}
                      onAdd={openCreateForm}
                      onClearFilters={clearFilters}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow
                    key={member.id}
                    className="row-hover [&>td]:px-4 [&>td]:py-3 align-middle"
                  >
                    <TableCell className="whitespace-nowrap font-mono text-xs text-dark-5 dark:text-dark-6">
                      {member.sapId}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      <span className="font-medium text-dark dark:text-white">
                        {member.name}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-dark-5">
                      {member.email}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-dark-5">
                      {member.designation ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-dark-5">
                      {member.faculty ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-dark-5">
                      {member.department}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-dark-5">
                      {member.program ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <RoleBadge role={member.userRole} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <StatusBadge status={member.userStatus ?? member.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-dark-5">
                      {formatDate(member.lastSyncedAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <RowActions
                        member={member}
                        busy={busyId === member.id}
                        onEdit={() => void openEditForm(member)}
                        onToggleStatus={() => void toggleStatus(member)}
                        onDelete={() => setDeleteTarget(member)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableTopScrollArea>

        {/* ─── Pagination ─── */}
        {!loading && total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 px-5 py-4 sm:flex-row">
            <p className="text-sm text-dark-5">
              Showing {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="btn-press rounded-lg border border-stroke px-3 py-1.5 text-sm font-medium text-dark-5 transition hover:bg-gray-1 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:hover:bg-dark-2"
              >
                Previous
              </button>
              <span className="text-sm tabular-nums text-dark-5">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className="btn-press rounded-lg border border-stroke px-3 py-1.5 text-sm font-medium text-dark-5 transition hover:bg-gray-1 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:hover:bg-dark-2"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Dialogs ─── */}

      {/* Sync Confirmation */}
      <Modal
        open={showSyncConfirm}
        onClose={() => {
          if (!syncing) setShowSyncConfirm(false);
        }}
        title="Sync faculty members from SAP?"
        size="md"
        footer={syncConfirmFooter}
      >
        <p className="text-sm text-dark-5 dark:text-dark-6">
          This will fetch all employees from the SAP Employee API (can be
          80,000+ records), filter for academic faculty, map departments to the
          organization hierarchy, and upsert eligible records. This may take up
          to 5 minutes. Do not close or navigate away from this page during sync.
        </p>
      </Modal>

      {/* Sync Result */}
      <SyncResultDialog
        open={showSyncResult}
        result={syncResult}
        onClose={() => {
          setShowSyncResult(false);
          setSyncResult(null);
        }}
      />

      {/* Create / Edit Form */}
      <FacultyFormDialog
        open={showForm}
        mode={formMode}
        form={formData}
        orgData={orgData}
        submitting={submittingForm}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
        }}
        onFormChange={(patch) =>
          setFormData((prev) => ({ ...prev, ...patch }))
        }
        onSubmit={(e) => void handleFormSubmit(e)}
      />

      {/* Delete Confirmation */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        title="Delete faculty member?"
        size="md"
        footer={deleteConfirmFooter}
      >
        <p className="text-sm text-dark-5 dark:text-dark-6">
          This will permanently remove{" "}
          <span className="font-semibold text-dark dark:text-white">
            {deleteTarget?.name ?? ""}
          </span>{" "}
          ({deleteTarget?.email ?? ""}), their faculty profile, and linked user
          account. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
