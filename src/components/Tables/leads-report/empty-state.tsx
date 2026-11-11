"use client";

import { FileX } from "lucide-react";

export function EmptyState({ message = "No approval requests found" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <FileX className="mb-3 size-10 text-slate-300 dark:text-slate-600" aria-hidden />
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}
