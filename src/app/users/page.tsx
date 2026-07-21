"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type AdminRole = "administrator" | "supervisor" | "ireb";
type AdminStatus = "active" | "inactive";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  sapId?: string | null;
  facultyScope: string;
  status: AdminStatus;
  facultyIds: number[];
  departmentIds: number[];
};

type Faculty = {
  id: number;
  code: string;
  name: string;
};

type Department = {
  id: number;
  faculty_id: number;
  name: string;
  faculty_name?: string;
};

type CreateUserForm = {
  name: string;
  email: string;
  password: string;
  role: AdminRole;
  sapId: string;
  facultyId: number | "";
  facultyIds: number[];
  departmentId: number | "";
  irebScopeAll: boolean;
};

type EditUserForm = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  sapId: string;
  password: string;
  facultyId: number | "";
  departmentId: number | "";
  facultyIds: number[];
  irebScopeAll: boolean;
};

const fieldClass =
  "rounded-md border border-stroke px-3 py-2 text-sm text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white";

const labelClass = "text-xs font-medium text-dark-5 dark:text-dark-6";

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="card-lift animate-fade-in-up rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card">
      <p className="text-body-sm text-dark-5">{label}</p>
      <h3 className="mt-2 text-2xl font-bold text-dark dark:text-white">{value}</h3>
      <p className="mt-1 text-sm text-dark-5">{helper}</p>
    </div>
  );
}

function Badge({
  children,
  variant,
}: {
  children: ReactNode;
  variant: "green" | "amber" | "blue";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2.5 py-1 text-xs font-medium",
        variant === "green" && "bg-[#10B981]/[0.12] text-green",
        variant === "amber" &&
          "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
        variant === "blue" && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </span>
  );
}

