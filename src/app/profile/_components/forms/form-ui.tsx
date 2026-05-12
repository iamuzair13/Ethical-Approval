"use client";

import {
  Children,
  forwardRef,
  isValidElement,
  type ChangeEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { requiredMarkField } from "./form-validation-mark";
import { Required } from "./required";

/* ============================================================
   Shared Tailwind class tokens
   ============================================================ */

export const baseInputClasses =
  "w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm text-dark transition-colors placeholder:text-body/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-3 dark:text-white dark:placeholder:text-dark-6";

export const readOnlyInputClasses =
  "w-full rounded-lg border border-stroke bg-gray-1 px-4 py-3 text-sm text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white";

export const selectClasses = `${baseInputClasses} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_12px_center] bg-no-repeat pr-10`;

export const disabledSelectClasses =
  "w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm text-dark opacity-70 cursor-not-allowed dark:border-dark-3 dark:text-white";

/* ============================================================
   Required Mark
   ============================================================ */

export function RequiredMark() {
  return <span className="ml-1 text-red-600 dark:text-red-400">*</span>;
}

/* ============================================================
   Step header
   ============================================================ */

export function StepHeader({
  index,
  title,
  required = false,
  subtitle,
}: {
  index: number;
  title: ReactNode;
  required?: boolean;
  subtitle?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
          Step {index}
        </span>
        <h3 className="text-xl font-bold tracking-tight text-dark dark:text-white">
          {title}
          {required && <RequiredMark />}
        </h3>
      </div>
      {subtitle && (
        <p className="text-sm text-body dark:text-dark-6">{subtitle}</p>
      )}
    </div>
  );
}

/* ============================================================
   Section / SubSection
   ============================================================ */

type FormSectionProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
};

