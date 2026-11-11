"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import type { Lead } from "@/components/Tables/leads-report/types";
import {
  LeadsReportTabs,
  type DrillFilter,
} from "@/app/(home)/_components/leads-report-tabs";
import type {
  DashboardFilterState,
  DashboardSummary,
  FilterOptions,
  TrackKey,
} from "./types";
import { TRACK_ORDER } from "./types";
import { DashboardFilterBar } from "./filter-bar";
import { TotalApplicationsStrip, TrackSummaryStrip } from "./glance-strip";
import { TrackSection } from "./track-section";
import { cn } from "@/lib/utils";
import { Download, RefreshCw } from "lucide-react";

type Props = {
  initialSummary: DashboardSummary;
  initialFilters: DashboardFilterState;
  filterOptions: FilterOptions;
  leads: Lead[];
  sensitiveLeads: Lead[];
  currentRole: "administrator" | "hod" | "ireb" | null;
  canViewSensitive: boolean;
};

function filtersToQuery(f: DashboardFilterState): string {
  const p = new URLSearchParams();
  p.set("from", f.from);
  p.set("to", f.to);
  if (f.facultyId) p.set("facultyId", String(f.facultyId));
  if (f.departmentId) p.set("departmentId", String(f.departmentId));
  if (f.programId) p.set("programId", String(f.programId));
  if (f.track) p.set("track", f.track);
  return p.toString();
}

function secondsAgo(iso: string, now: number): number {
  return Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
}