function ScopeFields({
  role,
  faculties,
  departments,
  facultyId,
  departmentId,
  facultyIds,
  irebScopeAll,
  onFacultyIdChange,
  onDepartmentIdChange,
  onFacultyIdsChange,
  onIrebScopeAllChange,
  idPrefix,
}: {
  role: AdminRole;
  faculties: Faculty[];
  departments: Department[];
  facultyId: number | "";
  departmentId: number | "";
  facultyIds: number[];
  irebScopeAll: boolean;
  onFacultyIdChange: (value: number | "") => void;
  onDepartmentIdChange: (value: number | "") => void;
  onFacultyIdsChange: (values: number[]) => void;
  onIrebScopeAllChange: (value: boolean) => void;
  idPrefix: string;
}) {
  const supervisorDepartments = useMemo(
    () =>
      typeof facultyId === "number"
        ? departments.filter((dep) => dep.faculty_id === facultyId)
        : [],
    [departments, facultyId],
  );

  const toggleIrebFaculty = (facultyIdToToggle: number, checked: boolean) => {
    onFacultyIdsChange(
      checked
        ? [...facultyIds, facultyIdToToggle]
        : facultyIds.filter((id) => id !== facultyIdToToggle),
    );
  };

  if (role === "administrator") {
    return (
      <p className="text-sm text-dark-5 dark:text-dark-6">
        Administrators have access to all faculties.
      </p>
    );
  }

  if (role === "supervisor") {
    return (
      <div className="grid gap-3 sm:col-span-2">
        <div>
          <label htmlFor={`${idPrefix}-faculty`} className={labelClass}>
            Faculty <span className="text-red">*</span>
          </label>
          <select
            id={`${idPrefix}-faculty`}
            value={facultyId}
            onChange={(e) => {
              onFacultyIdChange(e.target.value ? Number(e.target.value) : "");
              onDepartmentIdChange("");
            }}
            className={cn(fieldClass, "mt-1 w-full")}
            required
          >
            <option value="">Select faculty</option>
            {faculties.map((faculty) => (
              <option key={faculty.id} value={faculty.id}>
                {faculty.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-department`} className={labelClass}>
            Department <span className="text-red">*</span>
          </label>
          <select
            id={`${idPrefix}-department`}
            value={departmentId}
            onChange={(e) =>
              onDepartmentIdChange(e.target.value ? Number(e.target.value) : "")
            }
            className={cn(fieldClass, "mt-1 w-full")}
            disabled={supervisorDepartments.length === 0}
            required
          >
            <option value="">
              {typeof facultyId !== "number"
                ? "Select a faculty first"
                : supervisorDepartments.length === 0
                  ? "No departments in this faculty"
                  : "Select department"}
            </option>
            {supervisorDepartments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:col-span-2">
      <fieldset className="flex flex-wrap gap-4">
        <legend className="sr-only">IREB access scope</legend>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-dark dark:text-white">
          <input
            type="radio"
            name={`${idPrefix}-ireb-scope`}
            checked={irebScopeAll}
            onChange={() => {
              onIrebScopeAllChange(true);
              onFacultyIdsChange([]);
            }}
            className="accent-primary"
          />
          All faculties
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-dark dark:text-white">
          <input
            type="radio"
            name={`${idPrefix}-ireb-scope`}
            checked={!irebScopeAll}
            onChange={() => onIrebScopeAllChange(false)}
            className="accent-primary"
          />
          Restricted to selected faculties
        </label>
      </fieldset>

      {!irebScopeAll && (
        <>
          <div>
            <p className={labelClass}>
              Faculties <span className="text-red">*</span>
            </p>
            <p className="mb-2 text-xs text-dark-5">
              Select one or more faculties. The member can review submissions from
              all departments within each selected faculty.
            </p>
            <div
              className={cn(
                fieldClass,
                "mt-1 max-h-44 space-y-1 overflow-y-auto p-2",
              )}
            >
              {faculties.length === 0 ? (
                <p className="text-xs text-dark-5">No faculties available.</p>
              ) : (
                faculties.map((faculty) => (
                  <label
                    key={faculty.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-1 dark:hover:bg-dark-3"
                  >
                    <input
                      type="checkbox"
                      checked={facultyIds.includes(faculty.id)}
                      onChange={(e) =>
                        toggleIrebFaculty(faculty.id, e.target.checked)
                      }
                      className="accent-primary"
                    />
                    <span className="text-sm text-dark dark:text-white">
                      {faculty.name}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

        </>
      )}
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<EditUserForm | null>(null);
  const editPanelRef = useRef<HTMLFormElement>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    name: "",
    email: "",
    password: "",
    role: "supervisor",
    sapId: "",
    facultyId: "",
    facultyIds: [],
    departmentId: "",
    irebScopeAll: true,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, facultiesRes, departmentsRes] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/admin/faculties", { cache: "no-store" }),
        fetch("/api/admin/departments?all=1", { cache: "no-store" }),
      ]);

      const usersBody = (await usersRes.json()) as {
        ok: boolean;
        users?: ManagedUser[];
        error?: string;
      };
      const facultiesBody = (await facultiesRes.json()) as {
        ok: boolean;
        faculties?: Faculty[];
        error?: string;
      };
      const departmentsBody = (await departmentsRes.json()) as {
        ok: boolean;
        departments?: Department[];
        error?: string;
      };

      if (!usersRes.ok || !usersBody.ok) {
        throw new Error(usersBody.error ?? "Unable to load users.");
      }
      if (!facultiesRes.ok || !facultiesBody.ok) {
        throw new Error(facultiesBody.error ?? "Unable to load faculties.");
      }
      if (!departmentsRes.ok || !departmentsBody.ok) {
        throw new Error(departmentsBody.error ?? "Unable to load departments.");
      }

      setUsers(usersBody.users ?? []);
      setFaculties(facultiesBody.faculties ?? []);
      setDepartments(departmentsBody.departments ?? []);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Failed to load data.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!openMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-user-menu]")) {
        setOpenMenuId(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenuId]);

  const admins = users.filter((user) => user.role === "administrator");
  const supervisors = users.filter((user) => user.role === "supervisor");
  const irebMembers = users.filter((user) => user.role === "ireb");

  const resetCreateForm = () => {
    setCreateForm({
      name: "",
      email: "",
      password: "",
      role: "supervisor",
      sapId: "",
      facultyId: "",
      facultyIds: [],
      departmentId: "",
      irebScopeAll: true,
    });
  };

  const emptyScope = () => ({
    facultyId: "" as const,
    departmentId: "" as const,
    facultyIds: [] as number[],
    irebScopeAll: true,
  });

  const beginEditUser = (user: ManagedUser, focusScope = false) => {
    setEditingUser({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      sapId: user.sapId ?? "",
      password: "",
      facultyId:
        user.role === "supervisor" && user.facultyIds[0] != null ? user.facultyIds[0] : "",
      departmentId:
        user.role === "supervisor" && user.departmentIds[0] != null
          ? user.departmentIds[0]
          : "",
      facultyIds: user.role === "ireb" ? [...user.facultyIds] : [],
      irebScopeAll: user.role === "ireb" && user.facultyIds.length === 0,
    });
    setShowEditPassword(false);
    setError(null);
    requestAnimationFrame(() => {
      editPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (focusScope) {
        const scopeField = editPanelRef.current?.querySelector<HTMLElement>(
          '[data-scope-field="true"]',
        );
        scopeField?.focus();
      }
    });
  };

  const validateSupervisorScope = (facultyId: number | "", departmentId: number | "") => {
    if (typeof facultyId !== "number" || typeof departmentId !== "number") {
      return "Supervisor accounts require a faculty and department.";
    }
    return null;
  };

  const validateIrebScope = (irebScopeAll: boolean, facultyIds: number[]) => {
    if (!irebScopeAll && facultyIds.length === 0) {
      return "Select at least one faculty, or choose All faculties.";
    }
    return null;
  };

  const irebScopePayload = (irebScopeAll: boolean, facultyIds: number[]) =>
    irebScopeAll ? { facultyIds: [] as number[] } : { facultyIds };

  const onCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (createForm.role === "supervisor") {
      const scopeError = validateSupervisorScope(createForm.facultyId, createForm.departmentId);
      if (scopeError) {
        setError(scopeError);
        toast.error(scopeError);
        return;
      }
    }
    if (createForm.role === "ireb") {
      const scopeError = validateIrebScope(createForm.irebScopeAll, createForm.facultyIds);
      if (scopeError) {
        setError(scopeError);
        toast.error(scopeError);
        return;
      }
    }

    setSubmittingCreate(true);
    try {
      const payload = {
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
        sapId: createForm.sapId || null,
        facultyId:
          createForm.role === "supervisor" && createForm.facultyId !== ""
            ? createForm.facultyId
            : null,
        departmentId:
          createForm.role === "supervisor" && createForm.departmentId !== ""
            ? createForm.departmentId
            : null,
        ...(createForm.role === "ireb"
          ? irebScopePayload(createForm.irebScopeAll, createForm.facultyIds)
          : {}),
      };

      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        const message = body.error ?? "Unable to create user.";
        setError(message);
        toast.error(message);
        return;
      }

      resetCreateForm();
      await fetchData();
      toast.success("User created successfully.");
    } finally {
      setSubmittingCreate(false);
    }
  };

  const onUpdateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;
    setError(null);

    if (editingUser.role === "supervisor") {
      const scopeError = validateSupervisorScope(editingUser.facultyId, editingUser.departmentId);
      if (scopeError) {
        setError(scopeError);
        toast.error(scopeError);
        return;
      }
    }
    if (editingUser.role === "ireb") {
      const scopeError = validateIrebScope(editingUser.irebScopeAll, editingUser.facultyIds);
      if (scopeError) {
        setError(scopeError);
        toast.error(scopeError);
        return;
      }
    }

    setSubmittingEdit(true);
    try {
      const payload: Record<string, unknown> = {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        sapId: editingUser.sapId || null,
      };
      if (editingUser.password.trim()) {
        payload.password = editingUser.password;
      }
      if (editingUser.role === "supervisor") {
        payload.facultyId = editingUser.facultyId;
        payload.departmentId = editingUser.departmentId;
      }
      if (editingUser.role === "ireb") {
        Object.assign(
          payload,
          irebScopePayload(editingUser.irebScopeAll, editingUser.facultyIds),
        );
      }

      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        const message = body.error ?? "Unable to update user.";
        setError(message);
        toast.error(message);
        return;
      }

      setEditingUser(null);
      await fetchData();
      toast.success("User updated successfully.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const toggleStatus = async (user: ManagedUser) => {
    setBusyUserId(user.id);
    setOpenMenuId(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: user.status === "active" ? "inactive" : "active",
        }),
      });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        const message = body.error ?? "Unable to update user status.";
        setError(message);
        toast.error(message);
        return;
      }
      await fetchData();
      toast.success(user.status === "active" ? "User deactivated." : "User activated.");
    } finally {
      setBusyUserId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingUser(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        const message = body.error ?? "Unable to delete user.";
        setError(message);
        toast.error(message);
        return;
      }
      await fetchData();
      toast.success("User permanently deleted.");
      setDeleteTarget(null);
    } finally {
      setDeletingUser(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <Breadcrumb pageName="Users" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="animate-stagger-1">
          <StatCard
            label="Total Managed Users"
            value={String(users.length)}
            helper="Administrator, Supervisor, and IREB accounts"
          />
        </div>
        <div className="animate-stagger-2">
          <StatCard
            label="Administrators"
            value={String(admins.length)}
            helper="Full system owners"
          />
        </div>
        <div className="animate-stagger-3">
          <StatCard
            label="Supervisors"
            value={String(supervisors.length)}
            helper="Faculty-scoped reviewers"
          />
        </div>
        <div className="animate-stagger-4">
          <StatCard
            label="IREB"
            value={String(irebMembers.length)}
            helper="Central ethics review panel"
          />
        </div>
      </div>

      <div className="animate-fade-in-scale mt-6 rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-dark dark:text-white">
              User Administration
            </h3>
            <p className="mt-1 text-sm text-dark-5">
              Create users and set faculty scope in one step. Use Edit to update
              details or change assignments.
            </p>
          </div>
          <p className="text-sm text-dark-5">Administrator-only controls</p>
        </div>

               {error && (
          <div className="mb-4 rounded-md border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">
            {error}
          </div>
        )}

        <div className="mb-6 flex gap-1 border-b border-stroke dark:border-dark-3">
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={cn(
              "btn-press relative px-4 py-2.5 text-sm font-medium transition-all duration-200",
              activeTab === "list"
                ? "text-primary"
                : "text-dark-5 hover:text-dark dark:hover:text-white",
            )}
          >
            Users List
            {activeTab === "list" && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary transition-all duration-300" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={cn(
              "btn-press relative px-4 py-2.5 text-sm font-medium transition-all duration-200",
              activeTab === "create"
                ? "text-primary"
                : "text-dark-5 hover:text-dark dark:hover:text-white",
            )}
          >
            Create User
            {activeTab === "create" && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary transition-all duration-300" />
            )}
          </button>
        </div>

        {activeTab === "create" && (
        <form
          onSubmit={onCreateUser}
          className="tab-content-enter rounded-lg border border-stroke p-4 dark:border-dark-3"
        >
          <h4 className="mb-1 text-base font-semibold text-dark dark:text-white">
            Create User
          </h4>
          <p className="mb-4 text-xs text-dark-5">
            Set role and faculty scope when creating supervisor or IREB accounts.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={createForm.name}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, name: e.target.value }))
              }
              className={fieldClass}
              placeholder="Full name"
              required
            />
            <input
              value={createForm.email}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, email: e.target.value }))
              }
              className={fieldClass}
              placeholder="Email"
              type="email"
              required
            />
            <div className="flex gap-2 sm:col-span-2">
              <input
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, password: e.target.value }))
                }
                className={cn(fieldClass, "flex-1")}
                placeholder="Temporary password"
                type={showCreatePassword ? "text" : "password"}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowCreatePassword((prev) => !prev)}
                className="shrink-0 rounded-md border border-stroke px-3 py-2 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                {showCreatePassword ? "Hide" : "Show"}
              </button>
            </div>
            <div>
              <label htmlFor="create-role" className={labelClass}>
                Role
              </label>
              <select
                id="create-role"
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    role: e.target.value as AdminRole,
                    ...emptyScope(),
                  }))
                }
                className={cn(fieldClass, "mt-1 w-full")}
              >
                <option value="administrator">Administrator</option>
                <option value="supervisor">Supervisor</option>
                <option value="ireb">IREB</option>
              </select>
            </div>
            <input
              value={createForm.sapId}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, sapId: e.target.value }))
              }
              className={fieldClass}
              placeholder="SAP ID (optional)"
            />
            <ScopeFields
              role={createForm.role}
              faculties={faculties}
              departments={departments}
              facultyId={createForm.facultyId}
              departmentId={createForm.departmentId}
              facultyIds={createForm.facultyIds}
              irebScopeAll={createForm.irebScopeAll}
              idPrefix="create"
              onFacultyIdChange={(facultyId) =>
                setCreateForm((prev) => ({ ...prev, facultyId, departmentId: "" }))
              }
              onDepartmentIdChange={(departmentId) =>
                setCreateForm((prev) => ({ ...prev, departmentId }))
              }
              onFacultyIdsChange={(facultyIds) =>
                setCreateForm((prev) => ({ ...prev, facultyIds }))
              }
              onIrebScopeAllChange={(irebScopeAll) =>
                setCreateForm((prev) => ({ ...prev, irebScopeAll }))
              }
            />
          </div>
          <button
            type="submit"
            disabled={submittingCreate}
            className="btn-press mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submittingCreate ? "Creating…" : "Create User"}
          </button>
        </form>
        )}

        {activeTab === "list" && (
          <>
            {editingUser && (
          <form
            ref={editPanelRef}
            onSubmit={onUpdateUser}
            className="tab-content-enter mb-6 rounded-lg border border-primary/30 bg-primary/[0.03] p-4 dark:border-primary/40 dark:bg-primary/[0.06]"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-dark dark:text-white">
                  Edit User
                </h4>
                <p className="text-xs text-dark-5">
                  Update profile, role, password, and faculty scope together.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="shrink-0 rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Cancel
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={editingUser.name}
                onChange={(e) =>
                  setEditingUser((prev) =>
                    prev ? { ...prev, name: e.target.value } : prev,
                  )
                }
                className={fieldClass}
                placeholder="Full name"
                required
              />
              <input
                value={editingUser.email}
                onChange={(e) =>
                  setEditingUser((prev) =>
                    prev ? { ...prev, email: e.target.value } : prev,
                  )
                }
                className={fieldClass}
                placeholder="Email"
                type="email"
                required
              />
              <div>
                <label htmlFor="edit-role" className={labelClass}>
                  Role
                </label>
                <select
                  id="edit-role"
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser((prev) =>
                      prev
                        ? {
                            ...prev,
                            role: e.target.value as AdminRole,
                            ...emptyScope(),
                          }
                        : prev,
                    )
                  }
                  className={cn(fieldClass, "mt-1 w-full")}
                >
                  <option value="administrator">Administrator</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="ireb">IREB</option>
                </select>
              </div>
              <input
                value={editingUser.sapId}
                onChange={(e) =>
                  setEditingUser((prev) =>
                    prev ? { ...prev, sapId: e.target.value } : prev,
                  )
                }
                className={fieldClass}
                placeholder="SAP ID (optional)"
              />
              <div className="flex gap-2 sm:col-span-2">
                <input
                  value={editingUser.password}
                  onChange={(e) =>
                    setEditingUser((prev) =>
                      prev ? { ...prev, password: e.target.value } : prev,
                    )
                  }
                  className={cn(fieldClass, "flex-1")}
                  placeholder="New password (leave blank to keep current)"
                  type={showEditPassword ? "text" : "password"}
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword((prev) => !prev)}
                  className="shrink-0 rounded-md border border-stroke px-3 py-2 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                >
                  {showEditPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div data-scope-field="true" className="contents">
                <ScopeFields
                  role={editingUser.role}
                  faculties={faculties}
                  departments={departments}
                  facultyId={editingUser.facultyId}
                  departmentId={editingUser.departmentId}
                  facultyIds={editingUser.facultyIds}
                  irebScopeAll={editingUser.irebScopeAll}
                  idPrefix="edit"
                  onFacultyIdChange={(facultyId) =>
                    setEditingUser((prev) =>
                      prev ? { ...prev, facultyId, departmentId: "" } : prev,
                    )
                  }
                  onDepartmentIdChange={(departmentId) =>
                    setEditingUser((prev) => (prev ? { ...prev, departmentId } : prev))
                  }
                  onFacultyIdsChange={(facultyIds) =>
                    setEditingUser((prev) => (prev ? { ...prev, facultyIds } : prev))
                  }
                  onIrebScopeAllChange={(irebScopeAll) =>
                    setEditingUser((prev) => (prev ? { ...prev, irebScopeAll } : prev))
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingEdit}
              className="btn-press mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submittingEdit ? "Saving…" : "Save Changes"}
            </button>
          </form>
        )}

        <div className="tab-content-enter">
        <Table unwrapped>
          <TableHeader>
            <TableRow className="[&>th]:px-4">
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Faculty Access</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="row-hover [&>td]:px-4">
                <TableCell>
                  <p className="font-medium text-dark dark:text-white">{user.name}</p>
                  <p className="text-sm text-dark-5">{user.email}</p>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      user.role === "administrator"
                        ? "blue"
                        : user.role === "supervisor"
                          ? "amber"
                          : "green"
                    }
                  >
                    {user.role === "administrator"
                      ? "Administrator"
                      : user.role === "supervisor"
                        ? "Supervisor"
                        : "IREB"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{user.facultyScope}</TableCell>
                <TableCell>
                  <Badge variant={user.status === "active" ? "green" : "amber"}>
                    {user.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="relative inline-block" data-user-menu>
                    <button
                      type="button"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                        setOpenMenuId(openMenuId === user.id ? null : user.id);
                      }}
                      className="btn-press rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                    >
                      Actions <span className="ml-1 inline-block text-[10px]">▾</span>
                    </button>
                    {openMenuId === user.id && createPortal(
                      <div
                        data-user-menu
                        className="menu-enter fixed z-[9999] min-w-[10rem] rounded-lg border border-stroke bg-white py-1 shadow-md dark:border-dark-3 dark:bg-dark-2"
                        style={{ top: menuPos.top, right: menuPos.right }}
                      >
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          beginEditUser(user);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-dark transition hover:bg-gray-1 dark:text-white dark:hover:bg-dark-3"
                      >
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6.18 17.556a.75.75 0 01-.92-.92l.356-1.505a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                        </svg>
                        Edit
                      </button>
                      {user.role !== "administrator" && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            beginEditUser(user, true);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-dark transition hover:bg-gray-1 dark:text-white dark:hover:bg-dark-3"
                        >
                          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Edit Scope
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyUserId === user.id}
                        onClick={() => void toggleStatus(user)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-amber-500/10"
                      >
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        {user.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      <div className="my-1 border-t border-stroke dark:border-dark-3" />
                      <button
                        type="button"
                        disabled={busyUserId === user.id}
                        onClick={() => {
                          setOpenMenuId(null);
                          setDeleteTarget(user);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red transition hover:bg-red/50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-red/500/10"
                      >
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        Delete
                      </button>
                      </div>,
                      document.body,
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-dark-5">
                  No users found.
                </TableCell>
              </TableRow>
            )}
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-dark-5">
                  Loading users...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Permanently delete user?"
        description={`This will permanently remove ${deleteTarget?.name ?? ""} (${deleteTarget?.email ?? ""}) and all associated data. This action cannot be undone.`}
        confirmLabel="Delete permanently"
        confirmVariant="danger"
        isConfirming={deletingUser}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!deletingUser) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
