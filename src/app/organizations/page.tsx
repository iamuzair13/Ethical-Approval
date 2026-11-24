"use client";

import {
  Dropdown,
  DropdownClose,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import {
  getDepartmentDirectoryEntry,
  DEPARTMENT_DIRECTORY,
  type DepartmentDirectoryEntry,
} from "@/lib/department-domain";
import {
  GraduationCap,
  MoreVertical,
  Pencil,
  Stethoscope,
  Trash2,
} from "lucide-react";
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

type ClassifiedDepartment = {
  department: Department;
  entry: DepartmentDirectoryEntry;
};

type FacultyGroup = {
  faculty: string;
  items: ClassifiedDepartment[];
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

  // ─── Classification against the official medical/non-medical lists ───

  const facultyOrder = useMemo(() => {
    const order = new Map<string, number>();
    DEPARTMENT_DIRECTORY.forEach((entry, index) => {
      if (!order.has(entry.faculty)) order.set(entry.faculty, index);
    });
    return order;
  }, []);

  const { medical, nonMedical, unmappedCount } = useMemo(() => {
    const medicalList: ClassifiedDepartment[] = [];
    const nonMedicalList: ClassifiedDepartment[] = [];
    let unmapped = 0;
    for (const department of departments) {
      const entry = getDepartmentDirectoryEntry(department.name);
      if (!entry) {
        unmapped += 1;
        continue;
      }
      const item: ClassifiedDepartment = { department, entry };
      (entry.domain === "medical" ? medicalList : nonMedicalList).push(item);
    }
    return { medical: medicalList, nonMedical: nonMedicalList, unmappedCount: unmapped };
  }, [departments]);

  const groupByFaculty = useCallback(
    (items: ClassifiedDepartment[]): FacultyGroup[] => {
      const query = searchQuery.trim().toLowerCase();
      const byFaculty = new Map<string, ClassifiedDepartment[]>();
      for (const item of items) {
        if (query && !item.department.name.toLowerCase().includes(query)) continue;
        const list = byFaculty.get(item.entry.faculty) ?? [];
        list.push(item);
        byFaculty.set(item.entry.faculty, list);
      }
      return [...byFaculty.entries()]
        .map(([faculty, groupItems]) => ({
          faculty,
          items: groupItems.sort((a, b) => a.entry.code.localeCompare(b.entry.code)),
        }))
        .sort(
          (a, b) =>
            (facultyOrder.get(a.faculty) ?? Number.MAX_SAFE_INTEGER) -
            (facultyOrder.get(b.faculty) ?? Number.MAX_SAFE_INTEGER),
        );
    },
    [searchQuery, facultyOrder],
  );

  const medicalGroups = useMemo(() => groupByFaculty(medical), [groupByFaculty, medical]);
  const nonMedicalGroups = useMemo(() => groupByFaculty(nonMedical), [groupByFaculty, nonMedical]);

  const medicalCount = useMemo(
    () => medicalGroups.reduce((sum, g) => sum + g.items.length, 0),
    [medicalGroups],
  );
  const nonMedicalCount = useMemo(
    () => nonMedicalGroups.reduce((sum, g) => sum + g.items.length, 0),
    [nonMedicalGroups],
  );
  const listedCount = medicalCount + nonMedicalCount;
  const facultyCount = useMemo(
    () => new Set(DEPARTMENT_DIRECTORY.map((entry) => entry.faculty)).size,
    [],
  );

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

  const menuItemClass =
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium transition hover:bg-gray-50 dark:hover:bg-gray-700";

  const renderDepartmentRow = ({ department, entry }: ClassifiedDepartment) => (
    <li
      key={department.id}
      className="group flex items-center gap-3 py-2.5"
    >
      <span className="w-14 shrink-0 font-mono text-[11px] tabular-nums text-dark-5 dark:text-slate-500">
        {entry.code}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium text-dark dark:text-white"
          title={department.name}
        >
          {department.name}
        </p>
        {department.name !== entry.name && (
          <p className="truncate text-[11px] text-dark-5" title={entry.name}>
            {entry.name}
          </p>
        )}
      </div>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
          department.is_active === false
            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            department.is_active === false ? "bg-red-500" : "bg-green-500",
          )}
          aria-hidden
        />
        {department.is_active === false ? "Inactive" : "Active"}
      </span>
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
        <DropdownContent portalled align="end" className="w-36 p-1">
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
    </li>
  );

  const renderDomainSection = ({
    title,
    caption,
    groups,
    accent,
  }: {
    title: string;
    caption: string;
    groups: FacultyGroup[];
    accent: "medical" | "non-medical";
  }) => {
    const count = groups.reduce((sum, g) => sum + g.items.length, 0);
    const Icon = accent === "medical" ? Stethoscope : GraduationCap;
    return (
      <section className="overflow-hidden rounded-[10px] border border-stroke dark:border-dark-3">
        <header
          className={cn(
            "flex items-center gap-3 border-l-4 bg-gray-2/60 px-5 py-4 dark:bg-white/[0.03]",
            accent === "medical" ? "border-l-teal-500" : "border-l-primary",
          )}
        >
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              accent === "medical"
                ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                : "bg-primary/10 text-primary",
            )}
          >
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h4 className="text-base font-semibold text-dark dark:text-white">{title}</h4>
            <p className="text-xs text-dark-5">{caption}</p>
          </div>
          <span className="ml-auto shrink-0 rounded-full border border-stroke bg-white px-2.5 py-0.5 text-xs font-semibold tabular-nums text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white">
            {count}
          </span>
        </header>
        <div className="px-5 pb-5">
          {groups.length === 0 ? (
            <p className="py-6 text-center text-sm text-dark-5">
              No departments to show.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.faculty} className="mt-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h5 className="text-[11px] font-semibold uppercase tracking-wide text-dark-5">
                    {group.faculty}
                  </h5>
                  <span className="text-[11px] tabular-nums text-dark-5">
                    {group.items.length}
                  </span>
                </div>
                <ul className="mt-1 divide-y divide-stroke/70 dark:divide-dark-3/70">
                  {group.items.map(renderDepartmentRow)}
                </ul>
              </div>
            ))
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Medical Departments"
          value={String(medicalCount)}
          helper="Medicine, pharmacy & allied health"
        />
        <StatCard
          label="Non-Medical Departments"
          value={String(nonMedicalCount)}
          helper="Business, law, engineering, IT & arts"
        />
        <StatCard
          label="Faculties"
          value={String(facultyCount)}
          helper="Official faculties across both domains"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ─── Departments (domain sections) ─── */}
      <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card sm:p-6">
        {/* Header: title + search + add button */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-dark dark:text-white">
              Departments
            </h3>
            <p className="mt-1 text-sm text-dark-5">
              {listedCount} {listedCount === 1 ? "department" : "departments"} on the
              official list
              {searchQuery && " — filtered by your search"}
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
              <span className="mt-1 block text-[11px] text-dark-5">
                Only names on the official medical/non-medical lists will appear on
                this page.
              </span>
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

        {/* Domain sections */}
        {loading ? (
          <div className="py-12 text-center text-sm text-dark-5">
            Loading departments...
          </div>
        ) : listedCount === 0 ? (
          <div className="py-12 text-center text-sm text-dark-5">
            {searchQuery
              ? "No departments match your search."
              : "No listed departments found in the database."}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {renderDomainSection({
                title: "Medical Sciences",
                caption: "Medicine, dentistry, pharmacy & allied health sciences",
                groups: medicalGroups,
                accent: "medical",
              })}
              {renderDomainSection({
                title: "Non-Medical Sciences",
                caption: "Business, law, engineering, IT, languages, arts & social sciences",
                groups: nonMedicalGroups,
                accent: "non-medical",
              })}
            </div>
            {unmappedCount > 0 && (
              <p className="mt-4 text-xs text-dark-5">
                {unmappedCount} other{" "}
                {unmappedCount === 1 ? "department" : "departments"} in the
                database {unmappedCount === 1 ? "is" : "are"} not shown —{" "}
                {unmappedCount === 1 ? "it doesn't" : "they don't"} match the
                official medical/non-medical lists.
              </p>
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
