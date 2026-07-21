"use client";

import { REJECTION_REASON_OPTIONS } from "@/lib/rejection-reasons";
import { cn } from "@/lib/utils";
import { ModalButton, ModalShell } from "../modal-shell";
import type { AdminOption, DecisionAction, Lead } from "../types";

type DecisionModalProps = {
  lead: Lead;
  action: DecisionAction;
  currentRole: "administrator" | "supervisor" | "ireb" | null;
  comment: string;
  onCommentChange: (value: string) => void;
  selectedRejectionReasons: string[];
  onToggleRejectionReason: (id: string) => void;
  selectedOnBehalfOf: string;
  onOnBehalfOfChange: (value: string) => void;
  adminOptions: { supervisorOption: AdminOption | null; irebOptions: AdminOption[] };
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export function DecisionModal({
  lead,
  action,
  currentRole,
  comment,
  onCommentChange,
  selectedRejectionReasons,
  onToggleRejectionReason,
  selectedOnBehalfOf,
  onOnBehalfOfChange,
  adminOptions,
  busy,
  onClose,
  onSubmit,
}: DecisionModalProps) {
  return (
    <ModalShell
      open
      onClose={onClose}
      title={action === "approved" ? "Approve Request" : "Reject Request"}
      maxWidth="2xl"
      accentBorder={action === "approved" ? "approve" : "reject"}
      description={
        <>
          Application ID {lead.applicationId} · {lead.name} · {lead.faculty}
        </>
      }
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </ModalButton>
          <ModalButton
            variant={action === "approved" ? "success" : "danger"}
            disabled={busy}
            onClick={onSubmit}
            className="w-full sm:w-auto"
          >
            {action === "approved" ? "Confirm Approval" : "Confirm Rejection"}
          </ModalButton>
        </>
      }
    >
      {currentRole === "administrator" && (
        <div className="mb-5 grid gap-4">
          {lead.stage === "supervisor" && (
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">On behalf of supervisor</p>
              <select
                value={selectedOnBehalfOf}
                onChange={(e) => onOnBehalfOfChange(e.target.value)}
                className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Select supervisor</option>
                {adminOptions.supervisorOption && (
                  <option value={adminOptions.supervisorOption.id}>{adminOptions.supervisorOption.name}</option>
                )}
              </select>
            </div>
          )}
          {lead.stage === "ireb" && (
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                On behalf of IREB member
              </p>
              <select
                value={selectedOnBehalfOf}
                onChange={(e) => onOnBehalfOfChange(e.target.value)}
                className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Select IREB member</option>
                {adminOptions.irebOptions.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {action === "rejected" && (
        <div className="mb-5 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Supervisor / IREB reasons for rejection (select all that apply)
            <span className="text-red-600"> *</span>
          </p>
          <ul className="mt-3 space-y-3">
            {REJECTION_REASON_OPTIONS.map((opt) => (
              <li key={opt.id}>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={selectedRejectionReasons.includes(opt.id)}
                    onChange={() => onToggleRejectionReason(opt.id)}
                    className="mt-0.5 size-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                  />
                  <span>{opt.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
          {action === "rejected" ? (
            <>
              Please elaborate
              <span className="text-red-600"> *</span>
            </>
          ) : (
            "Comment (optional)"
          )}
        </label>
        <textarea
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          rows={4}
          className={cn(
            "min-h-24 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700",
            "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
            "dark:border-gray-600 dark:bg-gray-800 dark:text-white",
          )}
          placeholder={
            action === "rejected"
              ? "Add detail and context for the applicant"
              : "Optional note"
          }
        />
      </div>
    </ModalShell>
  );
}
