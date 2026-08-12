/**
 * Centralized post-login redirect resolution.
 *
 * After a successful authentication, the user is redirected to a role-based
 * destination:
 *   - Admin users (administrator / supervisor / ireb) → "/"  (dashboard)
 *   - Non-admin users (students, faculty without admin role) → "/profile"
 *
 * The role is read from the authenticated NextAuth session, NOT from stale
 * client-side state. This is the single source of truth for post-login
 * routing and is used by every authentication method (email/password,
 * Google SSO, DB/faculty login).
 *
 * Usage:
 *   `resolvePostLoginRedirect(fallbackUrl)` — client-side helper called after
 *   `signIn(..., { redirect: false })` resolves. Fetches the session to
 *   determine the user's role, then returns the appropriate destination.
 *   Falls back to `fallbackUrl` if the session cannot be loaded.
 */

/**
 * Landing page for admin users (Super admin, IREB, Supervisor).
 */
export const ADMIN_LANDING_PAGE = "/";

/**
 * Landing page for non-admin users (students, faculty without admin role).
 */
export const NON_ADMIN_LANDING_PAGE = "/profile";

/**
 * Admin roles that redirect to the dashboard after login.
 */
const ADMIN_ROLES = new Set(["administrator", "supervisor", "ireb"]);

/**
 * Client-side post-login redirect resolver.
 *
 * After `signIn(..., { redirect: false })` resolves successfully, the
 * NextAuth session cookie is set. This function fetches the session to
 * read the authenticated user's `adminRole` and returns the correct
 * destination:
 *
 *   - adminRole is "administrator" | "supervisor" | "ireb" → "/"
 *   - authenticated but no admin role → "/profile"
 *   - session cannot be loaded → `fallbackUrl`
 *
 * This ensures the redirect decision uses trusted, session-backed data
 * rather than stale React/localStorage state.
 */
export async function resolvePostLoginRedirect(
  fallbackUrl: string,
): Promise<string> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (res.ok) {
      const session = (await res.json()) as {
        user?: { adminRole?: string };
      } | null;

      // Authenticated user with an admin role → dashboard
      if (session?.user?.adminRole && ADMIN_ROLES.has(session.user.adminRole)) {
        return ADMIN_LANDING_PAGE;
      }

      // Authenticated user without an admin role → profile
      if (session?.user) {
        return NON_ADMIN_LANDING_PAGE;
      }
    }
  } catch {
    // Session fetch failed — fall back to the provided URL.
  }
  return fallbackUrl;
}
