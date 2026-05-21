"use client";

import {
  countViewableSubmissionDocuments,
  type SubmissionDocumentItem,
} from "@/lib/list-submission-documents";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

function canPreviewInline(fileName: string): boolean {
  return /\.(pdf|png|jpe?g|gif|webp)$/i.test(fileName);
}

type Props = {
  applicationId: string;
  documents: SubmissionDocumentItem[];
};

export function ViewDocumentsButton({ applicationId, documents }: Props) {
  const viewableCount = countViewableSubmissionDocuments(documents);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = useMemo(() => {
    if (documents.length === 0) return null;
    const picked = documents.find((d) => d.id === activeId);
    return picked ?? documents[0];
  }, [activeId, documents]);

  useEffect(() => {
    if (!open) return;
    const first = documents.find((d) => d.viewUrl) ?? documents[0];
    setActiveId(first?.id ?? null);
  }, [open, documents]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hasAny = documents.length > 0;

  return (
    <>
      <button
        type="button"
        disabled={!hasAny}
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          className="size-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
        </svg>
        View documents
        {viewableCount > 0 ? (
          <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-xs font-bold">{viewableCount}</span>
        ) : null}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100000] flex h-[100dvh] w-full flex-col bg-white dark:bg-gray-dark"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submission-documents-title"
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-stroke px-4 py-3 dark:border-dark-3 sm:gap-4 sm:px-6 sm:py-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stroke px-3 py-2 text-sm font-semibold text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
            >
              <svg
                className="size-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
            <div className="min-w-0 flex-1">
              <h3
                id="submission-documents-title"
                className="text-heading-6 font-bold text-dark dark:text-white"
              >
                Application documents
              </h3>
              <p className="mt-0.5 truncate text-sm text-body">
                Application ID{" "}
                <span className="font-mono font-semibold text-primary">{applicationId}</span>
              </p>
            </div>
          </header>

          {documents.length === 0 ? (
            <p className="flex flex-1 items-center justify-center px-6 text-sm text-body">
              No attachments were recorded for this application.
            </p>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(240px,300px)_1fr]">
              <aside className="flex min-h-0 flex-col border-b border-stroke dark:border-dark-3 md:border-b-0 md:border-r">
                <p className="shrink-0 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-body">
                  Documents ({documents.length})
                </p>
                <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 [scrollbar-gutter:stable]">
                  {documents.map((doc) => (
                    <li key={doc.id} className="mb-1">
                      <button
                        type="button"
                        onClick={() => setActiveId(doc.id)}
                        className={cn(
                          "w-full rounded-lg px-3 py-2.5 text-left transition",
                          active?.id === doc.id
                            ? "bg-primary/10 text-primary dark:bg-primary/20"
                            : "text-dark hover:bg-gray-1 dark:text-white dark:hover:bg-dark-2",
                        )}
                      >
                        <p className="text-sm font-medium leading-snug">{doc.label}</p>
                        <p className="mt-0.5 truncate font-mono text-xs text-body" title={doc.fileName}>
                          {doc.fileName}
                        </p>
                        {!doc.viewUrl && (
                          <span className="mt-1 inline-block text-xs text-amber-700 dark:text-amber-300">
                            Name only (file not stored)
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>

              <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-gray-1/40 dark:bg-dark-2/30">
                {active?.viewUrl && canPreviewInline(active.fileName) ? (
                  <iframe
                    key={active.viewUrl}
                    title={active.label}
                    src={active.viewUrl}
                    className="h-full min-h-0 w-full flex-1 border-0 bg-white dark:bg-gray-dark"
                  />
                ) : active?.viewUrl ? (
                  <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                    <p className="max-w-lg text-sm text-body">
                      This file type cannot be previewed inline. Open it in a new browser tab to view
                      without downloading.
                    </p>
                    <a
                      href={active.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-opacity-90"
                    >
                      Open {active.fileName}
                    </a>
                  </div>
                ) : (
                  <div className="flex h-full flex-1 flex-col items-center justify-center p-8 text-center text-sm text-body">
                    <p className="text-base font-medium text-dark dark:text-white">{active?.label}</p>
                    <p className="mt-2 break-all font-mono text-xs">{active?.fileName}</p>
                    <p className="mt-4 max-w-md">
                      Only the file name was saved for this slot (legacy submission). Contact the
                      applicant for the actual document.
                    </p>
                  </div>
                )}
              </main>
            </div>
          )}
        </div>
      )}
    </>
  );
}
