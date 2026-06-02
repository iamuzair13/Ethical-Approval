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

type ActivityEvent = {
  id: number;
  actionCode: string;
  description: string;
  targetType: string;
  targetId: string | null;
  targetLabel: string | null;
  actorName: string;
  actorRole: string;
  effectiveName: string | null;
  effectiveRole: string | null;
  impersonationMode: string | null;
  facultyName: string | null;
  createdAt: string;
  createdAtFormatted: string;
};

type FilterOptions = {
  actionCodes: string[];
  actors: { id: string; name: string; role: string }[];
  faculties: { id: number; name: string }[];
  targetTypes: string[];
  actorRoles: string[];
};

function Badge({
  children,
  variant,
}: {
  children: string;
  variant: "green" | "red" | "amber" | "blue" | "gray";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2.5 py-1 text-xs font-medium",
        variant === "green" && "bg-[#10B981]/[0.12] text-green",
        variant === "red" && "bg-[#FB5454]/[0.12] text-red",
        variant === "amber" && "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
        variant === "blue" && "bg-primary/10 text-primary",
        variant === "gray" && "bg-gray-2 text-dark-5 dark:bg-dark-2",
      )}
    >
      {children}
    </span>
  );
}

function roleLabel(role: string): string {
  if (role === "administrator") return "Administrator";
  if (role === "dean") return "Dean";
  if (role === "ireb") return "IREB";
  return role;
}

