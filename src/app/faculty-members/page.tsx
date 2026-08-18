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
import {
  FilterMultiSelect,
  type FilterOption,
} from "@/components/ui/filter-multi-select";
import { ColumnHeaderFilter } from "@/components/ui/column-header-filter";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  MoreVertical,
  Pencil,
  Plus,
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
  dataQuality?: {
    duplicateSapId: number;
    duplicateEmail: number;
    missingSapId: number;
    missingEmail: number;
  };
};

type DataQualityFlag =
  | "duplicate_sap_id"
  | "duplicate_email"
  | "missing_sap_id"
  | "missing_email";

const DATA_QUALITY_OPTIONS: {
  value: DataQualityFlag;
  label: string;
}[] = [
  { value: "duplicate_sap_id", label: "Duplicate SAP ID" },
  { value: "duplicate_email", label: "Duplicate Email" },
  { value: "missing_sap_id", label: "Missing SAP ID" },
  { value: "missing_email", label: "Missing Email" },
];

type Stats = {
  total: number;
  active: number;
  inactive: number;
  withUser: number;
  lastSynced: string | null;
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

type OrgDepartment = { id: number; faculty_id: number | null; name: string };

type FacultyForm = {
  name: string;
  email: string;
  sapId: string;
  employeeCode: string;
  designation: string;
  departmentId: number | "";
  role: AdminRole | "";
  password: string;
  status: "active" | "inactive";
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
    departments: OrgDepartment[];
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
                SAP ID <span className="text-red">*</span>
              </span>
              <input
                value={form.sapId}
                onChange={(e) => onFormChange({ sapId: e.target.value })}
                className={inputClass}
                placeholder="SAP ID"
                required
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className={labelClass}>
                Department <span className="text-red">*</span>
              </span>
              <SearchableSelect
                options={(orgData?.departments ?? []).map((d) => ({
                  value: String(d.id),
                  label: d.name,
                }))}
                value={form.departmentId ? String(form.departmentId) : ""}
                onChange={(val) => {
                  onFormChange({
                    departmentId: val ? Number(val) : "",
                  });
                }}
                placeholder="Select department"
                searchPlaceholder="Search departments…"
                triggerClassName={selectClass}
              />
              {!form.departmentId && (
                <p className="mt-1 text-xs text-dark-5 dark:text-dark-6">
                  Department is required. It determines the supervisor's scope
                  for student application selection.
                </p>
              )}
            </div>
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
                  onFormChange({ role: val });
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
        </section>
      </form>
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
            <Skeleton className="h-4 w-24" />
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
          : "Get started by adding a faculty member manually."}
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
  departmentId: "",
  role: "",
  password: "",
  status: "active",
};

