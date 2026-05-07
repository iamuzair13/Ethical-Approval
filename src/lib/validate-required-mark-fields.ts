/**
 * Validates only controls / groups flagged with project required-mark attributes.
 * Used for Next / Submit — never for Save Progress.
 */

export const REQUIRED_BY_MARK_SELECTOR = "[data-required-by-mark]";
export const REQUIRED_WRAPPER_SELECTOR = "[data-required-wrapper]";
export const REQUIRED_CONTROL_SELECTOR = `${REQUIRED_BY_MARK_SELECTOR}, ${REQUIRED_WRAPPER_SELECTOR} input, ${REQUIRED_WRAPPER_SELECTOR} textarea, ${REQUIRED_WRAPPER_SELECTOR} select`;
export const IGNORE_VALIDATION_SELECTOR = "[data-ignore-required-validation]";

/** Shared toast / message shortening for long labels */
export function shortenToastLabel(raw: string, max = 72) {
  const compact = raw.replace(/\s+/g, " ").trim();
  if (!compact) return "this field";
  return compact.length > max ? `${compact.slice(0, max - 1).trimEnd()}...` : compact;
}

function cssEscapeSel(id: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(id);
  }
  return id.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function shouldIgnoreSubtree(el: HTMLElement): boolean {
  return Boolean(el.closest(IGNORE_VALIDATION_SELECTOR));
}

function isShown(el: HTMLElement, formRoot: HTMLElement): boolean {
  if (!formRoot.contains(el)) return false;
  if (el.closest("[data-form-step-skip-validation='true']")) return false;

  try {
    if (typeof el.checkVisibility === "function") {
      return el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true });
    }
  } catch {
    /* ignore */
  }
  let walk: HTMLElement | null = el;
  while (walk && walk !== formRoot) {
    const style = window.getComputedStyle(walk);
    if (style.display === "none" || style.visibility === "hidden") return false;
    walk = walk.parentElement;
  }
  return true;
}

function hasTextValue(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): boolean {
  const v = control.value?.trim?.() ?? "";
  return v.length > 0;
}

function controlIsExcluded(control: HTMLElement): boolean {
  if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement)) return true;
  if (control.disabled) return true;
  if (control instanceof HTMLInputElement && control.readOnly) return true;
  if (control instanceof HTMLInputElement) {
    const t = control.type;
    if (
      t === "hidden" ||
      t === "button" ||
      t === "submit" ||
      t === "file" ||
      t === "image" ||
      t === "reset"
    )
      return true;
  }
  return false;
}

function labelFromControl(control: HTMLElement, formElement: HTMLFormElement): string {
  const explicit = control.getAttribute("data-required-label");
  if (explicit) return shortenToastLabel(explicit);

  const byFor =
    control.id &&
    formElement.querySelector<HTMLLabelElement>(`label[for="${cssEscapeSel(control.id)}"]`)?.textContent;
  const byForClean = shortenToastLabel((byFor ?? "").replace(/\*/g, "").trim());
  if (byForClean && byForClean !== "this field") return byForClean;

  const closestLabel = shortenToastLabel((control.closest("label")?.textContent ?? "").replace(/\*/g, "").trim());
  if (closestLabel && closestLabel !== "this field") return closestLabel;

  const ph =
    control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement
      ? (control.placeholder ?? "").replace(/\*/g, "").trim()
      : "";
  if (ph) return shortenToastLabel(ph);

  if (control instanceof HTMLSelectElement) {
    const first = control.options[0]?.textContent?.replace(/\*/g, "").trim() ?? "";
    if (first) return shortenToastLabel(first);
  }
  return "this field";
}

/**
 * Returns a user-facing error string or null when all flagged groups/controls pass.
 */
