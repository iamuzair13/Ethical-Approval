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

type Faculty = {
  id: number;
  code: string;
  name: string;
  is_active?: boolean;
};

type ModalState =
  | { mode: "add"; faculty: null }
  | { mode: "edit"; faculty: Faculty }
  | { mode: "delete"; faculty: Faculty };

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
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);

  const fetchFaculties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/faculties?all=1", { cache: "no-store" });
      const body = (await response.json()) as {
        ok: boolean;
        faculties?: Faculty[];
        error?: string;
      };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Unable to load faculties.");
      }
      setFaculties(body.faculties ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load faculties.");
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

  const activeCount = useMemo(
    () => faculties.filter((faculty) => faculty.is_active !== false).length,
    [faculties],
  );

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
      }

      if (modal.mode === "delete") {
        const response = await fetch(`/api/admin/faculties/${modal.faculty.id}`, {
          method: "DELETE",
        });
        const body = (await response.json()) as { ok: boolean; error?: string };
        if (!response.ok || !body.ok) throw new Error(body.error ?? "Unable to delete faculty.");
      }

      await fetchFaculties();
      closeModal();
    } catch (submitError) {
      setSubmitting(false);
      setError(submitError instanceof Error ? submitError.message : "Operation failed.");
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
      </div>

      <div className="mt-6 rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-dark dark:text-white">
              Faculty Management
            </h3>
            <p className="mt-1 text-sm text-dark-5">
              Organizations module starts with faculties and scales to departments and
              programs in future phases.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
          >
            Add Faculty
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">
            {error}
          </div>
        )}

        <div className="max-h-[420px] overflow-y-auto pr-1">
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
              {loading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-dark-5">
                    Loading faculties...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

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
    </div>
  );
}
