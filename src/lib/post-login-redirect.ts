/**
 * Centralized post-login redirect resolution.
 *
 * After a successful authentication, all users are redirected to the root path "/".
 * Role-based access and module availability are handled separately by the application
 * logic, not by the authentication redirect.
 *
 * Usage:
 *   `resolvePostLoginRedirect(fallbackUrl)` — client-side helper that returns "/"
 *   after successful authentication. Falls back to `fallbackUrl` if the session
 *   cannot be loaded.
 */

/**
 * Universal landing page for all authenticated users.
 */
export const UNIVERSAL_LANDING_PAGE = "/";

/**
 * Client-side post-login redirect resolver.
 *
 * After `signIn(..., { redirect: false })` resolves successfully, the
 * NextAuth session cookie is set. This function always returns "/" as the
 * landing page, regardless of user role or type.
 *
 * All users (students, faculty, supervisors, IREB, super admins) are redirected
 * to the same landing page after authentication.
 *
 * If the session cannot be loaded (e.g. network error), `fallbackUrl` is
 * returned so that the user is never left stranded.
 */
export async function resolvePostLoginRedirect(
  fallbackUrl: string,
): Promise<string> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (res.ok) {
      // Session exists - redirect to universal landing page
      return UNIVERSAL_LANDING_PAGE;
    }
  } catch {
    // Session fetch failed — fall back to the provided URL.
  }
  return fallbackUrl;
}
