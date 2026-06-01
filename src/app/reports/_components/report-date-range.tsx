"use client";

import { Calendar } from "@/components/Layouts/sidebar/icons";
import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import { useEffect, useRef } from "react";

export type ReportDateRangeValue = {
  from: string;
  to: string;
};

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function parseYmdLocal(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d, 12, 0, 0, 0);
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

/** Empty range — user must pick both dates before generating a report. */
export function createDefaultReportDateRange(): ReportDateRangeValue {
  return { from: "", to: "" };
}

export function isReportDateRangeValid(range: ReportDateRangeValue): boolean {
  const { from, to } = range;
  return Boolean(from && to && from <= to);
}

/**
 * Updates one bound of a range. End is only nudged forward when it was already set
 * and would fall before the new start — never auto-filled from an empty end date.
 */
export function patchReportDateRange(
  range: ReportDateRangeValue,
  field: "from" | "to",
  value: string,
): ReportDateRangeValue {
  if (field === "from") {
    const next: ReportDateRangeValue = { ...range, from: value };
    if (next.to && next.to < value) {
      next.to = value;
    }
    return next;
  }
  return { ...range, to: value };
}

const INPUT_CLASS =
  "report-date-input w-full cursor-pointer rounded-lg border border-stroke bg-white px-3 py-2 pr-10 text-sm font-medium text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary";

function syncFlatpickrValue(fp: Instance, ymd: string): void {
  const parsed = parseYmdLocal(ymd);
  if (parsed) {
    fp.setDate(parsed, false);
  } else {
    fp.clear(false);
  }
}

type FlatpickrInput = HTMLInputElement & { _flatpickr?: Instance };

function destroyFlatpickrOnElement(el: HTMLInputElement | null): void {
  const existing = (el as FlatpickrInput | null)?._flatpickr;
  existing?.destroy();
}

export function ReportDateRange({
  idPrefix,
  range,
  onChange,
}: {
  /** Unique prefix so each report card has distinct input ids and flatpickr instances. */
  idPrefix: string;
  range: ReportDateRangeValue;
  onChange: (next: ReportDateRangeValue) => void;
}) {
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const fpStartRef = useRef<Instance | null>(null);
  const fpEndRef = useRef<Instance | null>(null);
  const rangeRef = useRef(range);
  const onChangeRef = useRef(onChange);
  rangeRef.current = range;
  onChangeRef.current = onChange;

  useEffect(() => {
    const startEl = startRef.current;
    const endEl = endRef.current;
    if (!startEl || !endEl) return;

    destroyFlatpickrOnElement(startEl);
    destroyFlatpickrOnElement(endEl);

    const today = new Date();

    fpStartRef.current = flatpickr(startEl, {
      mode: "single",
      dateFormat: "F j, Y",
      allowInput: false,
      disableMobile: true,
      animate: true,
      appendTo: document.body,
      maxDate: today,
      onChange: (dates) => {
        const ymd = dates[0] ? toYmd(dates[0]) : "";
        onChangeRef.current(patchReportDateRange(rangeRef.current, "from", ymd));
      },
    });

    fpEndRef.current = flatpickr(endEl, {
      mode: "single",
      dateFormat: "F j, Y",
      allowInput: false,
      disableMobile: true,
      animate: true,
      appendTo: document.body,
      maxDate: today,
      onChange: (dates) => {
        const ymd = dates[0] ? toYmd(dates[0]) : "";
        onChangeRef.current(patchReportDateRange(rangeRef.current, "to", ymd));
      },
    });

    return () => {
      fpStartRef.current?.destroy();
      fpStartRef.current = null;
      fpEndRef.current?.destroy();
      fpEndRef.current = null;
    };
  }, [idPrefix]);

  useEffect(() => {
    const fpStart = fpStartRef.current;
    const fpEnd = fpEndRef.current;
    if (!fpStart || !fpEnd) return;

    const today = new Date();
    const fromParsed = parseYmdLocal(range.from);
    const toParsed = parseYmdLocal(range.to);

    fpStart.set("maxDate", toParsed ?? today);
    syncFlatpickrValue(fpStart, range.from);

    fpEnd.set("minDate", fromParsed ?? undefined);
    fpEnd.set("maxDate", today);
    syncFlatpickrValue(fpEnd, range.to);
  }, [range.from, range.to]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <label className="flex min-w-[10rem] flex-1 flex-col gap-1" htmlFor={`${idPrefix}-from`}>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-dark-5 dark:text-dark-6">
          Start date
        </span>
        <div className="relative">
          <input
            id={`${idPrefix}-from`}
            ref={startRef}
            type="text"
            readOnly
            placeholder="Select start date"
            className={INPUT_CLASS}
          />
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <Calendar className="size-4 text-[#9CA3AF]" />
          </div>
        </div>
      </label>
      <label className="flex min-w-[10rem] flex-1 flex-col gap-1" htmlFor={`${idPrefix}-to`}>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-dark-5 dark:text-dark-6">
          End date
        </span>
        <div className="relative">
          <input
            id={`${idPrefix}-to`}
            ref={endRef}
            type="text"
            readOnly
            placeholder="Select end date"
            className={INPUT_CLASS}
          />
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <Calendar className="size-4 text-[#9CA3AF]" />
          </div>
        </div>
      </label>
    </div>
  );
}
