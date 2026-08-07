/**
 * Centralized post-login redirect resolution.
 *
 * After a successful authentication, the user must be sent to an appropriate
 * landing page based on their assigned system roles. This module is the single
 * source of truth for that mapping so that new roles and destinations can be
 * added without touching authentication, session, or authorization logic.
 *
 * Usage:
 *   1. `resolvePostLoginLandingPage(roles)` — pure function, given the user's
 *      roles, returns the landing page path. Use this when roles are already
 *      known (e.g. server-side with a loaded session).
 *   2. `resolvePostLoginRedirect(fallbackUrl)` — client-side helper that
 *      fetches the freshly-created NextAuth session, reads the admin role,
 *      and returns the correct landing page. Falls back to `fallbackUrl`
 *      (the existing callbackUrl behaviour) for non-admin users or if the
 *      session cannot be loaded.
 */

import type { AdminRole } from "@/lib/admin-rbac";

/**
 * Roles that should land on the admin dashboard after login.
 *
 * To add a new administrative role with a dashboard landing page, simply add
 * it to this set. Any user with at least one of these roles is redirected to
 * {@link ADMIN_LANDING_PAGE}.
 */
export const ADMIN_LANDING_ROLES: ReadonlySet<AdminRole> = new Set([
  "administrator", // Super Admin
  "supervisor",
  "ireb",
]);

/** Landing page for users with any administrative role. */
export const ADMIN_LANDING_PAGE = "/";

/** Default landing page for users without administrative roles. */
export const DEFAULT_LANDING_PAGE = "/profile";

/**
 * Determines the post-login landing page based on the user's assigned roles.
 *
 * Accepts a single role or an array of roles to remain compatible with a
 * future multi-role model. Any match in {@link ADMIN_LANDING_ROLES} is
 * sufficient — there is no priority between roles.
 *
 * @returns The landing page path (`/dashboard` for admin roles, `/profile` otherwise).
 */
export function resolvePostLoginLandingPage(
  roles: AdminRole | AdminRole[] | null | undefined,
): string {
  if (!roles) return DEFAULT_LANDING_PAGE;

  const roleList = Array.isArray(roles) ? roles : [roles];
  for (const role of roleList) {
    if (role && ADMIN_LANDING_ROLES.has(role)) {
      return ADMIN_LANDING_PAGE;
    }
  }
  return DEFAULT_LANDING_PAGE;
}

/**
 * Client-side post-login redirect resolver.
 *
 * After `signIn(..., { redirect: false })` resolves successfully, the
 * NextAuth session cookie is set. This function fetches that session, reads
 * the user's `adminRole`, and returns the appropriate landing page.
 *
 * - Users with an administrative role → {@link ADMIN_LANDING_PAGE}
 * - All other users → `fallbackUrl` (preserves existing callbackUrl behaviour)
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
      const session = (await res.json()) as {
        user?: { adminRole?: AdminRole | null };
      } | null;
      const role = session?.user?.adminRole ?? null;
      if (role && ADMIN_LANDING_ROLES.has(role)) {
        return ADMIN_LANDING_PAGE;
      }
    }
  } catch {
    // Session fetch failed — fall back to the provided URL.
  }
  return fallbackUrl;
}
