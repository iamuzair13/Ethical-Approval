"use client";

import { FileX } from "lucide-react";

export function EmptyState({ message = "No approval requests found" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center bg-gray-50/50 py-12 dark:bg-gray-800/30">
      <FileX className="mb-3 size-10 text-gray-400 dark:text-gray-500" aria-hidden />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}