export function FormSection({
  title,
  subtitle,
  children,
  className = "",
  ...rest
}: FormSectionProps) {
  return (
    <div
      {...rest}
      className={`rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2 ${className}`}
    >
      {(title || subtitle) && (
        <div className="mb-4 flex flex-col gap-1">
          {title && (
            <h4 className="text-base font-semibold text-dark dark:text-white">
              {title}
            </h4>
          )}
          {subtitle && (
            <p className="text-xs text-body dark:text-dark-6">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h4 className={`text-base font-semibold text-dark dark:text-white ${className}`}>
      {children}
    </h4>
  );
}

export function SubsectionTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-sm font-semibold text-dark dark:text-white ${className}`}
    >
      {children}
    </p>
  );
}

/* ============================================================
   Field layout
   ============================================================ */

export function FieldRow({
  children,
  cols = 2,
  className = "",
}: {
  children: ReactNode;
  cols?: 1 | 2 | 3;
  className?: string;
}) {
  const colClass =
    cols === 1
      ? "grid-cols-1"
      : cols === 3
        ? "md:grid-cols-3"
        : "md:grid-cols-2";
  return (
    <div className={`grid gap-4 ${colClass} ${className}`}>{children}</div>
  );
}

export function FieldGroup({
  label,
  required,
  children,
  className = "",
  fullWidth = false,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}) {
  const hasRequiredWrapper = Children.toArray(children).some(
    (child) => isValidElement(child) && child.type === Required,
  );

  return (
    <div
      className={`flex flex-col gap-1.5 ${fullWidth ? "md:col-span-2" : ""} ${className}`}
    >
      {!hasRequiredWrapper && (
        <span className="text-sm font-medium text-dark dark:text-white">
          {label}
          {required && <RequiredMark />}
        </span>
      )}
      {children}
    </div>
  );
}

/* ============================================================
   Inputs
   ============================================================ */

export const BaseInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function BaseInput({ className = "", ...rest }, ref) {
  return (
    <input ref={ref} className={`${baseInputClasses} ${className}`} {...rest} />
  );
});

export const BaseTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function BaseTextarea({ className = "", rows = 3, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`${baseInputClasses} ${className}`}
      {...rest}
    />
  );
});

export const BaseSelect = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function BaseSelect({ className = "", disabled, ...rest }, ref) {
  const cls = disabled ? disabledSelectClasses : selectClasses;
  return (
    <select
      ref={ref}
      disabled={disabled}
      className={`${cls} ${className}`}
      {...rest}
    />
  );
});

export const ReadOnlyInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function ReadOnlyInput({ className = "", ...rest }, ref) {
  return (
    <input
      ref={ref}
      readOnly
      className={`${readOnlyInputClasses} ${className}`}
      {...rest}
    />
  );
});

/* ============================================================
   Checkbox / Radio Tiles
   ============================================================ */

export function CheckboxGroup({
  options,
  checkedFn,
  toggleFn,
  columns = 2,
}: {
  options: readonly string[] | string[];
  checkedFn: (item: string) => boolean;
  toggleFn: (item: string) => void;
  columns?: 1 | 2 | 3;
}) {
  const colClass =
    columns === 3
      ? "sm:grid-cols-3"
      : columns === 1
        ? "grid-cols-1"
        : "sm:grid-cols-2";
  return (
    <div className={`grid gap-2 ${colClass}`}>
      {options.map((item) => {
        const checked = checkedFn(item);
        return (
          <label
            key={item}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
              checked
                ? "border-primary bg-primary/5 dark:border-primary/50 dark:bg-primary/10"
                : "border-stroke hover:bg-gray-1 dark:border-dark-3 dark:hover:bg-dark-3"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggleFn(item)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span className="text-sm leading-snug text-dark dark:text-white">
              {item}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function RadioTileGroup({
  name,
  value,
  onChange,
  options,
  columns = 2,
}: {
  name: string;
  value: string;
  onChange: (val: string) => void;
  options: readonly string[] | string[];
  columns?: 1 | 2 | 3;
}) {
  const colClass =
    columns === 3
      ? "sm:grid-cols-3"
      : columns === 1
        ? "grid-cols-1"
        : "sm:grid-cols-2";
  return (
    <div className={`grid gap-2 ${colClass}`}>
      {options.map((opt) => {
        const checked = value === opt;
        return (
          <label
            key={opt}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
              checked
                ? "border-primary bg-primary/5 dark:border-primary/50 dark:bg-primary/10"
                : "border-stroke hover:bg-gray-1 dark:border-dark-3 dark:hover:bg-dark-3"
            }`}
          >
            <input
              type="radio"
              name={name}
              checked={checked}
              onChange={() => onChange(opt)}
              className="h-4 w-4 shrink-0 accent-primary"
            />
            <span className="text-sm font-medium text-dark dark:text-white">
              {opt}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/** Single-select dropdown helper for short option lists like "Yes/No". */
export function SimpleSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  className = "",
}: {
  value: string;
  onChange: (val: string) => void;
  options: readonly string[] | string[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <BaseSelect
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </BaseSelect>
  );
}

/* ============================================================
   Conditional Callout (for "If yes, ...")
   ============================================================ */

export function ConditionalCallout({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-l-4 border-stroke border-l-primary/60 bg-primary/[0.03] p-4 dark:border-dark-3 dark:bg-primary/[0.06] ${className}`}
    >
      {children}
    </div>
  );
}

/* ============================================================
   Notes
   ============================================================ */

export function InfoNote({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`flex items-start gap-2 rounded-lg border border-stroke bg-gray-1 px-3 py-2 text-xs text-body dark:border-dark-3 dark:bg-dark-3 dark:text-dark-6 ${className}`}
    >
      <svg
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{children}</span>
    </p>
  );
}

export function WarnNote({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-100 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-200 ${className}`}
    >
      <svg
        className="mt-0.5 h-3.5 w-3.5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span>{children}</span>
    </p>
  );
}

export function RequiredFieldsBanner({
  variant = "all-required",
  className = "",
}: {
  variant?: "all-required" | "marked-required";
  className?: string;
}) {
  return (
    <p
      className={`mb-3 inline-flex w-fit items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 ${className}`}
    >
      <span
        aria-hidden="true"
        className="mr-1 inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-xs font-extrabold leading-none text-red-700 dark:bg-red-900/40 dark:text-red-300"
      >
        *
      </span>
      {variant === "marked-required"
        ? "Fields marked with * are required."
        : "All fields in this step are required"}
    </p>
  );
}

/* ============================================================
   Attachment Card
   ============================================================ */

export function AttachmentCard({
  label,
  isMandatory = false,
  optionalText = "(optional)",
  isChecked,
  onToggle,
  fileName,
  onUpload,
}: {
  label: string;
  isMandatory?: boolean;
  optionalText?: string;
  isChecked: boolean;
  onToggle: () => void;
  fileName?: string;
  onUpload: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        isChecked
          ? "border-primary bg-primary/5 dark:border-primary/50 dark:bg-primary/10"
          : "border-stroke bg-white dark:border-dark-3 dark:bg-dark-2"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex flex-1 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={onToggle}
            className="mt-1 h-4 w-4 shrink-0 accent-primary"
          />
          <span className="text-sm leading-snug text-dark dark:text-white">
            {label}
            {isMandatory ? (
              <RequiredMark />
            ) : (
              <span className="ml-1.5 text-xs font-normal text-body dark:text-dark-6">
                {optionalText}
              </span>
            )}
          </span>
        </label>

        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Upload document
          </span>
          <input type="file" className="hidden" onChange={onUpload} />
        </label>
      </div>

      {fileName && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-1 px-3 py-2 dark:bg-dark-3">
          <svg
            className="h-4 w-4 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span className="text-xs font-medium text-dark dark:text-white">
            {fileName}
          </span>
        </div>
      )}
    </div>
  );
}

/** Compact upload row for "Additional Documents" lists. */
export function ExtraUploadCard({
  index,
  fileName,
  onUpload,
}: {
  index: number;
  fileName?: string;
  onUpload: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="rounded-xl border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-dark dark:text-white">
          Document #{index + 1}
        </span>
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Upload document
          </span>
          <input type="file" className="hidden" onChange={onUpload} />
        </label>
      </div>
      {fileName && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-1 px-3 py-2 dark:bg-dark-3">
          <svg
            className="h-4 w-4 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span className="text-xs font-medium text-dark dark:text-white">
            {fileName}
          </span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Declaration Checkbox card
   ============================================================ */

export function DeclarationCheckbox({
  label = "Declaration and submission",
  checked,
  onChange,
  children,
}: {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-5 dark:border-primary/40 dark:bg-primary/[0.05]">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
          Final Step
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-body dark:text-dark-6">
          Certification
        </span>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-stroke bg-white p-4 transition-colors hover:border-primary/50 dark:border-dark-3 dark:bg-dark-2">
        <input
          type="checkbox"
          {...requiredMarkField(label)}
          className="mt-1 h-5 w-5 shrink-0 accent-primary"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="text-sm leading-relaxed text-dark dark:text-white">
          {children}
        </span>
      </label>
    </div>
  );
}
