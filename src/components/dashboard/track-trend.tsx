"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useIsMobile } from "@/hooks/use-mobile";
import type { TrendPoint } from "./types";
import { COLOR_APPROVED, COLOR_REJECTED, COLOR_TOTAL } from "./types";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

/** Small sparkline for the section header — submitted volume over the range. */
export function TrackSparkline({ trend }: { trend: TrendPoint[] }) {
  if (trend.length < 2) return null;
  const options: ApexOptions = {
    chart: { type: "area", sparkline: { enabled: true }, fontFamily: "inherit" },
    stroke: { curve: "smooth", width: 2 },
    fill: { opacity: 0.25 },
    colors: [COLOR_TOTAL],
    tooltip: {
      fixed: { enabled: false },
      x: { show: false },
      y: { formatter: (v) => `${Math.round(v)} submitted` },
      marker: { show: false },
    },
  };
  return (
    <div className="h-9 w-28 shrink-0" aria-hidden="true">
      <Chart
        options={options}
        series={[{ name: "Submitted", data: trend.map((p) => p.submitted) }]}
        type="area"
        height={36}
        width={112}
      />
    </div>
  );
}

/** Stacked submitted/approved/rejected bar chart with a Table View toggle. */
export function TrackTrend({ trend, trackLabel }: { trend: TrendPoint[]; trackLabel: string }) {
  const [mode, setMode] = useState<"graph" | "table">("graph");
  const isMobile = useIsMobile();
  const height = isMobile ? 260 : 320;
  const hasData = trend.some((p) => p.submitted + p.approved + p.rejected > 0);

  const options: ApexOptions = {
    chart: {
      type: "bar",
      stacked: true,
      toolbar: { show: false },
      fontFamily: "inherit",
      width: "100%",
      height,
    },
    colors: [COLOR_TOTAL, COLOR_APPROVED, COLOR_REJECTED],
    plotOptions: {
      bar: { columnWidth: "60%", borderRadius: 3, borderRadiusApplication: "end" },
    },
    legend: {
      position: "bottom",
      horizontalAlign: "center",
      fontSize: isMobile ? "11px" : "12px",
      markers: { size: 6 },
      itemMargin: { horizontal: 8, vertical: 4 },
    },
    grid: { strokeDashArray: 5, yaxis: { lines: { show: true } }, padding: { left: 8, right: 8 } },
    dataLabels: { enabled: false },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (v) => String(Math.round(Number(v) || 0)) },
    },
    xaxis: {
      categories: trend.map((p) => p.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        rotate: isMobile ? -45 : 0,
        style: { fontSize: isMobile ? "9px" : "10px" },
        maxHeight: isMobile ? 60 : 40,
        trim: true,
      },
      tickAmount: isMobile ? Math.min(6, trend.length) : undefined,
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: { formatter: (v) => String(Math.round(Number(v) || 0)) },
    },
  };

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-dark-5 dark:text-dark-6">
          Trend
        </p>
        <button
          type="button"
          onClick={() => setMode((m) => (m === "graph" ? "table" : "graph"))}
          className="inline-flex items-center gap-2 rounded-lg border border-stroke px-3 py-1.5 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
        >
          {mode === "graph" ? "Table View" : "Graph View"}
        </button>
      </div>

      {!hasData && (
        <p className="rounded-lg border border-dashed border-stroke px-4 py-8 text-center text-sm text-dark-5 dark:border-dark-3 dark:text-dark-6">
          No submissions in this range for {trackLabel}.
        </p>
      )}

      {hasData && mode === "graph" && (
        <div
          className="w-full min-w-0 overflow-visible"
          role="img"
          aria-label={`${trackLabel} submitted, approved and rejected trend`}
        >
          <Chart
            options={options}
            series={[
              { name: "Submitted", data: trend.map((p) => p.submitted) },
              { name: "Approved", data: trend.map((p) => p.approved) },
              { name: "Rejected", data: trend.map((p) => p.rejected) },
            ]}
            type="bar"
            height={height}
            width="100%"
          />
        </div>
      )}

      {hasData && mode === "table" && (
        <div className="max-h-64 overflow-auto rounded-lg border border-stroke dark:border-dark-3">
          <table className="w-full min-w-[320px] text-left text-xs">
            <thead className="sticky top-0 bg-gray-1 dark:bg-dark-2">
              <tr>
                {["Period", "Submitted", "Approved", "Rejected"].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold text-dark dark:text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trend.map((p) => (
                <tr key={p.label} className="border-t border-stroke dark:border-dark-3">
                  <td className="whitespace-nowrap px-3 py-1.5 text-dark-5 dark:text-dark-6">{p.label}</td>
                  <td className="px-3 py-1.5 font-medium tabular-nums text-dark dark:text-white">{p.submitted}</td>
                  <td className="px-3 py-1.5 font-medium tabular-nums text-emerald-600 dark:text-emerald-400">{p.approved}</td>
                  <td className="px-3 py-1.5 font-medium tabular-nums text-red-600 dark:text-red-400">{p.rejected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
