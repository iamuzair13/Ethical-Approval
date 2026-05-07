/** DOM markers used by approval stepper validation (pairs with `<RequiredMark />` in UI). */

export function requiredWrapperProps(label: string) {
  return {
    "data-required-wrapper": "true" as const,
    "data-required-label": label,
  };
}

export function requiredMarkField(label?: string) {
  return {
    "data-required-by-mark": "true" as const,
    ...(label ? { "data-required-label": label } : {}),
  };
}

export function requiredSelectionGroupProps(label: string, minSelections: number = 1) {
  return {
    "data-required-selection-group": "true" as const,
    "data-required-label": label,
    "data-required-selection-min": String(minSelections),
  };
}

export function requiredRadioGroupProps(label: string) {
  return {
    "data-required-radio-group": "true" as const,
    "data-required-label": label,
  };
}

/** Use on a subsection where the template requires every editable field except ignored regions */
export function allInlineRequiredProps() {
  return { "data-all-inline-required": "true" as const };
}

export function ignoreRequiredValidationProps() {
  return { "data-ignore-required-validation": "true" as const };
}
