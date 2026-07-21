"use client";

import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "danger" | "primary";
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop fixed inset-0 z-[100000] flex items-center justify-center bg-dark/60 px-4 py-6 backdrop-blur-[2px]">
      <div className="modal-dialog w-full max-w-md rounded-[12px] border border-stroke bg-white p-6 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
        <h3 className="text-heading-6 font-bold text-dark dark:text-white">{title}</h3>
        {description ? <p className="mt-2 text-body-sm">{description}</p> : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="btn-press rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-dark transition hover:bg-gray-1 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={cn(
              "btn-press rounded-md px-3 py-1.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60",
              confirmVariant === "danger"
                ? "bg-red hover:bg-red/90"
                : "bg-primary hover:bg-primary/90",
            )}
          >
            {isConfirming ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
