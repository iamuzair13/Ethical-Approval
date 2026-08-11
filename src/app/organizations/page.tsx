"use client";

import {
  Dropdown,
  DropdownClose,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Department = {
  id: number;
  faculty_id: number | null;
  name: string;
  faculty_name?: string | null;
  is_active?: boolean;
};

type DepartmentModalState =
  | { mode: "edit"; department: Department }
  | { mode: "delete"; department: Department };

type InsertionState = { type: "department" };

const PAGE_SIZE = 30;

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

export default function OrganizationsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departmentModal, setDepartmentModal] = useState<DepartmentModalState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [departmentName, setDepartmentName] = useState("");
  const [departmentActive, setDepartmentActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [insertion, setInsertion] = useState<InsertionState | null>(null);
  const [insertionName, setInsertionName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/departments?all=1", { cache: "no-store" });
      const body = (await res.json()) as { ok: boolean; departments?: Department[]; error?: string };
      if (!body.ok || !body.departments) {
        throw new Error(body.error ?? "Failed to load departments");
      }
      setDepartments(body.departments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load departments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDepartments();
  }, [fetchDepartments]);

  // ─── Helpers ───

  const activeDepartments = useMemo(
    () => departments.filter((d) => d.is_active !== false),
    [departments],
  );

  const filteredDepartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(q));
  }, [departments, searchQuery]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedDepartments = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredDepartments.slice(start, start + PAGE_SIZE);
  }, [filteredDepartments, safePage]);

  // ─── Create ───

  const onInsertionSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!insertionName.trim()) {
        toast.warning("Department name is required.");
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch("/api/admin/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: insertionName.trim() }),
        });
        const body = (await res.json()) as { ok: boolean; error?: string; department?: Department };
        if (!body.ok || !body.department) {
          throw new Error(body.error ?? "Failed to create department");
        }
        toast.success(`Department "${body.department.name}" created.`);
        setDepartments((prev) => [...prev, body.department!]);
        setInsertion(null);
        setInsertionName("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create department.");
      } finally {
        setSubmitting(false);
      }
    },
    [insertionName],
  );

  // ─── Edit/Delete (modal) ───

  const onDepartmentConfirm = useCallback(async () => {
    if (!departmentModal) return;
    setSubmitting(true);
    try {
      if (departmentModal.mode === "edit") {
        const res = await fetch(`/api/admin/departments/${departmentModal.department.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: departmentName.trim(), isActive: departmentActive }),
        });
        const body = (await res.json()) as { ok: boolean; error?: string; department?: Department };
        if (!body.ok || !body.department) {
          throw new Error(body.error ?? "Failed to update department");
        }
        toast.success(`Department "${body.department.name}" updated.`);
        setDepartments((prev) =>
          prev.map((d) => (d.id === departmentModal.department.id ? body.department! : d)),
        );
      } else {
        const res = await fetch(`/api/admin/departments/${departmentModal.department.id}`, {
          method: "DELETE",
        });
        const body = (await res.json()) as { ok: boolean; error?: string };
        if (!body.ok) {
          throw new Error(body.error ?? "Failed to delete department");
        }
        toast.success(`Department "${departmentModal.department.name}" deleted.`);
        setDepartments((prev) =>
          prev.filter((d) => d.id !== departmentModal.department.id),
        );
      }
      setDepartmentModal(null);
      setDepartmentName("");
      setDepartmentActive(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  }, [departmentModal, departmentName, departmentActive]);

  const openEditDepartmentModal = (department: Department) => {
    setDepartmentModal({ mode: "edit", department });
    setDepartmentName(department.name);
    setDepartmentActive(department.is_active !== false);
  };

  const openDeleteDepartmentModal = (department: Department) => {
    setDepartmentModal({ mode: "delete", department });
  };

  const closeDepartmentModal = () => {
    setDepartmentModal(null);
    setDepartmentName("");
    setDepartmentActive(true);
  };

  // ─── Render ───

  const start = (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, filteredDepartments.length);

  const menuItemClass =
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium transition hover:bg-gray-50 dark:hover:bg-gray-700";

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Total Departments"
          value={String(departments.length)}
          helper="All departments in the system"
        />
        <StatCard
          label="Active Departments"
          value={String(activeDepartments.length)}
          helper="Currently available for assignment"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ─── Departments (compact grid) ─── */}
      <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card sm:p-6">
        {/* Header: title + search + add button */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-dark dark:text-white">
              Departments
            </h3>
            <p className="mt-1 text-sm text-dark-5">
              {filteredDepartments.length}{" "}
              {filteredDepartments.length === 1 ? "department" : "departments"}
              {searchQuery && " match your search"}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="w-full max-w-md">
              <span className="mb-1 block text-sm font-medium text-dark dark:text-white">
                Search
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search departments..."
                className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm dark:border-dark-3 dark:text-white"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setInsertion({ type: "department" });
                setInsertionName("");
              }}
              className="whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              + Add Department
            </button>
          </div>
        </div>

        {/* Inline create form */}
        {insertion?.type === "department" && (
          <form
            onSubmit={onInsertionSubmit}
            className="mb-4 flex flex-col gap-3 rounded-lg border border-stroke p-4 dark:border-dark-3 sm:flex-row sm:items-end"
          >
            <label className="flex-1">
              <span className="mb-1 block text-sm font-medium text-dark dark:text-white">
                Department Name
              </span>
              <input
                value={insertionName}
                onChange={(e) => setInsertionName(e.target.value)}
                placeholder="Enter department name"
                className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm dark:border-dark-3 dark:text-white"
                autoFocus
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setInsertion(null);
                  setInsertionName("");
                }}
                className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-dark-5 hover:text-dark dark:border-dark-3 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Department grid */}
        {loading ? (
          <div className="py-12 text-center text-sm text-dark-5">
            Loading departments...
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="py-12 text-center text-sm text-dark-5">
            {searchQuery
              ? "No departments match your search."
              : 'No departments found. Click "Add Department" to create one.'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedDepartments.map((department) => (
                <div
                  key={department.id}
                  className="group flex flex-col gap-1.5 rounded-lg border border-stroke bg-white px-3.5 py-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.02] dark:border-dark-3 dark:bg-dark-2 dark:hover:border-primary/40 dark:hover:bg-primary/[0.03]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4
                      className="text-sm font-medium leading-snug text-dark dark:text-white"
                      title={department.name}
                    >
                      {department.name}
                    </h4>
                    <Dropdown
                      isOpen={openMenuId === department.id}
                      setIsOpen={(open) => setOpenMenuId(open ? department.id : null)}
                    >
                      <DropdownTrigger
                        className="shrink-0 rounded p-0.5 text-dark-5 opacity-0 transition-opacity hover:text-dark focus:opacity-100 group-hover:opacity-100 dark:hover:text-white"
                        aria-label={`Actions for ${department.name}`}
                      >
                        <MoreVertical className="size-4" aria-hidden />
                      </DropdownTrigger>
                      <DropdownContent
                        portalled
                        align="end"
                        className="w-36 p-1"
                      >
                        <DropdownClose>
                          <button
                            type="button"
                            onClick={() => openEditDepartmentModal(department)}
                            className={menuItemClass}
                          >
                            <Pencil className="size-3.5" aria-hidden />
                            Edit
                          </button>
                        </DropdownClose>
                        <DropdownClose>
                          <button
                            type="button"
                            onClick={() => openDeleteDepartmentModal(department)}
                            className={cn(menuItemClass, "text-red-600 dark:text-red-400")}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                            Delete
                          </button>
                        </DropdownClose>
                      </DropdownContent>
                    </Dropdown>
                  </div>
                  <span
                    className={cn(
                      "inline-flex w-fit items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
                      department.is_active === false
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        department.is_active === false
                          ? "bg-red-500"
                          : "bg-green-500",
                      )}
                      aria-hidden
                    />
                    {department.is_active === false ? "Inactive" : "Active"}
                  </span>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {filteredDepartments.length > PAGE_SIZE && (
              <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-gray-700 sm:flex-row">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {start}–{end} of {filteredDepartments.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                    Previous
                  </button>
                  <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Next page"
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Next
                    <ChevronRight className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Department Edit/Delete Modal ─── */}
      {departmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[10px] bg-white p-6 shadow-lg dark:bg-gray-dark">
            <h3 className="text-lg font-semibold text-dark dark:text-white">
              {departmentModal.mode === "edit" ? "Edit Department" : "Delete Department"}
            </h3>
            {departmentModal.mode === "edit" ? (
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-dark dark:text-white">
                    Department Name
                  </span>
                  <input
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm dark:border-dark-3 dark:text-white"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={departmentActive}
                    onChange={(e) => setDepartmentActive(e.target.checked)}
                  />
                  <span className="text-dark dark:text-white">Active</span>
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeDepartmentModal}
                    className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-dark-5 hover:text-dark dark:border-dark-3 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onDepartmentConfirm}
                    disabled={submitting}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-dark-5">
                  Are you sure you want to delete department{" "}
                  <span className="font-semibold text-dark dark:text-white">
                    {departmentModal.department.name}
                  </span>
                  ? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeDepartmentModal}
                    className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-dark-5 hover:text-dark dark:border-dark-3 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onDepartmentConfirm}
                    disabled={submitting}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {submitting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
