import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthSecret } from "@/lib/auth-secret";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/auth");
  const isAdminAuthRoute = pathname.startsWith("/admin/login");
  const isAuthApiRoute = pathname.startsWith("/api/auth");
  const isAdminLoginApiRoute = pathname === "/api/admin/login";
  const isPublicProfileRoute = pathname === "/profile";
  const isNextInternals = pathname.startsWith("/_next");
  const isStaticFile = /\.[^/]+$/.test(pathname);

  if (
    isAuthRoute ||
    isAdminAuthRoute ||
    isAuthApiRoute ||
    isAdminLoginApiRoute ||
    isPublicProfileRoute ||
    isNextInternals ||
    isStaticFile
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: getAuthSecret(),
  });

  if (!token) {
    const signIn = new URL("/auth/sign-in", request.url);
    signIn.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search || ""}`);
    return NextResponse.redirect(signIn);
  }

  const adminRole = token.adminRole;
  const facultyMemberId = token.facultyMemberId;

  // My Applications — only accessible by authenticated users with a faculty
  // member profile. Students and users without a faculty profile are redirected.
  if (pathname === "/my-applications" || pathname.startsWith("/my-applications/")) {
    if (!facultyMemberId) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Administration routes — only accessible by Super Admin (administrator)
  // and IREB roles. Supervisors and faculty-only users are redirected home.
  const adminOnlyRoutes = [
    "/administrator",
    "/organizations",
    "/faculty-members",
    "/forms",
    "/reports",
    "/activity-center",
  ];
  const isAdminOnlyRoute = adminOnlyRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
  if (isAdminOnlyRoute && adminRole !== "administrator" && adminRole !== "ireb") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/admin")) {
    if (!adminRole) {
      // No admin role — redirect to sign-in page (unified SSO)
      const signIn = new URL("/auth/sign-in", request.url);
      signIn.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search || ""}`);
      return NextResponse.redirect(signIn);
    }

    if (pathname === "/admin") {
      if (adminRole === "supervisor") {
        return NextResponse.redirect(new URL("/SupervisorPanel", request.url));
      }
      if (adminRole === "ireb") {
        return NextResponse.redirect(new URL("/EthicalCommiteePanel", request.url));
      }
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (
      pathname.startsWith("/admin/faculty-members") &&
      adminRole !== "administrator"
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (
      pathname.startsWith("/admin/supervisor") &&
      adminRole !== "administrator" &&
      adminRole !== "supervisor"
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (
      pathname.startsWith("/admin/ireb") &&
      adminRole !== "administrator" &&
      adminRole !== "ireb"
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
