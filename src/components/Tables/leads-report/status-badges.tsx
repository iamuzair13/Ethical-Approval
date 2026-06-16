"use client";

import { cn } from "@/lib/utils";
import type { LeadStatus } from "./types";

function StatusDot({ className }: { className: string }) {
  return (
    <span
      className={cn("mr-1.5 inline-block size-1.5 shrink-0 rounded-full", className)}
      aria-hidden
    />
  );
}

export function ApplicationIdBadge({ id }: { id: string }) {
  return (
    <span className="inline-block rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
      {id}
    </span>
  );
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  const isApproved =
    status === "Approved by Dean" || status === "Approved by IREB";
  const isRejected =
    status === "Rejected by Dean" || status === "Rejected by IREB";

  if (isApproved) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
        <StatusDot className="bg-emerald-600 dark:bg-emerald-400" />
        {status}
      </span>
    );
  }

  if (isRejected) {
    return (
      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
        <StatusDot className="bg-red-600 dark:bg-red-400" />
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
      <StatusDot className="bg-amber-600 dark:bg-amber-400" />
      {status}
    </span>
  );
}

export function ApplicationTypeBadge({ type }: { type: string }) {
  if (type === "Type A") {
    return (
      <span className="inline-block rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
        {type}
      </span>
    );
  }

  if (type === "Type B") {
    return (
      <span className="inline-block rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
        {type}
      </span>
    );
  }

  return (
    <span className="inline-block rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-300">
      {type}
    </span>
  );
}
