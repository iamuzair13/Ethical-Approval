import type { PoolClient } from "pg";

/** Inclusive range for 6-digit numeric application IDs (100000–999999). */
export const APPLICATION_ID_MIN = 100_000;
export const APPLICATION_ID_MAX = 999_999;

/**
 * Generates a random 6-digit string (leading zeros never used — always 6 digits in 100000–999999).
 */
export function generateSixDigitApplicationId(): string {
  const n =
    APPLICATION_ID_MIN +
    Math.floor(Math.random() * (APPLICATION_ID_MAX - APPLICATION_ID_MIN + 1));
  return String(n);
}

/**
 * Reserves a unique `application_id` for `submissions` within an open transaction.
 * Retries on collision (unlikely with 900k codes).
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when a value looks like an internal UUID (not user-facing). */
export function isInternalUuid(value: string | null | undefined): boolean {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

/** 6-digit public application reference for display (never internal submission ids). */
export function formatApplicationReference(id: string | null | undefined): string {
  const s = typeof id === "string" ? id.trim() : "";
  return s || "—";
}

/** Staff SAP ID for reports — shows the SAP ID or a clear missing label; never email/UUID. */
export function formatStaffSapId(sapId: string | null | undefined): string {
  const sap = sapId?.trim();
  if (sap && !isInternalUuid(sap)) return sap;
  return "Not Provided";
}

/** Cleans legacy stored admin labels like "Admin {uuid}" for display. */
export function formatDecidedByName(
  name: string | null | undefined,
  resolvedName?: string | null,
): string {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return resolvedName?.trim() || "—";
  if (/^Admin\s+[0-9a-f-]{36}$/i.test(trimmed) || isInternalUuid(trimmed)) {
    return resolvedName?.trim() || "Administrator";
  }
  return trimmed;
}

export async function allocateUniqueApplicationId(
  client: PoolClient,
  maxAttempts = 40,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateSixDigitApplicationId();
    const dup = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM submissions WHERE application_id = $1) AS exists`,
      [candidate],
    );
    if (!dup.rows[0]?.exists) {
      return candidate;
    }
  }
  throw new Error("Unable to allocate a unique application id.");
}
