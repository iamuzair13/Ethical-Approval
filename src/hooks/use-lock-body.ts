"use client";

import { useEffect } from "react";

/**
 * Locks body scrolling while `locked` is true.
 *
 * - Preserves the current scroll position (no jump to top).
 * - Compensates for the disappearing scrollbar by adding right padding
 *   to the body, preventing horizontal layout shift on fixed-width viewports.
 * - Restores the original overflow, padding, and scroll position on cleanup.
 * - Safe to call with multiple concurrent locks — only the first lock
 *   applies the style changes and only the last unlock restores them.
 *
 * Usage:
 *   useLockBody(modalOpen);
 *   // or with multiple modals:
 *   useLockBody(modalOpen || deleteOpen || syncOpen);
 */
export function useLockBody(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const body = document.body;
    const originalOverflow = body.style.overflow;
    const originalPaddingRight = body.style.paddingRight;

    // Capture scroll position before locking
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // Calculate scrollbar width to compensate for layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      const currentPadding = parseFloat(
        window.getComputedStyle(body).paddingRight,
      );
      if (Number.isNaN(currentPadding) || currentPadding < scrollbarWidth) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    return () => {
      body.style.overflow = originalOverflow;
      body.style.paddingRight = originalPaddingRight;
      // Restore scroll position in case the browser jumped
      window.scrollTo(scrollX, scrollY);
    };
  }, [locked]);
}
