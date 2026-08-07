import { NextResponse } from "next/server";

/**
 * POST /api/admin/login
 *
 * Previously handled password-based admin login. Now that authentication is
 * unified via SSO (Google / email verification), this endpoint is deprecated.
 * Admin login is handled by the /auth/sign-in page using the unified
 * "student-email" provider, which checks admin_users for role assignment.
 *
 * Kept as a backward-compatible endpoint that returns a deprecation notice.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Password-based login is no longer supported. Use Google SSO or email verification at /auth/sign-in.",
      redirect: "/auth/sign-in",
    },
    { status: 410 },
  );
}
