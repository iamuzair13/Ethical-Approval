/**
 * Shared text helpers for research summary reports (ethics snapshot + objectives).
 * Duplicated from admin-aggregate-reports-html to avoid widening that module's surface.
 */

import type { AggregateSubmissionInput } from "@/lib/admin-aggregate-reports-html";

function ethicsForm(ethics: unknown): Record<string, unknown> {
  if (!ethics || typeof ethics !== "object") return {};
  const e = ethics as { form?: unknown };
  if (e.form && typeof e.form === "object" && !Array.isArray(e.form)) {
    return e.form as Record<string, unknown>;
  }
  return {};
}

function ethicsField(form: Record<string, unknown>, key: string): string {
  const v = form[key];
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x.trim() : typeof x === "number" ? String(x) : ""))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof v === "object" && v && "label" in (v as object)) {
    const l = (v as { label?: unknown }).label;
    return typeof l === "string" ? l : "";
  }
  return "";
}

function researchPurposeLine(r: AggregateSubmissionInput): string {
  const form = ethicsForm(r.ethics_json);
  return (ethicsField(form, "researchPurpose") || (r.objectives ?? "").trim()).trim();
}

function mostCommonInsightText(values: string[]): string | null {
  const buckets = new Map<string, { count: number; display: string }>();
  for (const raw of values) {
    const display = raw.replace(/\s+/g, " ").trim();
    if (!display) continue;
    const key = display.toLowerCase();
    const cur = buckets.get(key);
    if (cur) cur.count += 1;
    else buckets.set(key, { count: 1, display });
  }
  if (buckets.size === 0) return null;
  let best: { count: number; display: string } | null = null;
  for (const v of buckets.values()) {
    if (!best || v.count > best.count || (v.count === best.count && v.display.localeCompare(best.display) < 0)) {
      best = v;
    }
  }
  return best?.display ?? null;
}

export function truncateForCell(s: string, maxLen: number): string {
  const t = s.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

export function commonResearchPurposeSummary(rows: AggregateSubmissionInput[]): string {
  const v = mostCommonInsightText(rows.map(researchPurposeLine));
  return v ? truncateForCell(v, 700) : "—";
}

export function topSdgsLine(rows: AggregateSubmissionInput[], limit: number): string {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const raw = ethicsField(ethicsForm(r.ethics_json), "sdgs");
    for (const part of raw.split(",")) {
      const p = part.trim();
      if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
    }
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top = sorted.slice(0, limit);
  if (top.length === 0) return "—";
  return top.map(([label, c]) => `${label} (${c})`).join("; ");
}
