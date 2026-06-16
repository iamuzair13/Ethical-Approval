"use client";

import { LEADS_EXCEL_COLUMNS } from "@/lib/leads-report-excel-export";
import { CheckSquare } from "lucide-react";
import { ModalButton, ModalShell } from "../modal-shell";

type ExportModalProps = {
  open: boolean;
  onClose: () => void;
  visibleCount: number;
  exportColState: Record<string, boolean>;
  onToggleColumn: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onExport: () => void;
};

export function ExportModal({
  open,
  onClose,
  visibleCount,
  exportColState,
  onToggleColumn,
  onSelectAll,
  onClearAll,
  onExport,
}: ExportModalProps) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Export to Excel"
      titleId="leads-export-title"
      maxWidth="lg"
      zIndex="elevated"
      className="max-h-screen"
      description={
        <>
          Exports <span className="font-semibold text-gray-900 dark:text-white">{visibleCount}</span>{" "}
          row{visibleCount === 1 ? "" : "s"} from the current tab and filters. Active search and filter
          values are written to a summary block at the top of the sheet.
        </>
      }
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose}>
            Cancel
          </ModalButton>
          <ModalButton variant="primary" onClick={onExport}>
            Download .xlsx
          </ModalButton>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSelectAll}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 underline transition hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:text-blue-400"
        >
          <CheckSquare className="size-3.5" aria-hidden />
          Select all
        </button>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-blue-600 underline transition hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:text-blue-400"
        >
          Clear all
        </button>
      </div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Columns
      </p>
      <div className="grid grid-cols-2 gap-3">
        {LEADS_EXCEL_COLUMNS.map((col) => (
          <label
            key={col.id}
            className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
          >
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
              checked={Boolean(exportColState[col.id])}
              onChange={() => onToggleColumn(col.id)}
            />
            <span className="text-gray-700 dark:text-gray-300">{col.header}</span>
          </label>
        ))}
      </div>
    </ModalShell>
  );
}
