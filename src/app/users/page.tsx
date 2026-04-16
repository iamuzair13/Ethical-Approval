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
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

type AdminRole = "administrator" | "dean" | "ireb";
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
};

type Faculty = {
  id: number;
  code: string;
  name: string;
};

type CreateUserForm = {
  name: string;
  email: string;
  password: string;
  role: AdminRole;
  sapId: string;
  facultyId: number | "";
  facultyIds: number[];
};

type EditUserForm = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  sapId: string;
  password: string;
};

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
    <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card">
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

export default function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [selectedAssignUser, setSelectedAssignUser] = useState<string>("");
  const [assignFacultyId, setAssignFacultyId] = useState<number | "">("");
  const [assignFacultyIds, setAssignFacultyIds] = useState<number[]>([]);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<EditUserForm | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    name: "",
    email: "",
    password: "",
    role: "dean",
    sapId: "",
    facultyId: "",
    facultyIds: [],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, facultiesRes] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/admin/faculties", { cache: "no-store" }),
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

      if (!usersRes.ok || !usersBody.ok) {
        throw new Error(usersBody.error ?? "Unable to load users.");
      }
      if (!facultiesRes.ok || !facultiesBody.ok) {
        throw new Error(facultiesBody.error ?? "Unable to load faculties.");
      }

      setUsers(usersBody.users ?? []);
      setFaculties(facultiesBody.faculties ?? []);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : "Failed to load data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedAssignUser),
    [users, selectedAssignUser],
  );

  const admins = users.filter((user) => user.role === "administrator");
  const deans = users.filter((user) => user.role === "dean");
  const irebMembers = users.filter((user) => user.role === "ireb");

  const resetCreateForm = () => {
    setCreateForm({
      name: "",
      email: "",
      password: "",
      role: "dean",
      sapId: "",
      facultyId: "",
      facultyIds: [],
    });
  };

  const beginEditUser = (user: ManagedUser) => {
    setEditingUser({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      sapId: user.sapId ?? "",
      password: "",
    });
    setShowEditPassword(false);
  };

  const onCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const payload = {
      name: createForm.name,
      email: createForm.email,
      password: createForm.password,
      role: createForm.role,
      sapId: createForm.sapId || null,
      facultyId:
        createForm.role === "dean" && createForm.facultyId !== ""
          ? createForm.facultyId
          : null,
      facultyIds: createForm.role === "ireb" ? createForm.facultyIds : [],
    };

    const response = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !body.ok) {
      setError(body.error ?? "Unable to create user.");
      return;
    }

    resetCreateForm();
    await fetchData();
  };

  const onAssignFaculty = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!selectedUser) {
      setError("Select a user to assign faculty.");
      return;
    }

    const payload =
      selectedUser.role === "dean"
        ? {
            adminUserId: selectedUser.id,
            role: "dean",
            facultyId: assignFacultyId,
          }
        : {
            adminUserId: selectedUser.id,
            role: "ireb",
            facultyIds: assignFacultyIds,
          };

    const response = await fetch("/api/admin/assign-faculty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !body.ok) {
      setError(body.error ?? "Unable to assign faculties.");
      return;
    }

    await fetchData();
  };

  const onUpdateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;
    setError(null);

    const response = await fetch(`/api/admin/users/${editingUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        sapId: editingUser.sapId || null,
        password: editingUser.password || undefined,
      }),
    });
    const body = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !body.ok) {
      setError(body.error ?? "Unable to update user.");
      return;
    }

    setEditingUser(null);
    await fetchData();
  };

  const toggleStatus = async (user: ManagedUser) => {
    setBusyUserId(user.id);
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
        setError(body.error ?? "Unable to update user status.");
        return;
      }
      await fetchData();
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <Breadcrumb pageName="Users" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Managed Users"
          value={String(users.length)}
          helper="All administrator, dean, and IREB accounts"
        />
        <StatCard
          label="Administrators"
          value={String(admins.length)}
          helper="Full system owners"
        />
        <StatCard
          label="Deans"
          value={String(deans.length)}
          helper="Faculty-scoped reviewers"
        />
        <StatCard
          label="IREB Members"
          value={String(irebMembers.length)}
          helper="Central ethics review panel"
        />
      </div>

      <div className="mt-6 rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-dark dark:text-white">
              User Administration
            </h3>
            <p className="mt-1 text-sm text-dark-5">
              Manage all Administrator, Dean, and IREB users with clear faculty
              access visibility.
            </p>
          </div>
          <p className="text-sm text-dark-5">Administrator-only controls</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <form
            onSubmit={onCreateUser}
            className="rounded-lg border border-stroke p-4 dark:border-dark-3"
          >
            <h4 className="mb-3 text-base font-semibold text-dark dark:text-white">
              Create User
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent"
                placeholder="Full name"
                required
              />
              <input
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, email: e.target.value }))
                }
                className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent"
                placeholder="Email"
                type="email"
                required
              />
              <input
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, password: e.target.value }))
                }
                className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent"
                placeholder="Temporary password"
                type={showCreatePassword ? "text" : "password"}
                required
              />
              <button
                type="button"
                onClick={() => setShowCreatePassword((prev) => !prev)}
                className="rounded-md border border-stroke px-3 py-2 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                {showCreatePassword ? "Hide Password" : "View Password"}
              </button>
              <select
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    role: e.target.value as AdminRole,
                    facultyId: "",
                    facultyIds: [],
                  }))
                }
                className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent"
              >
                <option value="administrator">Administrator</option>
                <option value="dean">Dean</option>
                <option value="ireb">IREB</option>
              </select>
              <input
                value={createForm.sapId}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, sapId: e.target.value }))
                }
                className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent sm:col-span-2"
                placeholder="SAP ID (optional)"
              />
              {createForm.role === "dean" && (
                <select
                  value={createForm.facultyId}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      facultyId: e.target.value ? Number(e.target.value) : "",
                    }))
                  }
                  className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent sm:col-span-2"
                >
                  <option value="">Select dean faculty</option>
                  {faculties.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </option>
                  ))}
                </select>
              )}
              {createForm.role === "ireb" && (
                <select
                  multiple
                  value={createForm.facultyIds.map(String)}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions).map(
                      (option) => Number(option.value),
                    );
                    setCreateForm((prev) => ({ ...prev, facultyIds: values }));
                  }}
                  className="min-h-28 rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent sm:col-span-2"
                >
                  {faculties.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button
              type="submit"
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
            >
              Create User
            </button>
          </form>

          <form
            onSubmit={onAssignFaculty}
            className="rounded-lg border border-stroke p-4 dark:border-dark-3"
          >
            <h4 className="mb-3 text-base font-semibold text-dark dark:text-white">
              Assign Faculty Scope
            </h4>
            <div className="grid gap-3">
              <select
                value={selectedAssignUser}
                onChange={(e) => {
                  setSelectedAssignUser(e.target.value);
                  setAssignFacultyId("");
                  setAssignFacultyIds([]);
                }}
                className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent"
              >
                <option value="">Select dean or IREB member</option>
                {users
                  .filter((user) => user.role !== "administrator")
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role.toUpperCase()})
                    </option>
                  ))}
              </select>

              {selectedUser?.role === "dean" && (
                <select
                  value={assignFacultyId}
                  onChange={(e) =>
                    setAssignFacultyId(
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                  className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent"
                >
                  <option value="">Select dean faculty</option>
                  {faculties.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </option>
                  ))}
                </select>
              )}

              {selectedUser?.role === "ireb" && (
                <select
                  multiple
                  value={assignFacultyIds.map(String)}
                  onChange={(e) =>
                    setAssignFacultyIds(
                      Array.from(e.target.selectedOptions).map((option) =>
                        Number(option.value),
                      ),
                    )
                  }
                  className="min-h-28 rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent"
                >
                  {faculties.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="submit"
                disabled={!selectedUser}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Save Faculty Assignment
              </button>
            </div>
          </form>
        </div>

        {editingUser && (
          <form
            onSubmit={onUpdateUser}
            className="mb-6 rounded-lg border border-stroke p-4 dark:border-dark-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-base font-semibold text-dark dark:text-white">
                Edit User
              </h4>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
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
                className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent"
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
                className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent"
                placeholder="Email"
                type="email"
                required
              />
              <select
                value={editingUser.role}
                onChange={(e) =>
                  setEditingUser((prev) =>
                    prev ? { ...prev, role: e.target.value as AdminRole } : prev,
                  )
                }
                className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent"
              >
                <option value="administrator">Administrator</option>
                <option value="dean">Dean</option>
                <option value="ireb">IREB</option>
              </select>
              <input
                value={editingUser.sapId}
                onChange={(e) =>
                  setEditingUser((prev) =>
                    prev ? { ...prev, sapId: e.target.value } : prev,
                  )
                }
                className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent"
                placeholder="SAP ID (optional)"
              />
              <input
                value={editingUser.password}
                onChange={(e) =>
                  setEditingUser((prev) =>
                    prev ? { ...prev, password: e.target.value } : prev,
                  )
                }
                className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent"
                placeholder="New password (leave blank to keep current)"
                type={showEditPassword ? "text" : "password"}
              />
              <button
                type="button"
                onClick={() => setShowEditPassword((prev) => !prev)}
                className="rounded-md border border-stroke px-3 py-2 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                {showEditPassword ? "Hide Password" : "View Password"}
              </button>
            </div>

            <button
              type="submit"
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
            >
              Save Changes
            </button>
          </form>
        )}

        <Table>
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
              <TableRow key={user.id} className="[&>td]:px-4">
                <TableCell>
                  <p className="font-medium text-dark dark:text-white">{user.name}</p>
                  <p className="text-sm text-dark-5">{user.email}</p>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      user.role === "administrator"
                        ? "blue"
                        : user.role === "dean"
                          ? "amber"
                          : "green"
                    }
                  >
                    {user.role === "administrator"
                      ? "Administrator"
                      : user.role === "dean"
                        ? "Dean"
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
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => beginEditUser(user)}
                      className="rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAssignUser(user.id);
                        setAssignFacultyId(
                          user.role === "dean" && user.facultyIds[0]
                            ? user.facultyIds[0]
                            : "",
                        );
                        setAssignFacultyIds(
                          user.role === "ireb" ? user.facultyIds : [],
                        );
                      }}
                      className="rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                    >
                      Assign Faculty
                    </button>
                    <button
                      type="button"
                      disabled={busyUserId === user.id}
                      onClick={() => void toggleStatus(user)}
                      className="rounded-md border border-red/40 px-3 py-1.5 text-xs font-medium text-red transition hover:bg-red/10 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {user.status === "active" ? "Deactivate" : "Activate"}
                    </button>
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
    </div>
  );
}
