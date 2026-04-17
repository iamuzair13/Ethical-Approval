"use client";

import { Header } from "@/components/Layouts/header";
import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";
import { UserInfo } from "@/components/Layouts/header/user-info";
import { Sidebar } from "@/components/Layouts/sidebar";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";

export function ConditionalAppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith("/auth") ?? false;
  const isAdminLoginRoute = pathname?.startsWith("/admin/login") ?? false;
  const isStudentProfileRoute = pathname?.startsWith("/profile") ?? false;

  if (isAuthRoute || isAdminLoginRoute) {
    return <>{children}</>;
  }

  if (isStudentProfileRoute) {
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

        <main className="isolate mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