export default function ActivityCenterPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [actorRole, setActorRole] = useState("");
  const [actorAdminId, setActorAdminId] = useState("");
  const [actionCode, setActionCode] = useState("");
  const [targetType, setTargetType] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [impersonation, setImpersonation] = useState<"" | "only" | "exclude">("");
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    void fetch("/api/activity-events/filters", { cache: "no-store" })
      .then((r) => r.json())
      .then(
        (
          p: {
            ok: boolean;
            setupRequired?: boolean;
            setupMessage?: string;
          } & FilterOptions,
        ) => {
          if (p.ok) {
            setFilterOptions({
              actionCodes: p.actionCodes ?? [],
              actors: p.actors ?? [],
              faculties: p.faculties ?? [],
              targetTypes: p.targetTypes ?? [],
              actorRoles: p.actorRoles ?? [],
            });
            if (p.setupRequired && p.setupMessage) {
              setSetupMessage(p.setupMessage);
            }
          }
        },
      )
      .catch(() => undefined);
  }, []);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (actorRole) params.set("actorRole", actorRole);
    if (actorAdminId) params.set("actorAdminId", actorAdminId);
    if (actionCode) params.set("actionCode", actionCode);
    if (targetType) params.set("targetType", targetType);
    if (facultyId) params.set("facultyId", facultyId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (impersonation) params.set("impersonation", impersonation);
    params.set("sort", sort);
    params.set("page", String(currentPage));
    params.set("pageSize", String(pageSize));
    return params;
  }, [
    debouncedQuery,
    actorRole,
    actorAdminId,
    actionCode,
    targetType,
    facultyId,
    dateFrom,
    dateTo,
    impersonation,
    sort,
    currentPage,
  ]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/activity-events?${buildParams().toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        events?: ActivityEvent[];
        total?: number;
        error?: string;
        setupRequired?: boolean;
        setupMessage?: string;
      };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Unable to load activity events.");
        return;
      }
      setEvents(payload.events ?? []);
      setTotal(payload.total ?? 0);
      setSetupMessage(
        payload.setupRequired ? (payload.setupMessage ?? null) : null,
      );
    } catch {
      setError("Network error while loading activity events.");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedQuery,
    actorRole,
    actorAdminId,
    actionCode,
    targetType,
    facultyId,
    dateFrom,
    dateTo,
    impersonation,
    sort,
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const impersonatedCount = useMemo(
    () => events.filter((e) => e.impersonationMode).length,
    [events],
  );

  const handleExport = async (format: "csv" | "xlsx") => {
    setExporting(format);
    try {
      const params = buildParams();
      params.delete("page");
      params.delete("pageSize");
      params.set("format", format);
      const response = await fetch(`/api/activity-events/export?${params.toString()}`);
      if (!response.ok) {
        toast.error("Export failed.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `activity-events.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}.`);
    } catch {
      toast.error("Export failed.");
    } finally {
      setExporting(null);
    }
  };

  const selectClass =
    "w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm dark:border-dark-3 dark:text-white";

  return (
    <div className="mx-auto w-full max-w-[1250px]">
      <Breadcrumb pageName="Activity Center" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <p className="text-body-sm text-dark-5">Total matching</p>
          <h3 className="mt-2 text-2xl font-bold text-dark dark:text-white">{total}</h3>
        </div>
        <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <p className="text-body-sm text-dark-5">On this page</p>
          <h3 className="mt-2 text-2xl font-bold text-dark dark:text-white">{events.length}</h3>
        </div>
        <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <p className="text-body-sm text-dark-5">Impersonated (page)</p>
          <h3 className="mt-2 text-2xl font-bold text-amber-600">{impersonatedCount}</h3>
        </div>
      </div>

      <div className="mt-6 rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card sm:p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-dark dark:text-white">
              Notifications &amp; Activity Audit
            </h3>
            <p className="mt-1 text-sm text-dark-5">
              Search and filter all tracked actions. Exports use the same filters as this table.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={exporting !== null}
              onClick={() => void handleExport("csv")}
              className="rounded-md border border-stroke px-3 py-2 text-sm font-medium dark:border-dark-3"
            >
              {exporting === "csv" ? "Exporting…" : "Export CSV"}
            </button>
            <button
              type="button"
              disabled={exporting !== null}
              onClick={() => void handleExport("xlsx")}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white"
            >
              {exporting === "xlsx" ? "Exporting…" : "Export Excel"}
            </button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <label className="sm:col-span-2 lg:col-span-4">
            <span className="mb-1 block text-sm font-medium">Search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Description, actor, target…"
              className={selectClass}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Actor type</span>
            <select value={actorRole} onChange={(e) => setActorRole(e.target.value)} className={selectClass}>
              <option value="">All</option>
              {(filterOptions?.actorRoles ?? []).map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Actor</span>
            <select
              value={actorAdminId}
              onChange={(e) => setActorAdminId(e.target.value)}
              className={selectClass}
            >
              <option value="">All</option>
              {(filterOptions?.actors ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({roleLabel(a.role)})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Action</span>
            <select value={actionCode} onChange={(e) => setActionCode(e.target.value)} className={selectClass}>
              <option value="">All</option>
              {(filterOptions?.actionCodes ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Target type</span>
            <select value={targetType} onChange={(e) => setTargetType(e.target.value)} className={selectClass}>
              <option value="">All</option>
              {(filterOptions?.targetTypes ?? []).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Faculty</span>
            <select value={facultyId} onChange={(e) => setFacultyId(e.target.value)} className={selectClass}>
              <option value="">All</option>
              {(filterOptions?.faculties ?? []).map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">From date</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={selectClass}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">To date</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={selectClass}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Impersonation</span>
            <select
              value={impersonation}
              onChange={(e) => setImpersonation(e.target.value as "" | "only" | "exclude")}
              className={selectClass}
            >
              <option value="">All actions</option>
              <option value="only">Impersonated only</option>
              <option value="exclude">Non-impersonated only</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "asc" | "desc")}
              className={selectClass}
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </label>
        </div>

        {setupMessage && (
          <div className="mb-4 rounded-md border border-amber-400/50 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="font-medium">Database setup required</p>
            <p className="mt-1">{setupMessage}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">
            {error}
          </div>
        )}

        <div className="max-h-[620px] overflow-y-auto rounded-lg border border-stroke dark:border-dark-3">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-white dark:bg-gray-dark">
              <TableRow className="[&>th]:px-3">
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Effective user</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((row) => (
                <TableRow key={row.id} className="[&>td]:px-3 align-top">
                  <TableCell className="whitespace-nowrap text-xs">
                    <p>{row.createdAtFormatted}</p>
                    <p className="text-dark-5">{row.createdAt.slice(0, 19)} UTC</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    <p className="font-medium">{row.actorName}</p>
                    <Badge variant="blue">{roleLabel(row.actorRole)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.impersonationMode ? (
                      <>
                        <p className="font-medium">{row.effectiveName ?? "—"}</p>
                        <Badge variant="amber">
                          {row.impersonationMode === "view_as" ? "View as" : "On behalf"}
                        </Badge>
                      </>
                    ) : (
                      <span className="text-dark-5">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{row.actionCode}</TableCell>
                  <TableCell className="text-sm">
                    <p>{row.targetType}</p>
                    <p className="text-xs text-dark-5">{row.targetLabel ?? row.targetId ?? "—"}</p>
                    {row.facultyName && (
                      <p className="text-xs text-dark-5">Faculty: {row.facultyName}</p>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[360px] text-sm">{row.description}</TableCell>
                </TableRow>
              ))}
              {!loading && events.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-dark-5">
                    No activity events found.
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-dark-5">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && total > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-body">
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, total)} of{" "}
              {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-stroke px-3 py-1.5 text-sm disabled:opacity-50 dark:border-dark-3"
              >
                Previous
              </button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-md border border-stroke px-3 py-1.5 text-sm disabled:opacity-50 dark:border-dark-3"
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
