"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId?: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "5xl";
  zIndex?: "default" | "elevated" | "top";
  accentBorder?: "none" | "approve" | "reject";
  className?: string;
};

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "5xl": "max-w-5xl",
};

const zIndexClasses = {
  default: "z-99999",
  elevated: "z-999999",
  top: "z-999999",
};

export function ModalShell({
  open,
  onClose,
  title,
  titleId,
  description,
  children,
  footer,
  maxWidth = "lg",
  zIndex = "default",
  accentBorder = "none",
  className,
}: ModalShellProps) {
  if (!open) return null;

  return <ModalShellInner {...{ open, onClose, title, titleId, description, children, footer, maxWidth, zIndex, accentBorder, className }} />;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function ModalShellInner({
  onClose,
  title,
  titleId,
  description,
  children,
  footer,
  maxWidth = "lg",
  zIndex = "default",
  accentBorder = "none",
  className,
}: Omit<ModalShellProps, "open">) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Focus the dialog on open; restore focus to the trigger on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => previous?.focus();
  }, []);

  // Escape to close + keep Tab cycling inside the dialog.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/50 px-4 py-6 backdrop-blur-sm",
        zIndexClasses[zIndex],
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "my-auto flex max-h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-gray-700 dark:bg-gray-800",
          maxWidthClasses[maxWidth],
          accentBorder === "approve" && "border-l-4 border-l-emerald-500",
          accentBorder === "reject" && "border-l-4 border-l-red-500",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId ?? "modal-title"}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="min-w-0 flex-1">
            <h3
              id={titleId ?? "modal-title"}
              className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white"
            >
              {title}
            </h3>
            {description && (
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0 rounded-lg p-2 text-gray-500 transition duration-150 ease-in-out hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 active:scale-[0.98] dark:hover:bg-gray-700"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">{children}</div>

        {footer && (
          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ModalButton({
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "success" | "danger";
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-lg px-4 py-2 text-sm font-medium transition duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
        variant === "secondary" &&
          "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700",
        variant === "primary" &&
          "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700",
        variant === "success" &&
          "bg-emerald-600 text-white hover:bg-emerald-700",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className,
      )}
      {...props}
    />
  );
}
