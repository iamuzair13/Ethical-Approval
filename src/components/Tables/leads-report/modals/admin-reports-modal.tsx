"use client";

import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import { createPortal } from "react-dom";
import { ModalButton } from "../modal-shell";
import type { Lead } from "../types";

type AdminReportsPickerProps = {
  lead: Lead;
  onClose: () => void;
  onSelectStudent: () => void;
  onSelectStatus: () => void;
};

export function AdminReportsPicker({
  lead,
  onClose,
  onSelectStudent,
  onSelectStatus,
}: AdminReportsPickerProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-reports-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h3
              id="admin-reports-title"
              className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white"
            >
              Get Reports
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Application ID{" "}
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                {lead.applicationId}
              </span>
              {" · "}
              {lead.name}
            </p>
          </div>
          <ModalButton variant="secondary" onClick={onClose} className="px-3 py-1.5">
            Close
          </ModalButton>
        </div>
        <div className="grid gap-2 px-6 py-4">
          <button
            type="button"
            onClick={onSelectStudent}
            className={cn(
              "flex w-full flex-col items-start gap-1 rounded-lg border border-gray-200 bg-white px-4 py-3.5 text-left transition-all duration-150",
              "hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30",
              "dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-700 dark:hover:bg-blue-950/30",
            )}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <FileText className="size-4 text-blue-600" aria-hidden />
              Student Level Analysis Report (Individual)
            </span>
            <span className="text-xs leading-snug text-gray-500 dark:text-gray-400">
              Profile, timeline, status comparison, and recorded feedback for this application.
            </span>
          </button>
          <button
            type="button"
            onClick={onSelectStatus}
            className={cn(
              "flex w-full flex-col items-start gap-1 rounded-lg border border-gray-200 bg-white px-4 py-3.5 text-left transition-all duration-150",
              "hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30",
              "dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-700 dark:hover:bg-blue-950/30",
            )}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <FileText className="size-4 text-blue-600" aria-hidden />
              Report of Application Status
            </span>
            <span className="text-xs leading-snug text-gray-500 dark:text-gray-400">
              Same layout as the PDF: workflow fields for this application.
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

type AdminReportPreviewProps = {
  lead: Lead;
  kind: "student" | "status" | "faculty";
  previewHtml: string;
  loading: boolean;
  exporting: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onClose: () => void;
  onBack?: () => void;
  onDownload: () => void;
};

export function AdminReportPreview({
  lead,
  kind,
  previewHtml,
  loading,
  exporting,
  iframeRef,
  onClose,
  onBack,
  onDownload,
}: AdminReportPreviewProps) {
  const title =
    kind === "student"
      ? "Student Level Analysis Report (Individual)"
      : kind === "faculty"
        ? "Faculty Report (Individual)"
        : "Report of Application Status";

  return createPortal(
    <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 px-3 py-6 backdrop-blur-sm sm:px-4">
      <div className="flex max-h-screen min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
        <div className="flex shrink-0 flex-col gap-3 border-b border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-gray-700">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Application ID{" "}
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                {lead.applicationId}
              </span>
              {" · "}
              {lead.name}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {kind !== "faculty" && onBack && (
              <ModalButton variant="secondary" onClick={onBack}>
                Back
              </ModalButton>
            )}
            <ModalButton variant="secondary" onClick={onClose}>
              Close
            </ModalButton>
            <ModalButton
              variant="primary"
              disabled={exporting || loading || !previewHtml}
              onClick={onDownload}
            >
              {exporting ? "Saving PDF…" : "Download PDF"}
            </ModalButton>
          </div>
        </div>
        <p className="shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500 sm:px-6 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
          Use <span className="font-medium text-gray-700 dark:text-gray-300">Download PDF</span> for a{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">.pdf</span> file, or{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">Print / Save as PDF</span> inside
          the preview.
        </p>
        <div className="relative min-h-0 flex-1 bg-gray-50 p-3 sm:p-4 dark:bg-gray-900/30">
          {loading && (
            <div className="absolute inset-3 z-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white/90 text-sm font-medium text-gray-500 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-400">
              Loading submission for report…
            </div>
          )}
          <iframe
            ref={iframeRef}
            title="Report preview"
            className="block h-96 min-h-96 w-full max-h-90 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700"
            srcDoc={previewHtml}
            sandbox="allow-scripts allow-same-origin allow-modals"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
