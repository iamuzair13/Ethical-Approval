/** Matches payments-overview bar series and leads-report status badges. */
const STATUS_COLORS: Record<string, string> = {
  "Pending Dean Review": "#fca708",
  "Pending IREB Review": "#f7c060",
  Pending: "#fca708",
  "Approved by Dean": "#2aa33f",
  "Approved by IREB": "#39f029",
  Approved: "#2aa33f",
  "Rejected by Dean": "#ff0703",
  "Rejected by IREB": "#bf1c19",
  Rejected: "#ff0703",
};

export function colorsForUsedDeviceStatuses(names: string[]): string[] {
  return names.map((name) => colorForUsedDeviceStatus(name));
}

export function colorForUsedDeviceStatus(name: string): string {
  const exact = STATUS_COLORS[name];
  if (exact) return exact;

  const lower = name.toLowerCase();
  if (lower.includes("reject")) {
    return lower.includes("ireb") ? STATUS_COLORS["Rejected by IREB"] : STATUS_COLORS["Rejected by Dean"];
  }
  if (lower.includes("approv")) {
    return lower.includes("ireb") ? STATUS_COLORS["Approved by IREB"] : STATUS_COLORS["Approved by Dean"];
  }
  if (lower.includes("pending")) {
    return lower.includes("ireb") ? STATUS_COLORS["Pending IREB Review"] : STATUS_COLORS["Pending Dean Review"];
  }

  return "#5750F1";
}
