"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function ViewAsBanner() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [stopping, setStopping] = useState(false);

  const viewAsActive = Boolean(session?.user?.viewAsActive);
  const viewAsUserName = session?.user?.viewAsUserName ?? session?.user?.name ?? "User";

  const handleStop = useCallback(async () => {
    if (stopping) return;
    setStopping(true);
    try {
      const response = await fetch("/api/admin/view-as/stop", { method: "POST" });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        toast.error(payload.error ?? "Could not exit View As mode.");
        return;
      }

      await update({ action: "stopViewAs" });
      router.refresh();
      toast.success("Returned to Administrator mode.");
    } catch {
      toast.error("Could not exit View As mode.");
    } finally {
      setStopping(false);
    }
  }, [stopping, update, router]);

  if (!viewAsActive) {
    return null;
  }

  return (
    <div className="sticky top-[4.75rem] z-20 border-b border-amber-300 bg-amber-50 px-4 py-2.5 dark:border-amber-700/60 dark:bg-amber-950/40 md:px-5 2xl:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
          Viewing As: <span className="font-semibold">{viewAsUserName}</span>
        </p>
        <button
          type="button"
          onClick={() => void handleStop()}
          disabled={stopping}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-60 dark:bg-amber-500 dark:hover:bg-amber-600"
        >
          {stopping ? "Returning…" : "Back to Administrator Mode"}
        </button>
      </div>
    </div>
  );
}
