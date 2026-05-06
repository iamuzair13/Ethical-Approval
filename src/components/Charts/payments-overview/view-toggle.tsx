"use client";

import { useEffect, useMemo, useState } from "react";
import { PaymentsOverviewBarChartTable, PaymentsOverviewChart } from "./chart";
import { cn } from "@/lib/utils";

type Series = Array<{
  name: string;
  data: { x: unknown; y: number }[];
}>;

function ToggleButton({
  mode,
  onToggle,
  className,
}: {
  mode: "graph" | "table";
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-stroke px-3 py-1.5 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2",
        className,
      )}
    >
      {mode === "graph" ? "Table View" : "Graph View"}
    </button>
  );
}

export function PaymentsOverviewViewToggle({ data }: { data: Series }) {
  const [mode, setMode] = useState<"graph" | "table">("graph");
  const periodLabels = useMemo(
    () =>
      (data?.[0]?.data ?? []).map((point) =>
        typeof point.x === "string" ? point.x : String(point.x),
      ),
    [data],
  );
  const latestIndex = Math.max(0, periodLabels.length - 1);
  const [selectedIndex, setSelectedIndex] = useState(latestIndex);

  useEffect(() => {
    setSelectedIndex(latestIndex);
  }, [latestIndex]);

  const graphSeries = useMemo(() => {
    return data.map((series) => ({
      ...series,
      data: series.data.slice(-3),
    }));
  }, [data]);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <ToggleButton
          mode={mode}
          onToggle={() => setMode((p) => (p === "graph" ? "table" : "graph"))}
        />
        {mode === "table" && periodLabels.length > 0 ? (
          <select
            value={selectedIndex}
            onChange={(event) => setSelectedIndex(Number(event.target.value))}
            className="h-8 rounded-lg border border-stroke bg-white px-2 text-xs font-medium text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white"
          >
            {periodLabels.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {mode === "graph" ? (
        <PaymentsOverviewChart data={graphSeries} />
      ) : (
        <div className="rounded-lg border border-stroke p-3 dark:border-dark-3">
          <PaymentsOverviewBarChartTable
            data={data}
            selectedIndex={selectedIndex}
            selectedLabel={periodLabels[selectedIndex] ?? "Latest"}
          />
        </div>
      )}
    </div>
  );
}

