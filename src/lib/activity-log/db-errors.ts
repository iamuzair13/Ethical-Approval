export function isMissingRelationError(error: unknown, relation?: string): boolean {
  if (!error || typeof error !== "object") return false;
  const pg = error as { code?: string; message?: string };
  if (pg.code !== "42P01") return false;
  if (!relation) return true;
  return String(pg.message ?? "").includes(relation);
}

export const ACTIVITY_EVENTS_SETUP_MESSAGE =
  "Activity audit table is not set up. Run: npm run db:migrate:008";
