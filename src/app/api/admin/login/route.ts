import { NextResponse } from "next/server";

/**
 * POST /api/admin/login
 *
 * This endpoint is deprecated. All authentication is now unified through
 * /auth/sign-in using the "student-email" provider, which handles students,
 * faculty, and admin users through a single authentication pipeline.
 *
 * Redirects to the unified login page.
 */
export async function POST() {
  return NextResponse.redirect(new URL("/auth/sign-in", process.env.NEXTAUTH_URL || "http://localhost:3000"));
}

/**
 * GET /api/admin/login
 *
 * Redirects to the unified login page.
 */
export async function GET() {
  return NextResponse.redirect(new URL("/auth/sign-in", process.env.NEXTAUTH_URL || "http://localhost:3000"));
}