export default function FacultyMembersPage() {
  const [members, setMembers] = useState<FacultyMember[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    inactive: 0,
    withUser: 0,
    lastSynced: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [filtersLoading, setFiltersLoading] = useState(true);

  // Filters — multi-select arrays for FilterMultiSelect
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [designationFilters, setDesignationFilters] = useState<string[]>([]);
  const [dataQualityFilters, setDataQualityFilters] = useState<DataQualityFlag[]>([]);
  const [sort, setSort] = useState("name-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Form dialog state (create/edit)
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState<FacultyForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submittingForm, setSubmittingForm] = useState(false);

  // Org data for forms (departments for org assignment)
  const [orgData, setOrgData] = useState<{
    departments: OrgDepartment[];
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
          dataQuality: p.dataQuality ?? {
            duplicateSapId: 0,
            duplicateEmail: 0,
            missingSapId: 0,
            missingEmail: 0,
          },
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
    if (orgData && orgData.departments.length > 0) return;
    try {
      const dRes = await fetch("/api/admin/departments?all=1", { cache: "no-store" });
      const dBody = (await dRes.json()) as { ok: boolean; departments?: OrgDepartment[] };
      setOrgData({
        departments: dBody.ok ? (dBody.departments ?? []) : [],
      });
    } catch {
      /* ignore */
    }
  }, [orgData]);

  // Fetch org data on mount (same pattern as /organizations page)
  useEffect(() => {
    void fetchOrgData();
  }, [fetchOrgData]);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (departmentIds.length > 0) params.set("departmentId", departmentIds.join(","));
    if (statusFilters.length > 0) params.set("status", statusFilters.join(","));
    if (roleFilters.length > 0) params.set("role", roleFilters.join(","));
    if (designationFilters.length > 0) params.set("designation", designationFilters.join(","));
    if (dataQualityFilters.length > 0)
      params.set("dataQuality", dataQualityFilters.join(","));
    params.set("sort", sort);
    params.set("page", String(currentPage));
    params.set("pageSize", String(pageSize));
    return params;
  }, [
    debouncedQuery,
    departmentIds,
    statusFilters,
    roleFilters,
    designationFilters,
    dataQualityFilters,
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
          withUser: 0,
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
    departmentIds,
    statusFilters,
    roleFilters,
    designationFilters,
    dataQualityFilters,
    sort,
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Department options — no longer filtered by faculty (faculty filter removed)
  const filteredDepartments = useMemo(() => {
    if (!filterOptions) return [];
    return filterOptions.departments;
  }, [filterOptions]);

  // Build FilterOption arrays for FilterMultiSelect components
  const departmentFilterOptions: FilterOption[] = useMemo(
    () =>
      filteredDepartments.map((d) => ({
        value: String(d.id),
        label: d.name,
        count: d.count,
      })),
    [filteredDepartments],
  );

  const roleFilterOptions: FilterOption[] = useMemo(
    () =>
      (filterOptions?.roles ?? []).map((r) => ({
        value: r.value,
        label: r.label,
        count: r.count,
      })),
    [filterOptions],
  );

  const statusFilterOptions: FilterOption[] = useMemo(
    () =>
      (filterOptions?.statuses ?? []).map((s) => ({
        value: s.value,
        label: s.label,
        count: s.count,
      })),
    [filterOptions],
  );

  const designationFilterOptions: FilterOption[] = useMemo(
    () =>
      (filterOptions?.designations ?? []).map((d) => ({
        value: d.value,
        label: d.value,
        count: d.count,
      })),
    [filterOptions],
  );

  const dataQualityFilterOptions: FilterOption[] = useMemo(
    () =>
      DATA_QUALITY_OPTIONS.map((opt) => ({
        value: opt.value,
        label: opt.label,
        count:
          filterOptions?.dataQuality?.[
            opt.value === "duplicate_sap_id"
              ? "duplicateSapId"
              : opt.value === "duplicate_email"
                ? "duplicateEmail"
                : opt.value === "missing_sap_id"
                  ? "missingSapId"
                  : "missingEmail"
          ] ?? 0,
      })),
    [filterOptions],
  );

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
        departmentId: m.departmentId ?? "",
        role: (u?.role as AdminRole) ?? "",
        password: "",
        status: (u?.status as "active" | "inactive") ?? "active",
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

    // Derive supervisor faculty/department from the selected department.
    // The department's faculty_id is used as the supervisor's faculty scope.
    const selectedDept = orgData?.departments.find(
      (d) => d.id === formData.departmentId,
    );
    const supervisorFacultyId =
      formData.role === "supervisor" && selectedDept?.faculty_id
        ? Number(selectedDept.faculty_id)
        : null;
    const supervisorDepartmentId =
      formData.role === "supervisor" && formData.departmentId
        ? Number(formData.departmentId)
        : null;

    try {
      if (formMode === "create") {
        const payload = {
          name: formData.name,
          email: formData.email,
          sapId: formData.sapId,
          employeeCode: formData.employeeCode || null,
          designation: formData.designation || null,
          departmentId: formData.departmentId || null,
          role: formData.role || null,
          password: formData.password || undefined,
          status: formData.status,
          supervisorFacultyId,
          supervisorDepartmentId,
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
          departmentId: formData.departmentId || null,
          role: formData.role || null,
          password: formData.password || undefined,
          status: formData.status,
          supervisorFacultyId,
          supervisorDepartmentId,
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
    departmentIds.length > 0 ||
    statusFilters.length > 0 ||
    roleFilters.length > 0 ||
    designationFilters.length > 0 ||
    dataQualityFilters.length > 0;

  const clearFilters = () => {
    setQuery("");
    setDepartmentIds([]);
    setStatusFilters([]);
    setRoleFilters([]);
    setDesignationFilters([]);
    setDataQualityFilters([]);
    setSort("name-asc");
    setCurrentPage(1);
  };

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
            access in one place.
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
        </div>
      </div>

      {/* ─── Stat Cards ─── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="animate-stagger-1">
          <StatCard
            label="Total Faculty"
            value={String(stats.total)}
            helper="All faculty members"
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
            <div className="lg:col-span-6">
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
              <FilterMultiSelect
                label="Department"
                options={departmentFilterOptions}
                selected={departmentIds}
                onChange={(vals) => {
                  setDepartmentIds(vals);
                }}
                placeholder="All"
                searchPlaceholder="Search departments…"
                disabled={filtersLoading || filteredDepartments.length === 0}
              />
            </div>

            <div className="lg:col-span-2">
              <FilterMultiSelect
                label="Role"
                options={roleFilterOptions}
                selected={roleFilters}
                onChange={setRoleFilters}
                placeholder="All"
                searchPlaceholder="Search roles…"
                disabled={filtersLoading}
                showSelectAll={false}
              />
            </div>

            <div className="lg:col-span-2">
              <FilterMultiSelect
                label="Status"
                options={statusFilterOptions}
                selected={statusFilters}
                onChange={setStatusFilters}
                placeholder="All"
                searchPlaceholder="Search statuses…"
                disabled={filtersLoading}
                showSelectAll={false}
              />
            </div>
          </div>

          {/* Secondary row: Designation, Data Quality, Sort, Clear */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <FilterMultiSelect
                label="Designation"
                options={designationFilterOptions}
                selected={designationFilters}
                onChange={setDesignationFilters}
                placeholder="All"
                searchPlaceholder="Search designations…"
                disabled={filtersLoading}
              />
            </div>

            <div className="lg:col-span-3">
              <FilterMultiSelect
                label="Data Quality"
                options={dataQualityFilterOptions}
                selected={dataQualityFilters}
                onChange={(vals) => setDataQualityFilters(vals as DataQualityFlag[])}
                placeholder="All"
                searchPlaceholder="Search data quality…"
                disabled={filtersLoading}
                showSelectAll={false}
              />
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
            <div className="flex items-end lg:col-span-3 lg:justify-end">
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
                <TableHead className="min-w-28 whitespace-nowrap text-xs font-semibold uppercase tracking-wider">
                  SAP ID
                </TableHead>
                <TableHead className="min-w-40 whitespace-nowrap text-xs font-semibold uppercase tracking-wider">
                  Name
                </TableHead>
                <TableHead className="min-w-56 whitespace-nowrap text-xs font-semibold uppercase tracking-wider">
                  Email
                </TableHead>
                <ColumnHeaderFilter
                  label="Designation"
                  options={designationFilterOptions}
                  selected={designationFilters}
                  onChange={setDesignationFilters}
                  searchPlaceholder="Search designations…"
                  disabled={filtersLoading}
                  className="min-w-40 text-xs font-semibold uppercase tracking-wider"
                />
                <ColumnHeaderFilter
                  label="Department"
                  options={departmentFilterOptions}
                  selected={departmentIds}
                  onChange={setDepartmentIds}
                  searchPlaceholder="Search departments…"
                  disabled={filtersLoading}
                  className="min-w-48 text-xs font-semibold uppercase tracking-wider"
                />
                <ColumnHeaderFilter
                  label="Role"
                  options={roleFilterOptions}
                  selected={roleFilters}
                  onChange={setRoleFilters}
                  searchPlaceholder="Search roles…"
                  disabled={filtersLoading}
                  showSelectAll={false}
                  className="min-w-32 text-xs font-semibold uppercase tracking-wider"
                />
                <ColumnHeaderFilter
                  label="Status"
                  options={statusFilterOptions}
                  selected={statusFilters}
                  onChange={setStatusFilters}
                  searchPlaceholder="Search statuses…"
                  disabled={filtersLoading}
                  showSelectAll={false}
                  className="min-w-28 text-xs font-semibold uppercase tracking-wider"
                />
                <TableHead className="min-w-36 whitespace-nowrap text-xs font-semibold uppercase tracking-wider">
                  Last Synced
                </TableHead>
                <TableHead className="min-w-24 text-right text-xs font-semibold uppercase tracking-wider">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeletonRows count={6} />
              ) : members.length === 0 ? (
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell colSpan={9} className="p-0">
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
                      {member.department}
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
