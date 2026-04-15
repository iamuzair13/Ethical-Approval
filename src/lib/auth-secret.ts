const DEV_FALLBACK_SECRET =
  "dev-only-nextauth-secret-change-in-production-at-least-32-bytes";

export function getAuthSecret(): string | undefined {
  const configured = process.env.NEXTAUTH_SECRET?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_FALLBACK_SECRET;
  }

  return undefined;
}
