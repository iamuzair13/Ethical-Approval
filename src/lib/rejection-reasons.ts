export const REJECTION_REASON_OPTIONS = [
  { id: "incomplete_documentation", label: "Incomplete documentation" },
  {
    id: "unclear_research_or_methodological_weaknesses",
    label: "Unclear research objectives or Methodological weaknesses",
  },
  {
    id: "data_not_appropriate_ethical_concerns",
    label: "Data is not appropriately filled for ethical concerns",
  },
  {
    id: "inadequate_informed_consent",
    label: "Inadequate informed consent process",
  },
  {
    id: "vulnerable_or_sensitive_topic",
    label: "Vulnerable participant concerns/Sensitive topic concerns",
  },
  {
    id: "noncompliance_institutional_guidelines",
    label: "Non-compliance with institutional guidelines",
  },
  {
    id: "lack_of_permissions",
    label:
      "Lack of permissions (required approvals from departments, organizations, hospitals, or supervisors are missing)",
  },
] as const;

export type RejectionReasonId = (typeof REJECTION_REASON_OPTIONS)[number]["id"];

const VALID_IDS = new Set<string>(REJECTION_REASON_OPTIONS.map((o) => o.id));

export function isValidRejectionReasonId(id: string): boolean {
  return VALID_IDS.has(id);
}

/** Dedupes, keeps order, drops unknown ids. */
export function normalizeRejectionReasonIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!id || !isValidRejectionReasonId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function labelForRejectionReasonId(id: string): string | null {
  const row = REJECTION_REASON_OPTIONS.find((o) => o.id === id);
  return row?.label ?? null;
}

/**
 * Stored on `approval_decisions.comment` and used in applicant-facing emails after audit notes are stripped.
 */
export function formatRejectionDecisionComment(codes: string[], elaborate: string): string {
  const lines = codes
    .map((id) => labelForRejectionReasonId(id))
    .filter((line): line is string => Boolean(line));
  const reasonsBlock =
    lines.length > 0 ? `Selected reason(s):\n${lines.map((l) => `• ${l}`).join("\n")}\n\n` : "";
  return `${reasonsBlock}Please elaborate:\n${elaborate.trim()}`;
}
