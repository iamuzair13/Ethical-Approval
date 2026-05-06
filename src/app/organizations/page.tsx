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
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Faculty = {
  id: number;
  code: string;
  name: string;
  is_active?: boolean;
};

type Department = {
  id: number;
  faculty_id: number;
  name: string;
  faculty_name?: string;
  is_active?: boolean;
};

type ModalState =
  | { mode: "add"; faculty: null }
  | { mode: "edit"; faculty: Faculty }
  | { mode: "delete"; faculty: Faculty };

type DepartmentModalState =
  | { mode: "add"; department: null }
  | { mode: "edit"; department: Department }
  | { mode: "delete"; department: Department };

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
  const [activeTab, setActiveTab] = useState<"view" | "management">("view");
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentModal, setDepartmentModal] = useState<DepartmentModalState | null>(null);
  const [departmentName, setDepartmentName] = useState("");
  const [departmentFacultyId, setDepartmentFacultyId] = useState<number | "">("");
  const [departmentActive, setDepartmentActive] = useState(true);
  const [mappingQuery, setMappingQuery] = useState("");
  const [expandedFacultyIds, setExpandedFacultyIds] = useState<number[]>([]);

  const fetchFaculties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [facultiesRes, departmentsRes] = await Promise.all([
        fetch("/api/admin/faculties?all=1", { cache: "no-store" }),
        fetch("/api/admin/departments?all=1", { cache: "no-store" }),
      ]);
      const body = (await facultiesRes.json()) as {
        ok: boolean;
        faculties?: Faculty[];
        error?: string;
      };
      const departmentsBody = (await departmentsRes.json()) as {
        ok: boolean;
        departments?: Department[];
        error?: string;
      };
      if (!facultiesRes.ok || !body.ok) {
        throw new Error(body.error ?? "Unable to load faculties.");
      }
      if (!departmentsRes.ok || !departmentsBody.ok) {
        throw new Error(departmentsBody.error ?? "Unable to load departments.");
      }
      setFaculties(body.faculties ?? []);
      setDepartments(departmentsBody.departments ?? []);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Unable to load faculties.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFaculties();
  }, [fetchFaculties]);

  const openAddModal = () => {
    setFormCode("");
    setFormName("");
    setFormActive(true);
    setModal({ mode: "add", faculty: null });
  };

  const openEditModal = (faculty: Faculty) => {
    setFormCode(faculty.code);
    setFormName(faculty.name);
    setFormActive(faculty.is_active !== false);
    setModal({ mode: "edit", faculty });
  };

  const openDeleteModal = (faculty: Faculty) => {
    setModal({ mode: "delete", faculty });
  };

  const closeModal = () => {
    setModal(null);
    setSubmitting(false);
  };
  const closeDepartmentModal = () => {
    setDepartmentModal(null);
    setSubmitting(false);
  };
  const openAddDepartmentModal = () => {
    setDepartmentName("");
    setDepartmentFacultyId("");
    setDepartmentActive(true);
    setDepartmentModal({ mode: "add", department: null });
  };
  const openEditDepartmentModal = (department: Department) => {
    setDepartmentName(department.name);
    setDepartmentFacultyId(department.faculty_id);
    setDepartmentActive(department.is_active !== false);
    setDepartmentModal({ mode: "edit", department });
  };
  const openDeleteDepartmentModal = (department: Department) => {
    setDepartmentModal({ mode: "delete", department });
  };

  const activeCount = useMemo(
    () => faculties.filter((faculty) => faculty.is_active !== false).length,
    [faculties],
  );
  const groupedMapping = useMemo(() => {
    const normalized = mappingQuery.trim().toLowerCase();
    const grouped = faculties
      .map((faculty) => {
        const facultyDepartments = departments
          .filter((department) => department.faculty_id === faculty.id)
          .filter((department) => {
            if (!normalized) return true;
            return (
              faculty.name.toLowerCase().includes(normalized) ||
              faculty.code.toLowerCase().includes(normalized) ||
              department.name.toLowerCase().includes(normalized)
            );
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        return {
          faculty,
          departments: facultyDepartments,
        };
      })
      .filter((item) => item.departments.length > 0 || !normalized)
      .sort((a, b) => a.faculty.name.localeCompare(b.faculty.name));

    return grouped;
  }, [faculties, departments, mappingQuery]);

  const onConfirm = async () => {
    if (!modal) return;
    setSubmitting(true);
    setError(null);

    try {
      if (modal.mode === "add") {
        const response = await fetch("/api/admin/faculties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: formCode, name: formName }),
        });
        const body = (await response.json()) as { ok: boolean; error?: string };
        if (!response.ok || !body.ok) throw new Error(body.error ?? "Unable to add faculty.");
        toast.success("Faculty created.");
      }

      if (modal.mode === "edit") {
        const response = await fetch(`/api/admin/faculties/${modal.faculty.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: formCode,
            name: formName,
            isActive: formActive,
          }),
        });
        const body = (await response.json()) as { ok: boolean; error?: string };
        if (!response.ok || !body.ok) throw new Error(body.error ?? "Unable to update faculty.");
        toast.success("Faculty updated.");
      }

      if (modal.mode === "delete") {
        const response = await fetch(`/api/admin/faculties/${modal.faculty.id}`, {
          method: "DELETE",
        });
        const body = (await response.json()) as { ok: boolean; error?: string };
        if (!response.ok || !body.ok) throw new Error(body.error ?? "Unable to delete faculty.");
        toast.success("Faculty deleted.");
      }

      await fetchFaculties();
      closeModal();
    } catch (submitError) {
      setSubmitting(false);
      const message = submitError instanceof Error ? submitError.message : "Operation failed.";
      setError(message);
      toast.error(message);
    }
  };

  const onDepartmentConfirm = async () => {
    if (!departmentModal) return;
    setSubmitting(true);
    setError(null);
    try {
      if (departmentModal.mode === "add") {
        const response = await fetch("/api/admin/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            facultyId: departmentFacultyId,
            name: departmentName,
          }),
        });
        const body = (await response.json()) as { ok: boolean; error?: string };
        if (!response.ok || !body.ok) throw new Error(body.error ?? "Unable to add department.");
        toast.success("Department created.");
      }
      if (departmentModal.mode === "edit") {
        const response = await fetch(`/api/admin/departments/${departmentModal.department.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            facultyId: departmentFacultyId,
            name: departmentName,
            isActive: departmentActive,
          }),
        });
        const body = (await response.json()) as { ok: boolean; error?: string };
        if (!response.ok || !body.ok) throw new Error(body.error ?? "Unable to update department.");
        toast.success("Department updated.");
      }
      if (departmentModal.mode === "delete") {
        const response = await fetch(`/api/admin/departments/${departmentModal.department.id}`, {
          method: "DELETE",
        });
        const body = (await response.json()) as { ok: boolean; error?: string };
        if (!response.ok || !body.ok) throw new Error(body.error ?? "Unable to delete department.");
        toast.success("Department deleted.");
      }
      await fetchFaculties();
      closeDepartmentModal();
    } catch (submitError) {
      setSubmitting(false);
      const message = submitError instanceof Error ? submitError.message : "Operation failed.";
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <Breadcrumb pageName="Organizations" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Managed Organizations"
          value={String(faculties.length)}
          helper="Future-ready for faculties, departments, and programs"
        />
        <StatCard
          label="Active Faculties"
          value={String(activeCount)}
          helper="Available for dean and IREB assignment"
        />
        <StatCard
          label="Inactive Faculties"
          value={String(faculties.length - activeCount)}
          helper="Hidden from active assignment lists"
        />
        <StatCard
          label="Mapped Departments"
          value={String(departments.length)}
          helper="Parent-child units under faculties"
        />
      </div>

      {error && (
        <div className="mt-6 rounded-md border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">
          {error}
        </div>
      )}

      <div className="mt-6 rounded-[10px] bg-white p-2 shadow-1 dark:bg-gray-dark dark:shadow-card sm:p-3">
        <div className="flex gap-2 rounded-lg bg-gray-1 p-1 dark:bg-dark-2">
          <button
            type="button"
            onClick={() => setActiveTab("view")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition",
              activeTab === "view"
                ? "bg-white text-primary shadow-1 dark:bg-dark dark:text-white"
                : "text-dark-5 hover:text-dark dark:hover:text-white",
            )}
          >
            View Only
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("management")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition",
              activeTab === "management"
                ? "bg-white text-primary shadow-1 dark:bg-dark dark:text-white"
                : "text-dark-5 hover:text-dark dark:hover:text-white",
            )}
          >
            Management
          </button>
        </div>
      </div>

      {activeTab === "view" && (
        <div className="mt-6 rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-dark dark:text-white">
              View Only
            </h3>
            <p className="mt-1 text-sm text-dark-5">
              Search and browse faculty-department hierarchy without making changes.
            </p>
          </div>
          <label className="w-full max-w-md">
            <span className="mb-1 block text-sm font-medium text-dark dark:text-white">Search mapping</span>
            <input
              value={mappingQuery}
              onChange={(e) => setMappingQuery(e.target.value)}
              placeholder="Faculty code/name or department"
              className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm dark:border-dark-3 dark:text-white"
            />
          </label>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            Faculties: {groupedMapping.length}
          </span>
          <span className="rounded-md bg-[#10B981]/[0.12] px-2.5 py-1 text-xs font-semibold text-green">
            Departments: {groupedMapping.reduce((acc, item) => acc + item.departments.length, 0)}
          </span>
        </div>

        <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
          {groupedMapping.map(({ faculty, departments: mappedDepartments }) => {
            const isExpanded = expandedFacultyIds.includes(faculty.id);
            return (
              <div key={faculty.id} className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-dark dark:text-white">{faculty.name}</p>
                    <p className="text-xs text-dark-5">{faculty.code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {mappedDepartments.length} departments
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedFacultyIds((prev) =>
                          prev.includes(faculty.id)
                            ? prev.filter((id) => id !== faculty.id)
                            : [...prev, faculty.id],
                        )
                      }
                      className="rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                    >
                      {isExpanded ? "Hide" : "View"}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {mappedDepartments.map((department) => (
                      <div
                        key={department.id}
                        className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-dark dark:text-white">{department.name}</span>
                          <span
                            className={cn(
                              "inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium",
                              department.is_active === false
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                : "bg-[#10B981]/[0.12] text-green",
                            )}
                          >
                            {department.is_active === false ? "Inactive" : "Active"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {!loading && groupedMapping.length === 0 && (
            <div className="rounded-lg border border-dashed border-stroke px-4 py-8 text-center text-sm text-dark-5 dark:border-dark-3">
              No faculty-department mapping found for this search.
            </div>
          )}
        </div>
        </div>
      )}

      {activeTab === "management" && (
        <div className="mt-6 rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-dark dark:text-white">Management</h3>
            <p className="mt-1 text-sm text-dark-5">
              Add, edit, and remove faculties and departments.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openAddModal}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
            >
              Add Faculty
            </button>
            <button
              type="button"
              onClick={openAddDepartmentModal}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
            >
              Add Department
            </button>
          </div>
        </div>

        <h4 className="mb-3 text-base font-semibold text-dark dark:text-white">Faculty Management</h4>
        <div className="max-h-[320px] overflow-y-auto pr-1">
          <Table>
            <TableHeader>
              <TableRow className="[&>th]:px-4">
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faculties.map((faculty) => (
                <TableRow key={faculty.id} className="[&>td]:px-4 ">
                  <TableCell className="font-medium">{faculty.code}</TableCell>
                  <TableCell>{faculty.name}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2.5 py-1 text-xs font-medium",
                        faculty.is_active === false
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                          : "bg-[#10B981]/[0.12] text-green",
                      )}
                    >
                      {faculty.is_active === false ? "Inactive" : "Active"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(faculty)}
                        className="rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(faculty)}
                        className="rounded-md border border-red/40 px-3 py-1.5 text-xs font-medium text-red transition hover:bg-red/10"
                      >
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && faculties.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-dark-5">
                    No faculties found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="my-6 border-t border-stroke dark:border-dark-3" />
        <h4 className="mb-3 text-base font-semibold text-dark dark:text-white">Department Management</h4>
        <div className="max-h-[360px] overflow-y-auto pr-1">
          <Table>
            <TableHeader>
              <TableRow className="[&>th]:px-4">
                <TableHead>Faculty</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((department) => (
                <TableRow key={department.id} className="[&>td]:px-4">
                  <TableCell>{department.faculty_name ?? "-"}</TableCell>
                  <TableCell className="font-medium">{department.name}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2.5 py-1 text-xs font-medium",
                        department.is_active === false
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                          : "bg-[#10B981]/[0.12] text-green",
                      )}
                    >
                      {department.is_active === false ? "Inactive" : "Active"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditDepartmentModal(department)}
                        className="rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteDepartmentModal(department)}
                        className="rounded-md border border-red/40 px-3 py-1.5 text-xs font-medium text-red transition hover:bg-red/10"
                      >
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && departments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-dark-5">
                    No departments found.
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-dark-5">
                    Loading organizations...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-dark">
            <h4 className="text-lg font-semibold text-dark dark:text-white">
              {modal.mode === "add"
                ? "Confirm Add Faculty"
                : modal.mode === "edit"
                  ? "Confirm Edit Faculty"
                  : "Confirm Delete Faculty"}
            </h4>

            {modal.mode !== "delete" ? (
              <div className="mt-4 grid gap-3">
                <input
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent"
                  placeholder="Faculty code (e.g. ENGINEERING)"
                />
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent"
                  placeholder="Faculty name"
                />
                {modal.mode === "edit" && (
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                    />
                    Active
                  </label>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-dark-5">
                Delete faculty <span className="font-medium">{modal.faculty.name}</span>? This
                action cannot be undone.
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md border border-stroke px-3 py-2 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void onConfirm()}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:opacity-70"
              >
                {submitting ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {departmentModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-dark">
            <h4 className="text-lg font-semibold text-dark dark:text-white">
              {departmentModal.mode === "add"
                ? "Confirm Add Department"
                : departmentModal.mode === "edit"
                  ? "Confirm Edit Department"
                  : "Confirm Delete Department"}
            </h4>

            {departmentModal.mode !== "delete" ? (
              <div className="mt-4 grid gap-3">
                <select
                  value={departmentFacultyId}
                  onChange={(e) =>
                    setDepartmentFacultyId(e.target.value ? Number(e.target.value) : "")
                  }
                  className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent"
                >
                  <option value="">Select faculty</option>
                  {faculties.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </option>
                  ))}
                </select>
                <input
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-transparent"
                  placeholder="Department name"
                />
                {departmentModal.mode === "edit" && (
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={departmentActive}
                      onChange={(e) => setDepartmentActive(e.target.checked)}
                    />
                    Active
                  </label>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-dark-5">
                Delete department{" "}
                <span className="font-medium">{departmentModal.department.name}</span>? This action
                cannot be undone.
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDepartmentModal}
                className="rounded-md border border-stroke px-3 py-2 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void onDepartmentConfirm()}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:opacity-70"
              >
                {submitting ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
