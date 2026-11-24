"use client";

import {
  FilterMultiSelect,
  type FilterOption,
} from "@/components/ui/filter-multi-select";
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
  if (role === "hod") return "HOD";
  if (role === "ireb") return "IREB";
  return role;
}

type ActionTone = "green" | "red" | "amber" | "blue" | "gray";

/**
 * Tone derived from the action verb — `application.review.approve` → green,
 * `admin.user.delete` → red, view-as and sensitivity flags → amber.
 * Color encodes the outcome of the event, not decoration.
 */
function actionTone(actionCode: string): ActionTone {
  const verb = actionCode.split(".").pop() ?? "";
  if (verb === "approve") return "green";
  if (verb === "reject" || verb === "delete") return "red";
  if (verb === "mark_sensitive" || actionCode.startsWith("admin.view_as")) {
    return "amber";
  }
  if (verb === "create" || verb === "recommend" || verb === "password_reset") {
    return "blue";
  }
  return "gray";
}

const ACTION_CHIP_TONE: Record<ActionTone, string> = {
  green: "bg-green/[0.12] text-green",
  red: "bg-red/[0.12] text-red",
  amber:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  blue: "bg-primary/10 text-primary",
  gray: "bg-gray-2 text-dark-5 dark:bg-dark-2 dark:text-dark-6",
};

