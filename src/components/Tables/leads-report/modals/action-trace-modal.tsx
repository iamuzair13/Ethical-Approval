"use client";

import { ModalShell } from "../modal-shell";
import type { Lead } from "../types";

type ActionTraceModalProps = {
  lead: Lead;
  onClose: () => void;
};

export function ActionTraceModal({ lead, onClose }: ActionTraceModalProps) {
  return (
    <ModalShell
      open
      onClose={onClose}
      title="Action Trace"
      maxWidth="2xl"
      description={
        <>
          Application ID {lead.applicationId} · {lead.name}
        </>
      }
    >
      <div className="rounded-lg bg-gray-50 p-4 text-sm leading-relaxed text-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
        <p className="whitespace-pre-wrap">{lead.latestActionTrace}</p>
      </div>
    </ModalShell>
  );
}
