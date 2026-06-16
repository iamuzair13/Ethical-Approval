"use client";

import { ModalShell } from "../modal-shell";
import type { Lead } from "../types";

type FeedbackModalProps = {
  lead: Lead;
  onClose: () => void;
};

export function FeedbackModal({ lead, onClose }: FeedbackModalProps) {
  return (
    <ModalShell
      open
      onClose={onClose}
      title="Application Feedback"
      maxWidth="2xl"
      description={
        <>
          Application ID {lead.applicationId} · {lead.name}
        </>
      }
    >
      <div className="rounded-lg bg-gray-50 p-4 text-sm leading-relaxed text-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
        <p className="whitespace-pre-wrap">{lead.latestFeedbackComment}</p>
      </div>
    </ModalShell>
  );
}
