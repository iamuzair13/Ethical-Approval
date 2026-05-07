import type { ReactNode } from "react";

type RequiredKind = "field" | "selection" | "radio";

type RequiredProps = {
  /** Toast label shown when this wrapped field/group is missing. */
  label: string;
  children: ReactNode;
  className?: string;
  kind?: RequiredKind;
  minSelections?: number;
};

/**
 * Global required wrapper. Any field/group wrapped here is validated by
 * `validateRequiredMarkFields` on Next/Submit.
 */
export function Required({
  label,
  children,
  className,
  kind = "field",
  minSelections = 1,
}: RequiredProps) {
  const labelNode = (
    <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">{label}</label>
  );

  if (kind === "selection") {
    return (
      <div
        className={className}
        data-required-wrapper="true"
        data-required-kind="selection"
        data-required-label={label}
        data-required-min-selections={String(minSelections)}
      >
        {labelNode}
        {children}
      </div>
    );
  }

  if (kind === "radio") {
    return (
      <div
        className={className}
        data-required-wrapper="true"
        data-required-kind="radio"
        data-required-label={label}
      >
        {labelNode}
        {children}
      </div>
    );
  }

  return (
    <div className={className} data-required-wrapper="true" data-required-label={label}>
      {labelNode}
      {children}
    </div>
  );
}