export function validateRequiredMarkFields(formElement: HTMLFormElement | null): string | null {
  if (!formElement) return null;

  const wrappers = Array.from(formElement.querySelectorAll<HTMLElement>(REQUIRED_WRAPPER_SELECTOR)).filter((el) =>
    isShown(el, formElement),
  );
  for (const wrapper of wrappers) {
    if (shouldIgnoreSubtree(wrapper)) continue;
    const wrapperLabel = shortenToastLabel(wrapper.getAttribute("data-required-label") ?? "") || "this field";
    const wrapperKind = wrapper.getAttribute("data-required-kind");
    const minRaw = Number.parseInt(wrapper.getAttribute("data-required-min-selections") ?? "1", 10);
    const minSelections = Number.isFinite(minRaw) && minRaw > 0 ? minRaw : 1;
    const controls = [
      ...wrapper.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select"),
    ].filter((control) => isShown(control, formElement) && !controlIsExcluded(control) && !shouldIgnoreSubtree(control));

    if (controls.length === 0) continue;

    const radios = controls.filter((control): control is HTMLInputElement => control instanceof HTMLInputElement && control.type === "radio");
    if (radios.length > 0 && !radios.some((radio) => radio.checked)) {
      return `Required field: ${wrapperLabel}.`;
    }

    const textLikeControls = controls.filter(
      (control) => !(control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")),
    );
    for (const control of textLikeControls) {
      if (!hasTextValue(control)) {
        return `Required field: ${wrapperLabel}.`;
      }
    }

    const checkboxes = controls.filter(
      (control): control is HTMLInputElement => control instanceof HTMLInputElement && control.type === "checkbox",
    );
    if (wrapperKind === "selection" && checkboxes.length > 0) {
      const checkedCount = checkboxes.filter((checkbox) => checkbox.checked).length;
      if (checkedCount < minSelections) {
        return `Required field: ${wrapperLabel}.`;
      }
      continue;
    }

    if (textLikeControls.length === 0 && checkboxes.length > 0 && !checkboxes.some((checkbox) => checkbox.checked)) {
      return `Required field: ${wrapperLabel}.`;
    }
  }

  const selectionGroups = Array.from(formElement.querySelectorAll<HTMLElement>("[data-required-selection-group]")).filter((el) =>
    isShown(el, formElement),
  );
  for (const group of selectionGroups) {
    const minRaw = Number.parseInt(group.getAttribute("data-required-selection-min") ?? "1", 10);
    const min = Number.isFinite(minRaw) && minRaw > 0 ? minRaw : 1;
    const checked = group.querySelectorAll<HTMLInputElement>(
      `input[type="checkbox"]:checked:not(:disabled)`,
    ).length;
    if (checked < min) {
      const label =
        shortenToastLabel(group.getAttribute("data-required-label") ?? "") || "selection";
      return `Required field: ${label}.`;
    }
  }

  const radioGroups = Array.from(formElement.querySelectorAll<HTMLElement>("[data-required-radio-group]")).filter((el) =>
    isShown(el, formElement),
  );
  for (const group of radioGroups) {
    const radios = [...group.querySelectorAll<HTMLInputElement>(`input[type="radio"]`)].filter(
      (r) => !r.disabled && isShown(r, formElement),
    );
    if (radios.length === 0) continue;
    if (!radios.some((r) => r.checked)) {
      const label =
        shortenToastLabel(group.getAttribute("data-required-label") ?? "") || "selection";
      return `Required field: ${label}.`;
    }
  }

  const marked = formElement.querySelectorAll<HTMLElement>(REQUIRED_BY_MARK_SELECTOR);
  for (const raw of [...marked]) {
    if (!(raw instanceof HTMLInputElement || raw instanceof HTMLTextAreaElement || raw instanceof HTMLSelectElement)) continue;
    if (controlIsExcluded(raw) || !isShown(raw as HTMLElement, formElement)) continue;

    if (raw instanceof HTMLInputElement && raw.type === "checkbox") {
      if (!raw.checked) return `Required field: ${labelFromControl(raw, formElement)}.`;
      continue;
    }
    if (raw instanceof HTMLInputElement && raw.type === "radio") {
      continue;
    }
    if (!hasTextValue(raw)) {
      return `Required field: ${labelFromControl(raw, formElement)}.`;
    }
  }

  /** “All fields required” callouts: every visible text-like control in scope (not under ignore). */
  const inlineScopes = Array.from(formElement.querySelectorAll<HTMLElement>("[data-all-inline-required]")).filter((el) =>
    isShown(el, formElement),
  );
  for (const scope of inlineScopes) {
    const controls = scope.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input, textarea, select",
    );
    for (const el of [...controls]) {
      if (shouldIgnoreSubtree(el)) continue;
      if (!isShown(el, formElement)) continue;
      if (controlIsExcluded(el)) continue;
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) continue;
      if (!hasTextValue(el)) {
        return `Required field: ${labelFromControl(el, formElement)}.`;
      }
    }
  }

  return null;
}
