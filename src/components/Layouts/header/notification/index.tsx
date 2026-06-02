"use client";

import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BellIcon } from "./icons";

type NotificationItem = {
  id: number;
  description: string;
  createdAtFormatted: string;
  actionCode: string;
};

const POLL_MS = 45_000;

export function Notification() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/activity-events/notifications", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        unreadCount?: number;
        notifications?: NotificationItem[];
      };
      if (response.ok && payload.ok) {
        setUnreadCount(payload.unreadCount ?? 0);
        setItems(payload.notifications ?? []);
      }
    } catch {
      /* ignore network errors for bell poll */
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async () => {
    setUnreadCount(0);
    try {
      await fetch("/api/activity-events/notifications", {
        method: "POST",
        cache: "no-store",
      });
    } catch {
      /* keep UI cleared even if request fails */
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchNotifications();
      }
    }, POLL_MS);
    return () => window.clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!isOpen) return;
    void markAsRead();
  }, [isOpen, markAsRead]);

  const showDot = unreadCount > 0 && !isOpen;

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger
        className="grid size-12 place-items-center rounded-full border bg-gray-2 text-dark outline-none hover:text-primary focus-visible:border-primary focus-visible:text-primary dark:border-dark-4 dark:bg-dark-3 dark:text-white dark:focus-visible:border-primary"
        aria-label={
          unreadCount > 0
            ? `View notifications, ${unreadCount} unread`
            : "View notifications"
        }
      >
        <span className="relative">
          <BellIcon />

          {showDot && (
            <span
              className={cn(
                "absolute right-0 top-0 z-1 flex min-h-2 min-w-2 items-center justify-center rounded-full bg-red-light ring-2 ring-gray-2 dark:ring-dark-3",
                unreadCount > 9 ? "px-0.5" : "size-2",
              )}
            >
              {unreadCount <= 9 ? (
                <span className="absolute inset-0 -z-1 animate-ping rounded-full bg-red-light opacity-75" />
              ) : (
                <span className="text-[9px] font-bold leading-none text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
          )}
        </span>
      </DropdownTrigger>

      <DropdownContent
        align={isMobile ? "end" : "center"}
        className="border border-stroke bg-white px-3.5 py-3 text-dark shadow-md dark:border-dark-3 dark:bg-gray-dark dark:text-white min-[350px]:min-w-[22rem]"
      >
        <div className="mb-1 flex items-center justify-between px-2 py-1.5">
          <span className="text-lg font-medium text-dark dark:text-white">
            Notifications
          </span>
          {unreadCount > 0 && !isOpen && (
            <span className="rounded-md bg-primary px-[9px] py-0.5 text-xs font-medium text-white">
              {unreadCount} new
            </span>
          )}
        </div>

        <ul className="mb-3 max-h-[23rem] space-y-1 overflow-y-auto">
          {loading && (
            <li className="px-2 py-4 text-center text-sm text-dark-5">Loading…</li>
          )}
          {!loading && items.length === 0 && (
            <li className="px-2 py-4 text-center text-sm text-dark-5">
              No notifications yet.
            </li>
          )}
          {!loading &&
            items.map((item) => (
              <li key={item.id} role="menuitem">
                <Link
                  href="/activity-center"
                  onClick={() => setIsOpen(false)}
                  className="block rounded-lg px-2 py-2 outline-none hover:bg-gray-2 focus-visible:bg-gray-2 dark:hover:bg-dark-3 dark:focus-visible:bg-dark-3"
                >
                  <p className="text-sm font-medium text-dark dark:text-white line-clamp-2">
                    {item.description}
                  </p>
                  <span className="mt-0.5 block text-xs text-dark-5 dark:text-dark-6">
                    {item.createdAtFormatted}
                  </span>
                </Link>
              </li>
            ))}
        </ul>

        <Link
          href="/activity-center"
          onClick={() => setIsOpen(false)}
          className="block rounded-lg border border-primary p-2 text-center text-sm font-medium tracking-wide text-primary outline-none transition-colors hover:bg-blue-light-5 focus:bg-blue-light-5 dark:border-dark-3 dark:hover:bg-dark-3"
        >
          See all activity
        </Link>
      </DropdownContent>
    </Dropdown>
  );
}
