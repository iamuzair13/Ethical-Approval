"use client";

import { useEffect, useState } from "react";
import { BarChartTable, DonutChart } from "./chart";

type UsedDeviceDatum = {
  name: string;
  amount: number;
  percentage?: number;
};

export function UsedDevicesViewToggle({
  data,
  periodOptions = [],
}: {
  data: UsedDeviceDatum[];
  periodOptions?: string[];
}) {
  const [mode, setMode] = useState<"graph" | "table">("graph");
  const [selectedPeriod, setSelectedPeriod] = useState(periodOptions[0] ?? "");

  useEffect(() => {
    setSelectedPeriod(periodOptions[0] ?? "");
  }, [periodOptions]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setMode((prev) => (prev === "graph" ? "table" : "graph"))}
          className="inline-flex items-center gap-2 rounded-lg border border-stroke px-3 py-1.5 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
        >
          {mode === "graph" ? "Table View" : "Graph View"}
        </button>
        {mode === "table" && periodOptions.length > 0 ? (
          <select
            value={selectedPeriod}
            onChange={(event) => setSelectedPeriod(event.target.value)}
            className="h-8 rounded-lg border border-stroke bg-white px-2 text-xs font-medium text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white"
          >
            {periodOptions.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="w-full">
        {mode === "graph" ? (
          <DonutChart data={data} />
        ) : (
          <BarChartTable data={data} selectedLabel={selectedPeriod} />
        )}
      </div>
    </div>
  );
}
