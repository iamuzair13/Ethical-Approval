"use client";

import { Header } from "@/components/Layouts/header";
import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";
import { UserInfo } from "@/components/Layouts/header/user-info";
import { ViewAsBanner } from "@/components/Layouts/view-as-banner";
import { Sidebar } from "@/components/Layouts/sidebar";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { PropsWithChildren } from "react";

export function ConditionalAppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const isAuthRoute = pathname?.startsWith("/auth") ?? false;
  const isAdminLoginRoute = pathname?.startsWith("/admin/login") ?? false;

  // User-facing shells (no sidebar): the profile dashboard, the full profile
  // view, and the account-settings page. These are "manage your own account"
  // surfaces that students, faculty, and admins all use the same way, so they
  // intentionally stay free of the admin sidebar.
  const isUserShellRoute =
    (pathname?.startsWith("/profile") ?? false) ||
    (pathname?.startsWith("/pages/settings") ?? false);

  // Sidebar belongs to admin tooling. Any authenticated non-admin user gets
  // the minimal shell regardless of route — so a faculty member who navigates
  // to a route that would otherwise show the sidebar still sees a clean,
  // sidebar-free layout.
  const isAdmin = Boolean(session?.user?.adminRole);
  const isAuthenticatedNonAdmin =
    status === "authenticated" && !isAdmin;

  if (isAuthRoute || isAdminLoginRoute) {
    return <>{children}</>;
  }

  if (isUserShellRoute || isAuthenticatedNonAdmin) {
    return (
      <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a]">
        <header className="sticky top-0 z-30 border-b border-stroke bg-white px-4 py-4 shadow-1 dark:border-stroke-dark dark:bg-gray-dark md:px-6">
          <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between gap-4">
            <Link href="/profile" className="flex items-center gap-3">
              <span className="relative flex items-center">
                <Image
                  src="/images/logo/UOL-Rebrand-ID_Final-01.png"
                  width={180}
                  height={32}
                  alt="UOL"
                  priority
                  className="block dark:hidden"
                />
                <Image
                  src="/images/logo/logo-white.png"
                  width={140}
                  height={32}
                  alt="UOL"
                  priority
                  className="hidden dark:block"
                />
              </span>
       
             
            </Link>

            <div className="flex items-center gap-3">
              <ThemeToggleSwitch />
              <UserInfo />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-screen-2xl p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="w-full bg-gray-2 dark:bg-[#020d1a]">
        <Header />
        <ViewAsBanner />

        <main className="mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