const ACTION_DOT_TONE: Record<ActionTone, string> = {
  green: "bg-green",
  red: "bg-red",
  amber: "bg-amber-500",
  blue: "bg-primary",
  gray: "bg-dark-5/60",
};

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
  const [actorRoles, setActorRoles] = useState<string[]>([]);
  const [actorAdminIds, setActorAdminIds] = useState<string[]>([]);
  const [actionCodes, setActionCodes] = useState<string[]>([]);
  const [targetTypes, setTargetTypes] = useState<string[]>([]);
  const [facultyIds, setFacultyIds] = useState<string[]>([]);
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
    if (actorRoles.length > 0) params.set("actorRole", actorRoles.join(","));
    if (actorAdminIds.length > 0) params.set("actorAdminId", actorAdminIds.join(","));
    if (actionCodes.length > 0) params.set("actionCode", actionCodes.join(","));
    if (targetTypes.length > 0) params.set("targetType", targetTypes.join(","));
    if (facultyIds.length > 0) params.set("facultyId", facultyIds.join(","));
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (impersonation) params.set("impersonation", impersonation);
    params.set("sort", sort);
    params.set("page", String(currentPage));
    params.set("pageSize", String(pageSize));
    return params;
  }, [
    debouncedQuery,
    actorRoles,
    actorAdminIds,
    actionCodes,
    targetTypes,
    facultyIds,
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
    actorRoles,
    actorAdminIds,
    actionCodes,
    targetTypes,
    facultyIds,
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

  // Group the current page of events by UTC day — the audit trail is a
  // chronological ledger, so the day is the honest grouping axis.
  const eventsByDay = useMemo(() => {
    const groups = new Map<string, ActivityEvent[]>();
    for (const event of events) {
      const day = event.createdAt.slice(0, 10);
      const list = groups.get(day) ?? [];
      list.push(event);
      groups.set(day, list);
    }
    return [...groups.entries()];
  }, [events]);

  const activeFilterCount =
    (debouncedQuery ? 1 : 0) +
    actorRoles.length +
    actorAdminIds.length +
    actionCodes.length +
    targetTypes.length +
    facultyIds.length +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (impersonation ? 1 : 0);

  // Build FilterOption arrays for FilterMultiSelect
  const actorRoleOptions: FilterOption[] = useMemo(
    () =>
      (filterOptions?.actorRoles ?? []).map((r) => ({
        value: r,
        label: roleLabel(r),
      })),
    [filterOptions],
  );

  const actorOptions: FilterOption[] = useMemo(
    () =>
      (filterOptions?.actors ?? []).map((a) => ({
        value: a.id,
        label: a.name,
        hint: roleLabel(a.role),
      })),
    [filterOptions],
  );

  const actionOptions: FilterOption[] = useMemo(
    () =>
      (filterOptions?.actionCodes ?? []).map((c) => ({
        value: c,
        label: c,
      })),
    [filterOptions],
  );

  const targetTypeOptions: FilterOption[] = useMemo(
    () =>
      (filterOptions?.targetTypes ?? []).map((t) => ({
        value: t,
        label: t,
      })),
    [filterOptions],
  );

  const facultyOptions: FilterOption[] = useMemo(
    () =>
      (filterOptions?.faculties ?? []).map((f) => ({
        value: String(f.id),
        label: f.name,
      })),
    [filterOptions],
  );

  const hasActiveFilters =
    debouncedQuery ||
    actorRoles.length > 0 ||
    actorAdminIds.length > 0 ||
    actionCodes.length > 0 ||
    targetTypes.length > 0 ||
    facultyIds.length > 0 ||
    dateFrom ||
    dateTo ||
    impersonation;

  const clearFilters = () => {
    setQuery("");
    setActorRoles([]);
    setActorAdminIds([]);
    setActionCodes([]);
    setTargetTypes([]);
    setFacultyIds([]);
    setDateFrom("");
    setDateTo("");
    setImpersonation("");
    setSort("desc");
    setCurrentPage(1);
  };

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <p className="text-body-sm text-dark-5">Events matching filters</p>
          <h3 className="mt-2 text-2xl font-bold text-dark dark:text-white">{total}</h3>
        </div>
        <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <p className="text-body-sm text-dark-5">On this page</p>
          <h3 className="mt-2 text-2xl font-bold text-dark dark:text-white">{events.length}</h3>
        </div>
        <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <p className="text-body-sm text-dark-5">View-as actions (this page)</p>
          <h3 className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {impersonatedCount}
          </h3>
        </div>
      </div>

      <div className="mt-6 rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card sm:p-6">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-dark dark:text-white">
              Activity Center
            </h3>
            <p className="mt-1 text-sm text-dark-5">
              Every tracked admin action, newest first. Exports use the same
              filters as the timeline below.
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

        {/* Filter strip */}
        <div className="mb-5 rounded-lg border border-stroke p-4 dark:border-dark-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-dark dark:text-white">
              Filter events
              {activeFilterCount > 0 && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {activeFilterCount} active
                </span>
              )}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-dark-5 underline-offset-2 hover:text-dark hover:underline dark:hover:text-white"
              >
                Clear all
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <label className="sm:col-span-2 lg:col-span-4">
            <span className="mb-1 block text-sm font-medium">Search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Description, actor, target…"
              className={selectClass}
            />
          </label>
          <FilterMultiSelect
            label="Actor type"
            options={actorRoleOptions}
            selected={actorRoles}
            onChange={setActorRoles}
            placeholder="All"
            searchPlaceholder="Search actor types…"
            showSelectAll={false}
          />
          <FilterMultiSelect
            label="Actor"
            options={actorOptions}
            selected={actorAdminIds}
            onChange={setActorAdminIds}
            placeholder="All"
            searchPlaceholder="Search actors…"
          />
          <FilterMultiSelect
            label="Action"
            options={actionOptions}
            selected={actionCodes}
            onChange={setActionCodes}
            placeholder="All"
            searchPlaceholder="Search actions…"
          />
          <FilterMultiSelect
            label="Target type"
            options={targetTypeOptions}
            selected={targetTypes}
            onChange={setTargetTypes}
            placeholder="All"
            searchPlaceholder="Search target types…"
          />
          <FilterMultiSelect
            label="Faculty"
            options={facultyOptions}
            selected={facultyIds}
            onChange={setFacultyIds}
            placeholder="All"
            searchPlaceholder="Search faculties…"
          />
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

        {/* Timeline ledger — events grouped by UTC day */}
        <div className="max-h-[620px] overflow-y-auto rounded-lg border border-stroke dark:border-dark-3">
          {loading ? (
            <p className="py-10 text-center text-sm text-dark-5">Loading…</p>
          ) : eventsByDay.length === 0 ? (
            <p className="py-10 text-center text-sm text-dark-5">
              {hasActiveFilters
                ? "No events match these filters — clear them or widen the range."
                : "No activity events recorded yet."}
            </p>
          ) : (
            eventsByDay.map(([day, dayEvents], dayIndex) => (
              <section key={day}>
                {/* Day divider */}
                <div
                  className={cn(
                    "flex items-baseline justify-between px-4 py-2.5",
                    "bg-gray-2/60 dark:bg-white/[0.03]",
                    dayIndex > 0 && "border-t border-stroke dark:border-dark-3",
                  )}
                >
                  <h4 className="text-sm font-semibold text-dark dark:text-white">
                    {new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </h4>
                  <span className="text-xs tabular-nums text-dark-5">
                    {dayEvents.length}{" "}
                    {dayEvents.length === 1 ? "event" : "events"}
                  </span>
                </div>

                <ul className="divide-y divide-stroke/70 dark:divide-dark-3/70">
                  {dayEvents.map((row) => {
                    const tone = actionTone(row.actionCode);
                    return (
                      <li
                        key={row.id}
                        className={cn(
                          "flex gap-4 px-4 py-3.5",
                          row.impersonationMode &&
                            "bg-amber-50/60 dark:bg-amber-500/[0.05]",
                        )}
                      >
                        <span className="w-11 shrink-0 pt-0.5 text-right font-mono text-xs tabular-nums text-dark-5">
                          {row.createdAt.slice(11, 16)}
                        </span>
                        <span
                          className={cn(
                            "mt-1.5 size-2 shrink-0 rounded-full",
                            ACTION_DOT_TONE[tone],
                          )}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <code
                              className={cn(
                                "rounded px-1.5 py-0.5 font-mono text-[11px] font-medium",
                                ACTION_CHIP_TONE[tone],
                              )}
                            >
                              {row.actionCode}
                            </code>
                            <span className="text-sm font-medium text-dark dark:text-white">
                              {row.actorName}
                            </span>
                            <Badge variant="blue">
                              {roleLabel(row.actorRole)}
                            </Badge>
                            {row.impersonationMode && (
                              <Badge variant="amber">
                                {row.impersonationMode === "view_as"
                                  ? `Viewing as ${row.effectiveName ?? "—"}`
                                  : `On behalf of ${row.effectiveName ?? "—"}`}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-dark dark:text-white/90">
                            {row.description}
                          </p>
                          <p className="mt-0.5 text-xs text-dark-5">
                            {row.targetType}
                            {(row.targetLabel ?? row.targetId)
                              ? ` · ${row.targetLabel ?? row.targetId}`
                              : ""}
                            {row.facultyName ? ` · ${row.facultyName}` : ""}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
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
