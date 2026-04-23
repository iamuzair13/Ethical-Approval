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

type ActivityLog = {
  id: number;
  submission_id: number;
  application_id: string;
  applicant_name: string;
  stage: "dean" | "ireb";
  decision: "approved" | "rejected";
  comment: string | null;
  decided_by_name: string | null;
  decided_at: string;
};

function Badge({
  children,
  variant,
}: {
  children: string;
  variant: "green" | "red" | "amber" | "blue";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2.5 py-1 text-xs font-medium",
        variant === "green" && "bg-[#10B981]/[0.12] text-green",
        variant === "red" && "bg-[#FB5454]/[0.12] text-red",
        variant === "amber" && "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
        variant === "blue" && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </span>
  );
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("q", debouncedQuery);
      const response = await fetch(`/api/admin/activity-logs?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        logs?: ActivityLog[];
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Unable to load activity logs.");
        return;
      }
      setLogs(payload.logs ?? []);
    } catch {
      setError("Network error while loading activity logs.");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const stats = useMemo(() => {
    const approvals = logs.filter((row) => row.decision === "approved").length;
    const rejections = logs.filter((row) => row.decision === "rejected").length;
    const deanActions = logs.filter((row) => row.stage === "dean").length;
    const irebActions = logs.filter((row) => row.stage === "ireb").length;
    return { approvals, rejections, deanActions, irebActions };
  }, [logs]);
  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return logs.slice(start, start + pageSize);
  }, [logs, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="mx-auto w-full max-w-[1250px]">
      <Breadcrumb pageName="Activity Logs" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <p className="text-body-sm text-dark-5">Total actions</p>
          <h3 className="mt-2 text-2xl font-bold text-dark dark:text-white">{logs.length}</h3>
        </div>
        <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <p className="text-body-sm text-dark-5">Approvals</p>
          <h3 className="mt-2 text-2xl font-bold text-green">{stats.approvals}</h3>
        </div>
        <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <p className="text-body-sm text-dark-5">Rejections</p>
          <h3 className="mt-2 text-2xl font-bold text-red">{stats.rejections}</h3>
        </div>
        <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <p className="text-body-sm text-dark-5">Dean / IREB actions</p>
          <h3 className="mt-2 text-2xl font-bold text-dark dark:text-white">
            {stats.deanActions} / {stats.irebActions}
          </h3>
        </div>
      </div>

      <div className="mt-6 rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-dark dark:text-white">Centralized Admin Action Trace</h3>
            <p className="mt-1 text-sm text-dark-5">
              Search by application ID, applicant, admin name, or comment.
            </p>
          </div>
          <label className="w-full max-w-md">
            <span className="mb-1 block text-sm font-medium text-dark dark:text-white">Search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 497097, Mohsin, Test Dean"
              className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm dark:border-dark-3 dark:text-white"
            />
          </label>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">
            {error}
          </div>
        )}

        <div className="max-h-[620px] overflow-y-auto rounded-lg border border-stroke dark:border-dark-3">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-white dark:bg-gray-dark">
              <TableRow className="[&>th]:px-4">
                <TableHead>When</TableHead>
                <TableHead>Application</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Trace / Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.map((row) => (
                <TableRow key={row.id} className="[&>td]:px-4 align-top">
                  <TableCell className="whitespace-nowrap text-sm">
                    {new Date(row.decided_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <p className="font-mono text-sm font-semibold text-dark dark:text-white">
                      {row.application_id}
                    </p>
                    <p className="text-xs text-dark-5">{row.applicant_name}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="blue">{row.stage === "dean" ? "Dean" : "IREB"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.decision === "approved" ? "green" : "red"}>
                      {row.decision === "approved" ? "Approved" : "Rejected"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{row.decided_by_name ?? "—"}</TableCell>
                  <TableCell className="max-w-[520px]">
                    <p className="whitespace-pre-wrap text-sm text-dark dark:text-white">
                      {row.comment?.trim() || "No comment provided."}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-dark-5">
                    No activity logs found.
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-dark-5">
                    Loading activity logs...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {!loading && logs.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-body">
              Showing {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, logs.length)} of {logs.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-dark transition hover:bg-gray-1 disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Previous
              </button>
              <span className="text-sm text-body">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-dark transition hover:bg-gray-1 disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
