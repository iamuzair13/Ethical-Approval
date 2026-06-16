"use client";

import { type SubmissionReportInput } from "@/lib/application-report-html";
import { cn } from "@/lib/utils";
import { Paperclip } from "lucide-react";
import { ApplicationReportPdfGeneratorButton } from "../application-report-pdf-generator";
import { ModalButton, ModalShell } from "../modal-shell";
import type { Lead, SlotFileInfo } from "../types";

type AttachmentSlots = {
  labels: string[];
  files: Record<string, SlotFileInfo | null>;
  extras: { index: number; displayName: string; hasStoredFile: boolean }[];
};

type AttachmentModalProps = {
  lead: Lead;
  loading: boolean;
  error: string | null;
  payload: unknown;
  slots: AttachmentSlots;
  onClose: () => void;
  onViewSlot: (params: {
    label: string;
    fileName: string;
    hasStoredFile: boolean;
    downloadUrl?: string;
  }) => void;
  onDownloadSlot: (url: string, fileName: string, label: string) => void;
  onDownloadNameOnly: (label: string, fileName: string) => void;
};

export function AttachmentModal({
  lead,
  loading,
  error,
  payload,
  slots,
  onClose,
  onViewSlot,
  onDownloadSlot,
  onDownloadNameOnly,
}: AttachmentModalProps) {
  return (
    <ModalShell
      open
      onClose={onClose}
      title="Application documents"
      maxWidth="3xl"
      zIndex="elevated"
      className="max-h-screen"
      description={
        <>
          Application ID{" "}
          <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
            {lead.applicationId}
          </span>{" "}
          · {lead.name}
        </>
      }
    >
      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading submission…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!loading && !error && payload != null && typeof payload === "object" && (
        <div className="md:grid md:grid-cols-2 md:gap-6">
          <div>
            <div className="mb-6 flex flex-col gap-3">
              <ApplicationReportPdfGeneratorButton
                submission={(payload as { submission?: SubmissionReportInput }).submission ?? null}
                applicationId={lead.applicationId}
                submissionId={lead.id}
                className="shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Downloads a polished PDF report with structured application details and attachment audit
                sections for professional sharing and record-keeping.
              </p>
            </div>

            <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Required attachment slots
            </h4>
            <ul className="mb-6 grid gap-3">
              {slots.labels.length === 0 && (
                <li className="rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  No attachment checklist could be inferred for this submission.
                </li>
              )}
              {slots.labels.map((label) => {
                const slotInfo = slots.files[label];
                const fileName = slotInfo?.displayName ?? null;
                const attached = Boolean(fileName);
                const slotUrl =
                  attached && fileName
                    ? `/api/submissions/${lead.id}/attachment?slot=${encodeURIComponent(label)}`
                    : null;
                return (
                  <li
                    key={label}
                    className="rounded-lg border border-gray-200 p-4 transition hover:border-blue-300 dark:border-gray-700 dark:hover:border-blue-700"
                  >
                    <div className="flex items-start gap-2">
                      <Paperclip className="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                        {attached ? (
                          <p className="mt-1 truncate font-mono text-xs text-gray-500" title={fileName ?? ""}>
                            {fileName}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-gray-400">Not attached</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 text-xs font-semibold",
                              attached ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400",
                            )}
                          >
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                attached ? "bg-emerald-600" : "bg-gray-400",
                              )}
                              aria-hidden
                            />
                            {attached ? "Attached" : "Not attached"}
                          </span>
                          {attached && fileName && (
                            <>
                              <ModalButton
                                variant="secondary"
                                className="px-2 py-1 text-xs"
                                onClick={() => {
                                  if (slotUrl) {
                                    window.open(slotUrl, "_blank", "noopener,noreferrer");
                                    return;
                                  }
                                  onViewSlot({ label, fileName, hasStoredFile: false });
                                }}
                              >
                                View
                              </ModalButton>
                              <ModalButton
                                variant="primary"
                                className="px-2 py-1 text-xs"
                                onClick={() => {
                                  if (slotUrl) {
                                    void onDownloadSlot(slotUrl, fileName, label);
                                    return;
                                  }
                                  onDownloadNameOnly(label, fileName);
                                }}
                              >
                                Download
                              </ModalButton>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {slots.extras.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                Additional documents
              </h4>
              <ul className="grid gap-3">
                {slots.extras.map((extra) => {
                  const extraUrl = `/api/submissions/${lead.id}/attachment?extra=${extra.index}`;
                  return (
                    <li
                      key={`extra-${extra.index}-${extra.displayName}`}
                      className="rounded-lg border border-gray-200 p-4 transition hover:border-blue-300 dark:border-gray-700 dark:hover:border-blue-700"
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Additional upload {extra.index + 1}
                      </p>
                      <p className="mt-1 truncate font-mono text-xs text-gray-500" title={extra.displayName}>
                        {extra.displayName}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <ModalButton
                          variant="secondary"
                          className="px-2 py-1 text-xs"
                          onClick={() => {
                            window.open(extraUrl, "_blank", "noopener,noreferrer");
                          }}
                        >
                          View
                        </ModalButton>
                        <ModalButton
                          variant="primary"
                          className="px-2 py-1 text-xs"
                          onClick={() => {
                            void onDownloadSlot(extraUrl, extra.displayName, `Additional upload ${extra.index + 1}`);
                          }}
                        >
                          Download
                        </ModalButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
}
