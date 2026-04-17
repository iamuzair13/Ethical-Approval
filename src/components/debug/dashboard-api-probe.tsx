"use client";

import { useEffect } from "react";

type DashboardApiProbeProps = {
  tag: "home" | "dean" | "ireb";
};

export default function DashboardApiProbe({ tag }: DashboardApiProbeProps) {
  useEffect(() => {
    void fetch(`/api/dashboard/data?debug=1&tag=${tag}`, {
      method: "GET",
      cache: "no-store",
    }).catch(() => {
      // Silent on purpose: probe is only for inspectable Network payloads.
    });
  }, [tag]);

  return null;
}

