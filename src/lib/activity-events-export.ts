import * as XLSX from "xlsx";
import type { ActivityEventDto } from "@/lib/activity-log";

export const ACTIVITY_EXPORT_COLUMNS = [
  { key: "timestamp", header: "Timestamp" },
  { key: "actorName", header: "Actor Name" },
  { key: "actorRole", header: "Actor Role" },
  { key: "effectiveName", header: "Effective User Name" },
  { key: "effectiveRole", header: "Effective User Role" },
  { key: "actionCode", header: "Action Type" },
  { key: "description", header: "Description" },
  { key: "targetType", header: "Target Entity" },
  { key: "targetId", header: "Target ID" },
  { key: "facultyName", header: "Faculty" },
  { key: "createdAt", header: "Created At" },
] as const;

function formatUtcTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function rowToValues(event: ActivityEventDto): string[] {
  return [
    formatUtcTimestamp(event.createdAt),
    event.actorName,
    event.actorRole,
    event.effectiveName ?? "",
    event.effectiveRole ?? "",
    event.actionCode,
    event.description,
    event.targetType,
    event.targetId ?? "",
    event.facultyName ?? "",
    event.createdAt,
  ];
}

export function activityEventsToCsv(events: ActivityEventDto[]): string {
  const headers = ACTIVITY_EXPORT_COLUMNS.map((c) => c.header);
  const lines = [headers.map(escapeCsvField).join(",")];
  for (const event of events) {
    lines.push(rowToValues(event).map(escapeCsvField).join(","));
  }
  return lines.join("\r\n");
}

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function activityEventsToXlsxBuffer(events: ActivityEventDto[]): Buffer {
  const headers = ACTIVITY_EXPORT_COLUMNS.map((c) => c.header);
  const aoa: string[][] = [headers, ...events.map(rowToValues)];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Activity");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}
