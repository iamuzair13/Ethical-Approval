"use client";

import { cn } from "@/lib/utils";
import { useLockBody } from "@/hooks/use-lock-body";
import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId?: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  /** Set to false to prevent closing on backdrop click. */
  closeOnBackdrop?: boolean;
  /** Set to false to hide the default close button. */
  showCloseButton?: boolean;
  className?: string;
  bodyClassName?: string;
};

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Reusable enterprise-grade modal dialog.
 *
 * Features:
 * - Rendered in a portal (document.body) to avoid z-index/overflow issues.
 * - Body scroll locked via `useLockBody` (with scrollbar compensation).
 * - Focus trapped inside the dialog while open; focus restored on close.
 * - ESC key closes the dialog.
 * - Backdrop click closes the dialog (configurable).
 * - ARIA attributes for accessibility (role, aria-modal, aria-labelledby).
 * - Consistent header / body / footer layout with the project's design tokens.
 * - Smooth open/close animations via existing `modal-backdrop` / `modal-dialog` CSS.
 */
export function Modal({
  open,
  onClose,
  title,
  titleId,
  description,
  children,
  footer,
  size = "lg",
  closeOnBackdrop = true,
  showCloseButton = true,
  className,
  bodyClassName,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Keep the latest onClose in a ref so that handleKeyDown has a stable
  // identity and doesn't trigger the focus-management effect on every
  // parent re-render (which would steal focus from inputs inside the dialog).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Lock body scroll while open
  useLockBody(open);

  const handleKeyDown = useCallback(
    (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCloseRef.current();
    },
    [],
  );

  // Focus management + ESC listener — only re-runs when `open` changes.
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Move focus into the dialog
    const dialog = dialogRef.current;
    if (dialog) {
      const firstFocusable = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (firstFocusable) {
        requestAnimationFrame(() => firstFocusable.focus());
      } else {
        requestAnimationFrame(() => dialog.focus());
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      previouslyFocused.current?.focus();
    };
  }, [open, handleKeyDown]);

  // Focus trap handler
  const trapFocus = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || !dialog.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  if (!open) return null;

  const content = (
    <div
      className="modal-backdrop fixed inset-0 z-[100000] flex items-start justify-center overflow-y-auto bg-dark/60 px-4 py-6 backdrop-blur-[2px] sm:items-center"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId ?? "modal-title"}
        tabIndex={-1}
        onKeyDown={trapFocus}
        className={cn(
          "modal-dialog my-auto flex max-h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden rounded-xl border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card",
          sizeClasses[size],
          className,
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-stroke px-6 py-4 dark:border-dark-3">
          <div className="min-w-0 flex-1">
            <h3
              id={titleId ?? "modal-title"}
              className="text-lg font-semibold tracking-tight text-dark dark:text-white"
            >
              {title}
            </h3>
            {description && (
              <div className="mt-1 text-sm text-dark-5 dark:text-dark-6">
                {description}
              </div>
            )}
          </div>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="btn-press shrink-0 rounded-lg p-2 text-dark-5 transition hover:bg-gray-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:hover:bg-dark-2"
            >
              <X className="size-5" aria-hidden />
            </button>
          )}
        </div>

        {/* Body */}
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-6 py-5",
            bodyClassName,
          )}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-stroke px-6 py-4 dark:border-dark-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ─── Modal button helper ───

type ModalButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function ModalButton({
  variant = "secondary",
  className,
  ...props
}: ModalButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "btn-press rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "secondary" &&
          "border border-stroke text-dark hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2",
        variant === "primary" &&
          "bg-primary text-white hover:bg-primary/90",
        variant === "danger" &&
          "bg-red text-white hover:bg-red/90",
        className,
      )}
      {...props}
    />
  );
}
