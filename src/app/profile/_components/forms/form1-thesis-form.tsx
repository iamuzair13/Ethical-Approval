"use client";

import { type ReactNode } from "react";

export function Form1ThesisForm({ children }: { children: ReactNode }) {
  return (
    <>
      <p className="mb-3 inline-flex w-fit items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
        <span
          aria-hidden="true"
          className="mr-1 inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-xs font-extrabold leading-none text-red-700 dark:bg-red-900/40 dark:text-red-300"
        >
          *
        </span>
        All fields in this step are required
      </p>
      {children}
    </>
  );
}
