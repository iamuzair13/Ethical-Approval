"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type DashboardLiveRefreshProps = {
  intervalMs?: number;
};

export default function DashboardLiveRefresh({ intervalMs = 15000 }: DashboardLiveRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, router]);

  return null;
}

