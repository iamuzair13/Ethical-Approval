"use client";

import { type ReactNode } from "react";

type Form1ThesisFormProps = {
  children: ReactNode;
  /** Form 3 (Medical) matches the Word template: only fields marked * are mandatory. */
  variant?: "all-required" | "marked-required";
};

export function Form1ThesisForm({
  children,
  variant = "all-required",
}: Form1ThesisFormProps) {
  const isMarkedOnly = variant === "marked-required";
  return (
    <>
      <p className="mb-3 inline-flex w-fit items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
        <span
          aria-hidden="true"
          className="mr-1 inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-xs font-extrabold leading-none text-red-700 dark:bg-red-900/40 dark:text-red-300"
        >
          *
        </span>
        {isMarkedOnly
          ? "Fields marked with * match the highlighted items on Form #3 (Medical Sciences) and are required."
          : "All fields in this step are required"}
      </p>
      {children}
    </>
  );
}
