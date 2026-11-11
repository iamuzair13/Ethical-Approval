"use client";

import { SearchIcon } from "@/assets/icons";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { MenuIcon } from "./icons";
import { ThemeToggleSwitch } from "./theme-toggle";
import { UserInfo } from "./user-info";
import { ViewAsMenu } from "./view-as/view-as-menu";

export function Header() {
  const { toggleSidebar, isMobile } = useSidebarContext();
  const pathname = usePathname();

  const dashboardLabel = (() => {
    if (pathname.toLowerCase().includes("hodpanel")) {
      return "HOD Approval Analysis";
    }

    if (pathname.toLowerCase().includes("ethical")) {
      return "IREB Approval Analysis";
    }

    return "Main Dashboard";
  })();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:px-6 2xl:px-10">
      <button
        onClick={toggleSidebar}
        className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
      >
        <MenuIcon />
        <span className="sr-only">Toggle Sidebar</span>
      </button>

      {isMobile && (
        <Link href={"/"} className="ml-2 max-[430px]:hidden min-[375px]:ml-4">
          <Image
            src={"/images/logo/logo-icon.svg"}
            width={32}
            height={32}
            alt=""
            role="presentation"
          />
        </Link>
      )}

      <div className="max-xl:hidden">
        <h1 className="text-[28px] font-semibold leading-[1.25] tracking-tight text-slate-900 dark:text-white">
          Institute Research Ethics Board
        </h1>
        <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
          {dashboardLabel}
        </p>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 min-[375px]:gap-3">
        <ThemeToggleSwitch />

        <ViewAsMenu />

        <div className="shrink-0">
          <UserInfo />
        </div>
      </div>
    </header>
  );
}
