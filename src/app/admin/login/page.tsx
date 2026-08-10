import { redirect } from "next/navigation";

/**
 * /admin/login page
 *
 * This page is deprecated. All authentication is now unified through
 * /auth/sign-in. This page automatically redirects to the unified login page.
 */
export default function AdminLoginPage() {
  redirect("/auth/sign-in");
}
