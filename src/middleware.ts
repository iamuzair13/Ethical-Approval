import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthSecret } from "@/lib/auth-secret";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/auth");
  const isAdminAuthRoute = pathname.startsWith("/admin/login");
  const isAuthApiRoute = pathname.startsWith("/api/auth");
  const isAdminLoginApiRoute = pathname === "/api/admin/login";
  const isNextInternals = pathname.startsWith("/_next");
  const isStaticFile = /\.[^/]+$/.test(pathname);

  if (
    isAuthRoute ||
    isAdminAuthRoute ||
    isAuthApiRoute ||
    isAdminLoginApiRoute ||
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
    signIn.searchParams.set(
      "callbackUrl",
      `${pathname}${request.nextUrl.search || ""}`,
    );
    return NextResponse.redirect(signIn);
  }

  const adminRole = token.adminRole;
  if (
    pathname.startsWith("/administrator") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/organizations")
  ) {
    if (adminRole !== "administrator") {
      if (!adminRole) {
        const signIn = new URL("/admin/login", request.url);
        signIn.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search || ""}`);
        return NextResponse.redirect(signIn);
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!adminRole) {
      const signIn = new URL("/admin/login", request.url);
      signIn.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search || ""}`);
      return NextResponse.redirect(signIn);
    }

    if (pathname.startsWith("/admin/users") && adminRole !== "administrator") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (
      pathname.startsWith("/admin/dean") &&
      adminRole !== "administrator" &&
      adminRole !== "dean"
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
