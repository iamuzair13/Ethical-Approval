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

type Program = {
  id: number;
  department_id: number;
  name: string;
  department_name?: string;
  faculty_name?: string;
  is_active?: boolean;
};

type ModalState =
  | { mode: "edit"; faculty: Faculty }
  | { mode: "delete"; faculty: Faculty };

type DepartmentModalState =
  | { mode: "edit"; department: Department }
  | { mode: "delete"; department: Department };

type ProgramModalState =
  | { mode: "edit"; program: Program }
  | { mode: "delete"; program: Program };

type InsertionState =
  | { type: "faculty" }
  | { type: "department"; facultyId: number }
  | { type: "program"; departmentId: number };

type EditingState =
  | { type: "faculty"; id: number }
  | { type: "department"; id: number }
  | { type: "program"; id: number };

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
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programModal, setProgramModal] = useState<ProgramModalState | null>(null);
  const [programName, setProgramName] = useState("");
  const [programDepartmentId, setProgramDepartmentId] = useState<number | "">("");
  const [programActive, setProgramActive] = useState(true);
  const [expandedDepartmentIds, setExpandedDepartmentIds] = useState<number[]>([]);
  const [insertion, setInsertion] = useState<InsertionState | null>(null);
  const [insertionCode, setInsertionCode] = useState("");
  const [insertionName, setInsertionName] = useState("");
  const [editing, setEditing] = useState<EditingState | null>(null);

  const fetchFaculties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [facultiesRes, departmentsRes, programsRes] = await Promise.all([
        fetch("/api/admin/faculties?all=1", { cache: "no-store" }),
        fetch("/api/admin/departments?all=1", { cache: "no-store" }),
        fetch("/api/admin/programs?all=1", { cache: "no-store" }),
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
      const programsBody = (await programsRes.json()) as {
        ok: boolean;
        programs?: Program[];
        error?: string;
      };
      if (!facultiesRes.ok || !body.ok) {
        throw new Error(body.error ?? "Unable to load faculties.");
      }
      if (!departmentsRes.ok || !departmentsBody.ok) {
        throw new Error(departmentsBody.error ?? "Unable to load departments.");
      }
      if (!programsRes.ok || !programsBody.ok) {
        throw new Error(programsBody.error ?? "Unable to load programs.");
      }
      setFaculties(body.faculties ?? []);
      setDepartments(departmentsBody.departments ?? []);
      setPrograms(programsBody.programs ?? []);
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

  useEffect(() => {
    if (!modal && !departmentModal && !programModal) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modal, departmentModal, programModal]);

  const openAddModal = () => {
    setEditing(null);
    setInsertionCode("");
    setInsertionName("");
    setInsertion({ type: "faculty" });
  };

  const openEditModal = (faculty: Faculty) => {
    setInsertion(null);
    setFormCode(faculty.code);
    setFormName(faculty.name);
    setFormActive(faculty.is_active !== false);
    setEditing({ type: "faculty", id: faculty.id });
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
  const closeProgramModal = () => {
    setProgramModal(null);
    setSubmitting(false);
  };
  const openAddProgramModal = (departmentId: number) => {
    setEditing(null);
    setInsertionCode("");
    setInsertionName("");
    setInsertion({ type: "program", departmentId });
    setExpandedDepartmentIds((previous) =>
      previous.includes(departmentId) ? previous : [...previous, departmentId],
    );
  };
  const openEditProgramModal = (program: Program) => {
    setInsertion(null);
    setProgramName(program.name);
    setProgramDepartmentId(program.department_id);
    setProgramActive(program.is_active !== false);
    setEditing({ type: "program", id: program.id });
  };
  const openDeleteProgramModal = (program: Program) => {
    setProgramModal({ mode: "delete", program });
  };
  const openAddDepartmentModal = (facultyId: number) => {
    setEditing(null);
    setInsertionCode("");
    setInsertionName("");
    setInsertion({ type: "department", facultyId });
    setExpandedFacultyIds((previous) =>
      previous.includes(facultyId) ? previous : [...previous, facultyId],
    );
  };
  const openEditDepartmentModal = (department: Department) => {
    setInsertion(null);
    setDepartmentName(department.name);
    setDepartmentFacultyId(department.faculty_id);
    setDepartmentActive(department.is_active !== false);
    setEditing({ type: "department", id: department.id });
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
            const hasProgramMatch = programs
              .filter((p) => p.department_id === department.id)
              .some((p) => p.name.toLowerCase().includes(normalized));
            return (
              faculty.name.toLowerCase().includes(normalized) ||
              faculty.code.toLowerCase().includes(normalized) ||
              department.name.toLowerCase().includes(normalized) ||
              hasProgramMatch
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
  }, [faculties, departments, programs, mappingQuery]);

  const onInsertionSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!insertion) return;

    const name = insertionName.trim();
    const code = insertionCode.trim();
    if (!name || (insertion.type === "faculty" && !code)) {
      toast.error(insertion.type === "faculty" ? "Faculty code and name are required." : "Name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const endpoint =
        insertion.type === "faculty"
          ? "/api/admin/faculties"
          : insertion.type === "department"
            ? "/api/admin/departments"
            : "/api/admin/programs";
      const payload =
        insertion.type === "faculty"
          ? { code, name }
          : insertion.type === "department"
            ? { facultyId: insertion.facultyId, name }
            : { departmentId: insertion.departmentId, name };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? `Unable to add ${insertion.type}.`);
      }

      toast.success(`${insertion.type[0].toUpperCase()}${insertion.type.slice(1)} created.`);
      setInsertion(null);
      setInsertionCode("");
      setInsertionName("");
      await fetchFaculties();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Operation failed.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onEditingSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;

    setSubmitting(true);
    setError(null);
    try {
      const endpoint =
        editing.type === "faculty"
          ? `/api/admin/faculties/${editing.id}`
          : editing.type === "department"
            ? `/api/admin/departments/${editing.id}`
            : `/api/admin/programs/${editing.id}`;
      const payload =
        editing.type === "faculty"
          ? { code: formCode, name: formName, isActive: formActive }
          : editing.type === "department"
            ? { facultyId: departmentFacultyId, name: departmentName, isActive: departmentActive }
            : { departmentId: programDepartmentId, name: programName, isActive: programActive };
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? `Unable to update ${editing.type}.`);
      }

      toast.success(`${editing.type[0].toUpperCase()}${editing.type.slice(1)} updated.`);
      setEditing(null);
      await fetchFaculties();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Operation failed.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onConfirm = async () => {
    if (!modal) return;
    setSubmitting(true);
    setError(null);

    try {
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

  const onProgramConfirm = async () => {
    if (!programModal) return;
    setSubmitting(true);
    setError(null);
    try {
      if (programModal.mode === "edit") {
        const response = await fetch(`/api/admin/programs/${programModal.program.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            departmentId: programDepartmentId,
            name: programName,
            isActive: programActive,
          }),
        });
        const body = (await response.json()) as { ok: boolean; error?: string };
        if (!response.ok || !body.ok) throw new Error(body.error ?? "Unable to update program.");
        toast.success("Program updated.");
      }
      if (programModal.mode === "delete") {
        const response = await fetch(`/api/admin/programs/${programModal.program.id}`, {
          method: "DELETE",
        });
        const body = (await response.json()) as { ok: boolean; error?: string };
        if (!response.ok || !body.ok) throw new Error(body.error ?? "Unable to delete program.");
        toast.success("Program deleted.");
      }
      await fetchFaculties();
      closeProgramModal();
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Managed Organizations"
          value={String(faculties.length)}
          helper="Future-ready for faculties, departments, and programs"
        />
        <StatCard
          label="Active Faculties"
          value={String(activeCount)}
          helper="Available for supervisor and IREB assignment"
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
        <StatCard
          label="Mapped Programs"
          value={String(programs.length)}
          helper="Programs under departments for supervisor scope"
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
              Search and browse faculty-department-program hierarchy without making changes.
            </p>
          </div>
          <label className="w-full max-w-md">
            <span className="mb-1 block text-sm font-medium text-dark dark:text-white">Search mapping</span>
            <input
              value={mappingQuery}
              onChange={(e) => setMappingQuery(e.target.value)}
              placeholder="Faculty code/name, department, or program"
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
          <span className="rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600">
            Programs: {programs.length}
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
                    {mappedDepartments.map((department) => {
                      const deptPrograms = programs.filter((p) => p.department_id === department.id);
                      const isDeptExpanded = expandedDepartmentIds.includes(department.id);
                      return (
                        <div
                          key={department.id}
                          className="rounded-md border border-stroke px-3 py-2 text-sm dark:border-dark-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-dark dark:text-white">{department.name}</span>
                              {deptPrograms.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedDepartmentIds((prev) =>
                                      prev.includes(department.id)
                                        ? prev.filter((id) => id !== department.id)
                                        : [...prev, department.id],
                                    )
                                  }
                                  className="rounded border border-stroke px-1.5 py-0.5 text-[10px] font-medium text-dark-5 transition hover:bg-gray-1 dark:border-dark-3 dark:text-dark-6 dark:hover:bg-dark-2"
                                >
                                  {isDeptExpanded ? "Hide" : `${deptPrograms.length} programs`}
                                </button>
                              )}
                            </div>
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
                          {isDeptExpanded && deptPrograms.length > 0 && (
                            <div className="mt-2 space-y-1 pl-3">
                              {deptPrograms.map((p) => (
                                <div key={p.id} className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-dark-5">↳ {p.name}</span>
                                  <span
                                    className={cn(
                                      "inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium",
                                      p.is_active === false
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                        : "bg-blue-500/10 text-blue-600",
                                    )}
                                  >
                                    {p.is_active === false ? "Inactive" : "Active"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold text-dark dark:text-white">Organization Tree</h3>
                <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {faculties.length} faculties
                </span>
                <span className="rounded-md bg-[#10B981]/[0.12] px-2.5 py-1 text-xs font-semibold text-green">
                  {departments.length} departments
                </span>
                <span className="rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600">
                  {programs.length} programs
                </span>
              </div>
              <p className="mt-1 text-sm text-dark-5">
                Manage departments within faculties and programs within departments.
              </p>
            </div>
            <button
              type="button"
              onClick={openAddModal}
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
            >
              Add Faculty
            </button>
          </div>

          {insertion?.type === "faculty" && (
            <form
              onSubmit={onInsertionSubmit}
              className="mb-4 grid gap-3 rounded-lg border border-primary/30 bg-primary/[0.03] p-4 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto] sm:items-end"
            >
              <label className="min-w-0 text-xs font-medium text-dark-5">
                Faculty code
                <input
                  value={insertionCode}
                  onChange={(event) => setInsertionCode(event.target.value)}
                  className="mt-1 box-border w-full min-w-0 rounded-md border border-stroke bg-white px-3 py-2 text-sm text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                  placeholder="Code"
                  autoFocus
                />
              </label>
              <label className="min-w-0 text-xs font-medium text-dark-5">
                Faculty name
                <input
                  value={insertionName}
                  onChange={(event) => setInsertionName(event.target.value)}
                  className="mt-1 box-border w-full min-w-0 rounded-md border border-stroke bg-white px-3 py-2 text-sm text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                  placeholder="Faculty name"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInsertion(null)}
                  className="rounded-md border border-stroke px-3 py-2 text-sm font-medium text-dark dark:border-dark-3 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-70"
                >
                  {submitting ? "Adding..." : "Add"}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {faculties
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((faculty) => {
                const facultyDepartments = departments
                  .filter((department) => department.faculty_id === faculty.id)
                  .sort((a, b) => a.name.localeCompare(b.name));
                const isFacultyExpanded = expandedFacultyIds.includes(faculty.id);

                return (
                  <div key={faculty.id} className="overflow-hidden rounded-lg border border-stroke dark:border-dark-3">
                    <div className="flex flex-col gap-3 bg-gray-1/60 p-4 dark:bg-dark-2/60 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedFacultyIds((previous) =>
                            previous.includes(faculty.id)
                              ? previous.filter((id) => id !== faculty.id)
                              : [...previous, faculty.id],
                          )
                        }
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-stroke bg-white text-sm font-semibold text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white">
                          {isFacultyExpanded ? "−" : "+"}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-dark dark:text-white">
                            {faculty.name}
                          </span>
                          <span className="block text-xs text-dark-5">
                            {faculty.code} · {facultyDepartments.length} departments
                          </span>
                        </span>
                        <span
                          className={cn(
                            "ml-1 inline-flex shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium",
                            faculty.is_active === false
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                              : "bg-[#10B981]/[0.12] text-green",
                          )}
                        >
                          {faculty.is_active === false ? "Inactive" : "Active"}
                        </span>
                      </button>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <button
                          type="button"
                          onClick={() => openAddDepartmentModal(faculty.id)}
                          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-opacity-90"
                        >
                          Add Department
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(faculty)}
                          className="rounded-md border border-stroke bg-white px-3 py-1.5 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:hover:bg-dark-3"
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
                    </div>

                    {editing?.type === "faculty" && editing.id === faculty.id && (
                      <form
                        onSubmit={onEditingSubmit}
                        className="grid gap-3 border-t border-stroke bg-primary/[0.03] p-4 dark:border-dark-3 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto] sm:items-end"
                      >
                        <label className="min-w-0 text-xs font-medium text-dark-5">
                          Faculty code
                          <input
                            value={formCode}
                            onChange={(event) => setFormCode(event.target.value)}
                            className="mt-1 box-border w-full min-w-0 rounded-md border border-stroke bg-white px-3 py-2 text-sm text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                            autoFocus
                          />
                        </label>
                        <label className="min-w-0 text-xs font-medium text-dark-5">
                          Faculty name
                          <input
                            value={formName}
                            onChange={(event) => setFormName(event.target.value)}
                            className="mt-1 box-border w-full min-w-0 rounded-md border border-stroke bg-white px-3 py-2 text-sm text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                          />
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="mr-auto flex items-center gap-2 text-xs text-dark dark:text-white">
                            <input
                              type="checkbox"
                              checked={formActive}
                              onChange={(event) => setFormActive(event.target.checked)}
                            />
                            Active
                          </label>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="rounded-md border border-stroke px-3 py-2 text-sm font-medium text-dark dark:border-dark-3 dark:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-70"
                          >
                            {submitting ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </form>
                    )}

                    {isFacultyExpanded && (
                      <div className="space-y-2 p-3 sm:p-4">
                        {insertion?.type === "department" && insertion.facultyId === faculty.id && (
                          <form
                            onSubmit={onInsertionSubmit}
                            className="flex flex-col gap-3 rounded-md border border-primary/30 bg-primary/[0.03] p-3 sm:flex-row sm:items-end"
                          >
                            <label className="min-w-0 flex-1 text-xs font-medium text-dark-5">
                              New department in {faculty.name}
                              <input
                                value={insertionName}
                                onChange={(event) => setInsertionName(event.target.value)}
                                className="mt-1 box-border w-full min-w-0 rounded-md border border-stroke bg-white px-3 py-2 text-sm text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                                placeholder="Department name"
                                autoFocus
                              />
                            </label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setInsertion(null)}
                                className="rounded-md border border-stroke px-3 py-2 text-sm font-medium text-dark dark:border-dark-3 dark:text-white"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={submitting}
                                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-70"
                              >
                                {submitting ? "Adding..." : "Add"}
                              </button>
                            </div>
                          </form>
                        )}
                        {facultyDepartments.map((department) => {
                          const departmentPrograms = programs
                            .filter((program) => program.department_id === department.id)
                            .sort((a, b) => a.name.localeCompare(b.name));
                          const isDepartmentExpanded = expandedDepartmentIds.includes(department.id);

                          return (
                            <div key={department.id} className="overflow-hidden rounded-md border border-stroke dark:border-dark-3">
                              <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedDepartmentIds((previous) =>
                                      previous.includes(department.id)
                                        ? previous.filter((id) => id !== department.id)
                                        : [...previous, department.id],
                                    )
                                  }
                                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                >
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-stroke text-xs font-semibold text-dark dark:border-dark-3 dark:text-white">
                                    {isDepartmentExpanded ? "−" : "+"}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium text-dark dark:text-white">
                                      {department.name}
                                    </span>
                                    <span className="block text-xs text-dark-5">
                                      {departmentPrograms.length} programs
                                    </span>
                                  </span>
                                  <span
                                    className={cn(
                                      "ml-1 inline-flex shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium",
                                      department.is_active === false
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                        : "bg-[#10B981]/[0.12] text-green",
                                    )}
                                  >
                                    {department.is_active === false ? "Inactive" : "Active"}
                                  </span>
                                </button>
                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                  <button
                                    type="button"
                                    onClick={() => openAddProgramModal(department.id)}
                                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-opacity-90"
                                  >
                                    Add Program
                                  </button>
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
                              </div>

                              {editing?.type === "department" && editing.id === department.id && (
                                <form
                                  onSubmit={onEditingSubmit}
                                  className="flex flex-col gap-3 border-t border-stroke bg-primary/[0.03] p-3 dark:border-dark-3 sm:flex-row sm:items-end"
                                >
                                  <label className="min-w-0 flex-1 text-xs font-medium text-dark-5">
                                    Department name
                                    <input
                                      value={departmentName}
                                      onChange={(event) => setDepartmentName(event.target.value)}
                                      className="mt-1 box-border w-full min-w-0 rounded-md border border-stroke bg-white px-3 py-2 text-sm text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                                      autoFocus
                                    />
                                  </label>
                                  <label className="flex items-center gap-2 pb-2 text-xs text-dark dark:text-white">
                                    <input
                                      type="checkbox"
                                      checked={departmentActive}
                                      onChange={(event) => setDepartmentActive(event.target.checked)}
                                    />
                                    Active
                                  </label>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditing(null)}
                                      className="rounded-md border border-stroke px-3 py-2 text-sm font-medium text-dark dark:border-dark-3 dark:text-white"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      disabled={submitting}
                                      className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-70"
                                    >
                                      {submitting ? "Saving..." : "Save"}
                                    </button>
                                  </div>
                                </form>
                              )}

                              {isDepartmentExpanded && (
                                <div className="space-y-2 border-t border-stroke bg-gray-1/30 p-3 dark:border-dark-3 dark:bg-dark-2/30 sm:pl-12">
                                  {insertion?.type === "program" && insertion.departmentId === department.id && (
                                    <form
                                      onSubmit={onInsertionSubmit}
                                      className="flex flex-col gap-3 rounded-md border border-primary/30 bg-white p-3 dark:bg-gray-dark sm:flex-row sm:items-end"
                                    >
                                      <label className="min-w-0 flex-1 text-xs font-medium text-dark-5">
                                        New program in {department.name}
                                        <input
                                          value={insertionName}
                                          onChange={(event) => setInsertionName(event.target.value)}
                                          className="mt-1 box-border w-full min-w-0 rounded-md border border-stroke px-3 py-2 text-sm text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                                          placeholder="Program name"
                                          autoFocus
                                        />
                                      </label>
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setInsertion(null)}
                                          className="rounded-md border border-stroke px-3 py-2 text-sm font-medium text-dark dark:border-dark-3 dark:text-white"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="submit"
                                          disabled={submitting}
                                          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-70"
                                        >
                                          {submitting ? "Adding..." : "Add"}
                                        </button>
                                      </div>
                                    </form>
                                  )}
                                  {editing?.type === "program" &&
                                    departmentPrograms.some((program) => program.id === editing.id) && (
                                      <form
                                        onSubmit={onEditingSubmit}
                                        className="flex flex-col gap-3 rounded-md border border-primary/30 bg-white p-3 dark:bg-gray-dark sm:flex-row sm:items-end"
                                      >
                                        <label className="min-w-0 flex-1 text-xs font-medium text-dark-5">
                                          Program name
                                          <input
                                            value={programName}
                                            onChange={(event) => setProgramName(event.target.value)}
                                            className="mt-1 box-border w-full min-w-0 rounded-md border border-stroke px-3 py-2 text-sm text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                                            autoFocus
                                          />
                                        </label>
                                        <label className="flex items-center gap-2 pb-2 text-xs text-dark dark:text-white">
                                          <input
                                            type="checkbox"
                                            checked={programActive}
                                            onChange={(event) => setProgramActive(event.target.checked)}
                                          />
                                          Active
                                        </label>
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setEditing(null)}
                                            className="rounded-md border border-stroke px-3 py-2 text-sm font-medium text-dark dark:border-dark-3 dark:text-white"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="submit"
                                            disabled={submitting}
                                            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-70"
                                          >
                                            {submitting ? "Saving..." : "Save"}
                                          </button>
                                        </div>
                                      </form>
                                    )}
                                  {departmentPrograms.map((program) => (
                                    <div
                                      key={program.id}
                                      className="flex flex-col gap-2 rounded-md bg-white px-3 py-2.5 dark:bg-gray-dark sm:flex-row sm:items-center sm:justify-between"
                                    >
                                      <div className="flex min-w-0 items-center gap-2">
                                        <span className="text-dark-5">↳</span>
                                        <span className="truncate text-sm text-dark dark:text-white">{program.name}</span>
                                        <span
                                          className={cn(
                                            "inline-flex shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium",
                                            program.is_active === false
                                              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                              : "bg-blue-500/10 text-blue-600",
                                          )}
                                        >
                                          {program.is_active === false ? "Inactive" : "Active"}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-2 sm:justify-end">
                                        <button
                                          type="button"
                                          onClick={() => openEditProgramModal(program)}
                                          className="rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openDeleteProgramModal(program)}
                                          className="rounded-md border border-red/40 px-3 py-1.5 text-xs font-medium text-red transition hover:bg-red/10"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  {departmentPrograms.length === 0 && (
                                    <div className="rounded-md border border-dashed border-stroke px-3 py-5 text-center text-xs text-dark-5 dark:border-dark-3">
                                      No programs in this department.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {facultyDepartments.length === 0 && (
                          <div className="rounded-md border border-dashed border-stroke px-4 py-6 text-center text-sm text-dark-5 dark:border-dark-3">
                            No departments in this faculty.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

            {!loading && faculties.length === 0 && (
              <div className="rounded-lg border border-dashed border-stroke px-4 py-10 text-center text-sm text-dark-5 dark:border-dark-3">
                No faculties found. Add a faculty to begin building the organization tree.
              </div>
            )}
            {loading && (
              <div className="rounded-lg border border-dashed border-stroke px-4 py-10 text-center text-sm text-dark-5 dark:border-dark-3">
                Loading organizations...
              </div>
            )}
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto bg-black/40 p-4 border border-red-600">
          <div className="box-border w-[min(28rem,calc(100vw-2rem))] min-w-0 max-w-none overflow-hidden rounded-xl bg-white p-5 shadow-2xl dark:bg-gray-dark sm:p-6">
            <h4 className="text-lg font-semibold text-dark dark:text-white">
              {modal.mode === "edit" ? "Edit Faculty" : "Confirm Delete Faculty"}
            </h4>

            {modal.mode !== "delete" ? (
              <div className="mt-4 grid min-w-0 grid-cols-1 gap-3">
                <input
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="box-border w-full min-w-0 max-w-full rounded-md border border-stroke px-3 py-2 text-sm text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                  placeholder="Faculty code (e.g. ENGINEERING)"
                />
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="box-border w-full min-w-0 max-w-full rounded-md border border-stroke px-3 py-2 text-sm text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
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

            <div className="mt-5 flex flex-wrap justify-end gap-2">
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
        <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="box-border w-[min(28rem,calc(100vw-2rem))] min-w-0 max-w-none overflow-hidden rounded-xl bg-white p-5 shadow-2xl dark:bg-gray-dark sm:p-6">
            <h4 className="text-lg font-semibold text-dark dark:text-white">
              {departmentModal.mode === "edit" ? "Edit Department" : "Confirm Delete Department"}
            </h4>

            {departmentModal.mode !== "delete" ? (
              <div className="mt-4 grid min-w-0 grid-cols-1 gap-3">
                <select
                  value={departmentFacultyId}
                  onChange={(e) =>
                    setDepartmentFacultyId(e.target.value ? Number(e.target.value) : "")
                  }
                  className="box-border w-full min-w-0 max-w-full rounded-md border border-stroke px-3 py-2 text-sm text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
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
                  className="box-border w-full min-w-0 max-w-full rounded-md border border-stroke px-3 py-2 text-sm text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
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

            <div className="mt-5 flex flex-wrap justify-end gap-2">
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

      {programModal && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="box-border w-[min(28rem,calc(100vw-2rem))] min-w-0 max-w-none overflow-hidden rounded-xl bg-white p-5 shadow-2xl dark:bg-gray-dark sm:p-6">
            <h4 className="text-lg font-semibold text-dark dark:text-white">
              {programModal.mode === "edit" ? "Edit Program" : "Confirm Delete Program"}
            </h4>

            {programModal.mode !== "delete" ? (
              <div className="mt-4 grid min-w-0 grid-cols-1 gap-3">
                <select
                  value={programDepartmentId}
                  onChange={(e) =>
                    setProgramDepartmentId(e.target.value ? Number(e.target.value) : "")
                  }
                  className="box-border w-full min-w-0 max-w-full rounded-md border border-stroke px-3 py-2 text-sm text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.faculty_name ?? ""} — {department.name}
                    </option>
                  ))}
                </select>
                <input
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  className="box-border w-full min-w-0 max-w-full rounded-md border border-stroke px-3 py-2 text-sm text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                  placeholder="Program name"
                />
                {programModal.mode === "edit" && (
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={programActive}
                      onChange={(e) => setProgramActive(e.target.checked)}
                    />
                    Active
                  </label>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-dark-5">
                Delete program{" "}
                <span className="font-medium">{programModal.program.name}</span>? This action
                cannot be undone.
              </p>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeProgramModal}
                className="rounded-md border border-stroke px-3 py-2 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void onProgramConfirm()}
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
