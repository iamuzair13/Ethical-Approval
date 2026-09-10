"use client";

import { AlertTriangle, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ModalButton, ModalShell } from "../modal-shell";
import type { Lead } from "../types";

export type AdminReleaseAction = "recommend" | "mark_sensitive";

type IrebUser = {
  id: string;
  name: string;
  email: string;
};

type AdminReleaseModalProps = {
  lead: Lead | null;
  action: AdminReleaseAction | null;
  comment: string;
  onCommentChange: (value: string) => void;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => void;
  irebUserId: string;
  onIrebUserIdChange: (value: string) => void;
};

export function AdminReleaseModal({
  lead,
  action,
  comment,
  onCommentChange,
  busy,
  error,
  onClose,
  onSubmit,
  irebUserId,
  onIrebUserIdChange,
}: AdminReleaseModalProps) {
  const [irebUsers, setIrebUsers] = useState<IrebUser[]>([]);
  const [irebUsersLoading, setIrebUsersLoading] = useState(false);
  const [irebUsersError, setIrebUsersError] = useState<string | null>(null);

  const isSensitive = action === "mark_sensitive";
  const isRecommend = action === "recommend";

  useEffect(() => {
    if (!isRecommend) return;
    let cancelled = false;
    setIrebUsersLoading(true);
    setIrebUsersError(null);
    fetch("/api/admin/ireb-users")
      .then((r) => r.json())
      .then((data: { ok: boolean; users?: IrebUser[]; error?: string }) => {
        if (cancelled) return;
        if (data.ok && data.users) {
          setIrebUsers(data.users);
        } else {
          setIrebUsersError(data.error ?? "Failed to load IREB members.");
        }
      })
      .catch(() => {
        if (!cancelled) setIrebUsersError("Network error loading IREB members.");
      })
      .finally(() => {
        if (!cancelled) setIrebUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isRecommend]);

  if (!lead || !action) return null;

  const title = isSensitive ? "Mark as Sensitive Case" : "Recommend for IREB Review";
  const description = isSensitive
    ? "This will release the application to IREB members as a sensitive case. It will appear in the Sensitive Cases section."
    : "Select an IREB member to review this application. Only the selected member and administrators will be able to see it.";

  const canSubmit =
    !busy &&
    (isSensitive || (irebUserId !== "" && !irebUsersLoading && irebUsers.length > 0));

  return (
    <ModalShell
      open
      onClose={onClose}
      title={title}
      maxWidth="2xl"
      accentBorder={isSensitive ? "reject" : "approve"}
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
            variant={isSensitive ? "danger" : "success"}
            disabled={!canSubmit}
            onClick={onSubmit}
            className="w-full sm:w-auto"
          >
            {isSensitive ? "Mark as Sensitive" : "Recommend"}
          </ModalButton>
        </>
      }
    >
      {isSensitive && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            Sensitive cases are visible only to Administrators and IREB members.
            Once marked as sensitive, the application stays in the Sensitive Cases
            section until it is approved or rejected.
          </p>
        </div>
      )}

      {isRecommend && (
        <div className="mb-5">
          <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
            IREB Member <span className="text-red-500">*</span>
          </label>
          {irebUsersLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading IREB members…</p>
          ) : irebUsersError ? (
            <p className="text-sm text-red">{irebUsersError}</p>
          ) : (
            <select
              value={irebUserId}
              onChange={(e) => onIrebUserIdChange(e.target.value)}
              className={cn(
                "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700",
                "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                "dark:border-gray-600 dark:bg-gray-800 dark:text-white",
              )}
            >
              <option value="">Select an IREB member…</option>
              {irebUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          )}
          {irebUserId === "" && !irebUsersLoading && irebUsers.length > 0 && (
            <p className="mt-1.5 text-xs text-red">
              Please select an IREB member to recommend this application to.
            </p>
          )}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
          Comment (optional)
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
          placeholder="Optional note for IREB members"
        />
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Send className="size-3.5" aria-hidden />
        <span>
          {isSensitive
            ? "Releases to IREB Sensitive Cases section."
            : "Releases to the selected IREB member only."}
        </span>
      </div>
    </ModalShell>
  );
}
