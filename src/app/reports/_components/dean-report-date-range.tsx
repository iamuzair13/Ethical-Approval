"use client";

import { Calendar } from "@/components/Layouts/sidebar/icons";
import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import { useEffect, useRef } from "react";

const fpBase = {
  mode: "single" as const,
  static: true,
  monthSelectorType: "static" as const,
  dateFormat: "Y-m-d",
};

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

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export function DeanReportDateRange({
  dateFrom,
  dateTo,
  onChangeFrom,
  onChangeTo,
}: {
  dateFrom: string;
  dateTo: string;
  onChangeFrom: (ymd: string) => void;
  onChangeTo: (ymd: string) => void;
}) {
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const fpStart = useRef<Instance | null>(null);
  const fpEnd = useRef<Instance | null>(null);
  const onFromRef = useRef(onChangeFrom);
  const onToRef = useRef(onChangeTo);
  onFromRef.current = onChangeFrom;
  onToRef.current = onChangeTo;

  useEffect(() => {
    const today = new Date();
    if (!startRef.current || !endRef.current) return;

    const endParsed = parseYmdLocal(dateTo);
    const startParsed = parseYmdLocal(dateFrom);

    fpStart.current = flatpickr(startRef.current, {
      ...fpBase,
      defaultDate: startParsed ?? undefined,
      maxDate: endParsed ?? today,
      onChange: (dates) => {
        if (dates[0]) onFromRef.current(toYmd(dates[0]));
      },
    });

    fpEnd.current = flatpickr(endRef.current, {
      ...fpBase,
      defaultDate: endParsed ?? undefined,
      minDate: startParsed ?? undefined,
      maxDate: today,
      onChange: (dates) => {
        if (dates[0]) onToRef.current(toYmd(dates[0]));
      },
    });

    return () => {
      fpStart.current?.destroy();
      fpStart.current = null;
      fpEnd.current?.destroy();
      fpEnd.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time flatpickr init; dates synced below
  }, []);

  useEffect(() => {
    if (!fpStart.current) return;
    const today = new Date();
    const endParsed = parseYmdLocal(dateTo);
    const startParsed = parseYmdLocal(dateFrom);
    fpStart.current.set("maxDate", endParsed ?? today);
    if (dateFrom && startParsed) {
      fpStart.current.setDate(startParsed, false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (!fpEnd.current) return;
    const today = new Date();
    const endParsed = parseYmdLocal(dateTo);
    const startParsed = parseYmdLocal(dateFrom);
    fpEnd.current.set("minDate", startParsed ?? undefined);
    fpEnd.current.set("maxDate", today);
    if (dateTo && endParsed) {
      fpEnd.current.setDate(endParsed, false);
    }
  }, [dateFrom, dateTo]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-dark-5 dark:text-dark-6">
          Start date
        </span>
        <div className="relative">
          <input
            ref={startRef}
            type="text"
            readOnly
            placeholder="Select start"
            className="form-datepicker w-full cursor-pointer rounded-lg border border-stroke bg-white px-3 py-2 pr-10 text-sm font-medium text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
            data-class="flatpickr-right"
          />
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <Calendar className="size-4 text-[#9CA3AF]" />
          </div>
        </div>
      </label>
      <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-dark-5 dark:text-dark-6">
          End date
        </span>
        <div className="relative">
          <input
            ref={endRef}
            type="text"
            readOnly
            placeholder="Select end"
            className="form-datepicker w-full cursor-pointer rounded-lg border border-stroke bg-white px-3 py-2 pr-10 text-sm font-medium text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
            data-class="flatpickr-right"
          />
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <Calendar className="size-4 text-[#9CA3AF]" />
          </div>
        </div>
      </label>
    </div>
  );
}

export function defaultDeanReportDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 90);
  return { from: toYmd(from), to: toYmd(to) };
}
