"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type RefObject } from "react";

export function ReportPreviewModal({
  open,
  title,
  html,
  busy,
  onClose,
  onDownload,
  iframeRef,
}: {
  open: boolean;
  title: string;
  html: string;
  busy: boolean;
  onClose: () => void;
  onDownload: () => void | Promise<void>;
  iframeRef: RefObject<HTMLIFrameElement | null>;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-dark/60 px-3 py-6 backdrop-blur-[2px] sm:px-4">
      <div className="flex max-h-[95vh] min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-[12px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
        <div className="flex shrink-0 flex-col gap-3 border-b border-stroke px-4 py-4 dark:border-dark-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-dark dark:text-white">{title}</h3>
            <p className="mt-0.5 text-sm text-body">Preview — print or save as PDF from the toolbar inside the report.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-stroke px-3 py-2 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
            >
              Close
            </button>
            <button
              type="button"
              disabled={busy || !html}
              onClick={() => void onDownload()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-opacity-90 disabled:opacity-60"
            >
              {busy ? "Saving PDF…" : "Download PDF"}
            </button>
          </div>
        </div>
        <p className="shrink-0 border-b border-stroke bg-gray-1/50 px-4 py-2 text-xs text-body dark:border-dark-3 dark:bg-dark-2/50 sm:px-6">
          Use <span className="font-medium text-dark dark:text-white">Download PDF</span> for a file export, or{" "}
          <span className="font-medium text-dark dark:text-white">Print / Save as PDF</span> in the embedded preview.
        </p>
        <div className="relative min-h-0 flex-1 bg-gray-1 p-3 dark:bg-dark-2/40 sm:p-4">
          <iframe
            ref={iframeRef}
            title="Report preview"
            className="block h-[min(72vh,720px)] min-h-[380px] w-full rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3"
            srcDoc={html}
            sandbox="allow-scripts allow-same-origin allow-modals"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
