"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const WINDOW_SIZE = 3;

export function PaymentsOverviewViewToggle({ data }: { data: Series }) {
  const [mode, setMode] = useState<"graph" | "table">("graph");
  const periodLabels = useMemo(
    () =>
      (data?.[0]?.data ?? []).map((point) =>
        typeof point.x === "string" ? point.x : String(point.x),
      ),
    [data],
  );
  const dataLength = periodLabels.length;
  const maxStart = Math.max(0, dataLength - WINDOW_SIZE);
  const latestIndex = Math.max(0, dataLength - 1);
  const [selectedIndex, setSelectedIndex] = useState(latestIndex);

  // Scrollable window state – start at the most recent months
  const [visibleStart, setVisibleStart] = useState(maxStart);

  useEffect(() => {
    setSelectedIndex(latestIndex);
    setVisibleStart(maxStart);
  }, [latestIndex, maxStart]);

  const clampStart = useCallback(
    (val: number) => Math.min(Math.max(0, val), maxStart),
    [maxStart],
  );

  const shiftWindow = useCallback(
    (delta: number) => {
      setVisibleStart((prev) => clampStart(prev + delta));
    },
    [clampStart],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (dataLength <= WINDOW_SIZE) return;
      // Prevent page scroll while navigating the chart
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      shiftWindow(delta);
    },
    [dataLength, shiftWindow],
  );

  // Attach a native non-passive wheel listener so we can call preventDefault
  const chartContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;
    const nativeHandler = (e: WheelEvent) => {
      if (dataLength <= WINDOW_SIZE) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      shiftWindow(delta);
    };
    el.addEventListener("wheel", nativeHandler, { passive: false });
    return () => el.removeEventListener("wheel", nativeHandler);
  }, [dataLength, shiftWindow]);

  const graphSeries = useMemo(() => {
    const start = Math.min(visibleStart, maxStart);
    const end = Math.min(start + WINDOW_SIZE, dataLength);
    return data.map((series) => ({
      ...series,
      data: series.data.slice(start, end),
    }));
  }, [data, visibleStart, maxStart, dataLength]);

  const canScrollLeft = visibleStart > 0;
  const canScrollRight = visibleStart < maxStart;
  const visibleLabels = periodLabels.slice(
    Math.min(visibleStart, maxStart),
    Math.min(visibleStart + WINDOW_SIZE, dataLength),
  );

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
        <div className="grid gap-2">
          {/* Scroll controls row */}
          {dataLength > WINDOW_SIZE && (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => shiftWindow(-1)}
                disabled={!canScrollLeft}
                aria-label="Previous periods"
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-stroke text-xs transition",
                  canScrollLeft
                    ? "text-dark hover:bg-gray-1 dark:text-white dark:hover:bg-dark-2"
                    : "cursor-not-allowed opacity-40",
                )}
              >
                {/* left arrow */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>

              <div className="flex items-center gap-1.5 text-xs font-medium text-dark dark:text-dark-6">
                {visibleLabels.map((label, i) => (
                  <span key={label} className={cn(i === visibleLabels.length - 1 && "font-bold text-primary")}>
                    {label}
                    {i < visibleLabels.length - 1 && <span className="mx-1 text-stroke">|</span>}
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={() => shiftWindow(1)}
                disabled={!canScrollRight}
                aria-label="Next periods"
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-stroke text-xs transition",
                  canScrollRight
                    ? "text-dark hover:bg-gray-1 dark:text-white dark:hover:bg-dark-2"
                    : "cursor-not-allowed opacity-40",
                )}
              >
                {/* right arrow */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          )}

          {/* Chart with wheel scroll */}
          <div
            ref={chartContainerRef}
            onWheel={handleWheel}
            className={cn(
              "relative",
              dataLength > WINDOW_SIZE && "cursor-ew-resize",
            )}
          >
            <PaymentsOverviewChart data={graphSeries} />
            {dataLength > WINDOW_SIZE && (
              <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-gray-2/80 px-2.5 py-0.5 text-[10px] font-medium text-dark-5 dark:bg-dark-3/80 dark:text-dark-6">
                Scroll to navigate
              </div>
            )}
          </div>
        </div>
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