function buildWorkbook(summary: DashboardSummary) {
  const wb = XLSX.utils.book_new();
  for (const track of TRACK_ORDER) {
    const t = summary.tracks[track];
    const rows: (string | number)[][] = [
      [`${t.label} (${t.forms}) — ${summary.range.from} → ${summary.range.to}`],
      [],
      ["Total submitted (non-draft)", t.total],
      ["Pending", t.outcomes.pending],
      ["Approved", t.outcomes.approved],
      ["Rejected", t.outcomes.rejected],
      ["Sensitive cases", t.sensitiveCount],
      ["Unassigned to IREB member", t.unassignedIrebCount],
      ["Avg days to decision", t.avgDaysToDecision ?? "—"],
      [],
      ["Stage", "Waiting now", "Avg days waiting", `Waiting > ${t.aging.thresholdDays}d`],
      ...t.stages.map((s) => [
        s,
        t.stageCounts[s] ?? 0,
        t.agingByStage[s]?.avgDays ?? "—",
        t.agingByStage[s]?.overThreshold ?? 0,
      ]),
      [],
      ["Deciding body", "Pending", "Approved", "Rejected", "Forwarded to IREB", "Decided"],
      ...t.deciders.map((d) => [d.label, d.pending, d.approved, d.rejected, d.forwarded, d.decided]),
      [],
      ["Period", "Submitted", "Approved", "Rejected"],
      ...t.trend.map((p) => [p.label, p.submitted, p.approved, p.rejected]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, t.label.slice(0, 31));
  }
  return wb;
}

export function DashboardBoard({
  initialSummary,
  initialFilters,
  filterOptions,
  leads,
  sensitiveLeads,
  currentRole,
  canViewSensitive,
}: Props) {
  const [filters, setFilters] = useState<DashboardFilterState>(initialFilters);
  const [summary, setSummary] = useState<DashboardSummary>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drillFilter, setDrillFilter] = useState<DrillFilter | null>(null);
  // Accordion: at most one track section is expanded at a time.
  const [openTrack, setOpenTrack] = useState<TrackKey | null>(
    initialFilters.track ?? TRACK_ORDER[0],
  );
  const [clock, setClock] = useState(() => Date.now());
  const tableRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);

  const fetchSummary = useCallback(async (f: DashboardFilterState) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/summary?${filtersToQuery(f)}`, {
        cache: "no-store",
      });
      const body = (await res.json()) as { ok: boolean; summary?: DashboardSummary; error?: string };
      if (!res.ok || !body.ok || !body.summary) {
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      setSummary(body.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter changes → update URL (shareable, survives refresh) + refetch.
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    const qs = filtersToQuery(filters);
    window.history.replaceState(null, "", `?${qs}`);
    void fetchSummary(filters);
  }, [filters, fetchSummary]);

  // When the filter narrows to a single track, expand that section.
  useEffect(() => {
    if (filters.track) setOpenTrack(filters.track);
  }, [filters.track]);

  // Auto-refresh every 60s + "updated Xs ago" ticker.
  useEffect(() => {
    const refresh = setInterval(() => void fetchSummary(filters), 60_000);
    const ticker = setInterval(() => setClock(Date.now()), 10_000);
    return () => {
      clearInterval(refresh);
      clearInterval(ticker);
    };
  }, [filters, fetchSummary]);

  const onDrill = useCallback((f: DrillFilter) => {
    setDrillFilter((prev) =>
      prev &&
      prev.track === f.track &&
      prev.stage === f.stage &&
      prev.decidedBy === f.decidedBy &&
      prev.outcome === f.outcome
        ? null
        : f,
    );
    requestAnimationFrame(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const exportExcel = useCallback(() => {
    const wb = buildWorkbook(summary);
    XLSX.writeFile(
      wb,
      `ireb-dashboard-${summary.range.from}_to_${summary.range.to}.xlsx`,
    );
  }, [summary]);

  const visibleTracks: TrackKey[] = filters.track ? [filters.track] : TRACK_ORDER;
  const updatedAgo = secondsAgo(summary.generatedAt, clock);

  return (
    <div className="grid w-full min-w-0 max-w-full gap-5">
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchSummary(filters)}
            className="inline-flex h-9 shrink-0 items-center rounded-lg border border-rose-300 px-3 text-[13px] font-medium hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 dark:border-rose-800 dark:hover:bg-rose-900/40"
          >
            Retry
          </button>
        </div>
      )}

      {!summary.invariantOk && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          Data consistency check failed — pending + approved + rejected does not equal total for
          at least one track. Numbers may be incomplete.
        </p>
      )}

      <DashboardFilterBar filters={filters} options={filterOptions} onChange={setFilters} />

      {/* Aggregate stripe — sum of the track cards below. */}
      <TotalApplicationsStrip summary={summary} visibleTracks={visibleTracks} />

      {/* One card per track — clicking a card expands its detail below. */}
      <TrackSummaryStrip
        summary={summary}
        visibleTracks={visibleTracks}
        openTrack={openTrack}
        onToggle={(track) =>
          setOpenTrack((prev) => (prev === track ? null : track))
        }
      />

      {openTrack && visibleTracks.includes(openTrack) && (
        <div className={cn("min-w-0 transition-opacity", loading && "opacity-60")}>
          <TrackSection
            track={summary.tracks[openTrack]}
            open
            onToggle={() => setOpenTrack(null)}
            onDrill={onDrill}
          />
        </div>
      )}

      {/* All Requests / Sensitive Cases / Needs Attention — reacts to drill-down */}
      <div ref={tableRef} className="min-w-0 scroll-mt-40">
        <LeadsReportTabs
          leads={leads}
          sensitiveLeads={sensitiveLeads}
          currentRole={currentRole}
          canViewSensitive={canViewSensitive}
          drillFilter={drillFilter}
          onClearDrill={() => setDrillFilter(null)}
          attentionItems={summary.needsAttention}
          agingThresholdDays={summary.tracks.student_thesis.aging.thresholdDays}
          actions={
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
              <p className="mr-auto text-[13px] text-slate-500 dark:text-slate-400" aria-live="polite">
                {loading ? "Refreshing…" : `Updated ${updatedAgo}s ago`}
              </p>
              <button
                type="button"
                onClick={() => void fetchSummary(filters)}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <RefreshCw
                  className={cn("size-4", loading && "animate-spin motion-reduce:animate-none")}
                  aria-hidden
                />
                Refresh
              </button>
              <button
                type="button"
                onClick={exportExcel}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              >
                <Download className="size-4" aria-hidden />
                Export Excel
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
}
