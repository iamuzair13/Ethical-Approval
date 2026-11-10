"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import type { TrendPoint } from "./types";
import { COLOR_APPROVED, COLOR_REJECTED, COLOR_TOTAL } from "./types";
import { cn } from "@/lib/utils";

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
    <div className="h-9 w-28" aria-hidden="true">
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
  const hasData = trend.some((p) => p.submitted + p.approved + p.rejected > 0);

  const options: ApexOptions = {
    chart: { type: "bar", stacked: true, toolbar: { show: false }, fontFamily: "inherit" },
    colors: [COLOR_TOTAL, COLOR_APPROVED, COLOR_REJECTED],
    plotOptions: {
      bar: { columnWidth: "60%", borderRadius: 3, borderRadiusApplication: "end" },
    },
    legend: { position: "bottom", horizontalAlign: "center", fontSize: "12px", markers: { size: 6 } },
    grid: { strokeDashArray: 5, yaxis: { lines: { show: true } } },
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
      labels: { rotate: -45, style: { fontSize: "10px" }, maxHeight: 60 },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: { formatter: (v) => String(Math.round(Number(v) || 0)) },
    },
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
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
        <div className="-ml-3" role="img" aria-label={`${trackLabel} submitted, approved and rejected trend`}>
          <Chart
            options={options}
            series={[
              { name: "Submitted", data: trend.map((p) => p.submitted) },
              { name: "Approved", data: trend.map((p) => p.approved) },
              { name: "Rejected", data: trend.map((p) => p.rejected) },
            ]}
            type="bar"
            height={240}
          />
        </div>
      )}

      {hasData && mode === "table" && (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-stroke dark:border-dark-3">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-gray-1 dark:bg-dark-2">
              <tr>
                {["Period", "Submitted", "Approved", "Rejected"].map((h) => (
                  <th key={h} className={cn("px-3 py-2 font-semibold text-dark dark:text-white")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trend.map((p) => (
                <tr key={p.label} className="border-t border-stroke dark:border-dark-3">
                  <td className="px-3 py-1.5 text-dark-5 dark:text-dark-6">{p.label}</td>
                  <td className="px-3 py-1.5 font-medium text-dark dark:text-white">{p.submitted}</td>
                  <td className="px-3 py-1.5 font-medium text-emerald-600 dark:text-emerald-400">{p.approved}</td>
                  <td className="px-3 py-1.5 font-medium text-red-600 dark:text-red-400">{p.rejected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
