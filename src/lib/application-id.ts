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
