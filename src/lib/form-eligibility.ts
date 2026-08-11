/**
 * Server-side form eligibility validation.
 *
 * Ensures that the form selected by an applicant is actually available to them
 * based on their applicant role. This is the server-side source of truth — the
 * frontend filtering in FACULTY_FORM_CATALOG is for UX only and must not be
 * relied upon for authorization.
 */

import {
  FACULTY_FORM_CATALOG,
  ADMIN_ETHICS_FORM_CATALOG,
  inferFormIdFromLegacyRequiredForm,
  type ApprovalFormId,
  type RequiredForm,
} from "@/app/profile/_components/forms/form-registry";

/**
 * Set of form IDs available to faculty members.
 * Currently: Form 6 (Non-Medical) and Form 7 (Medical).
 */
export const FACULTY_ALLOWED_FORM_IDS: ReadonlySet<ApprovalFormId> = new Set(
  FACULTY_FORM_CATALOG.map((entry: { id: ApprovalFormId }) => entry.id),
);

/**
 * Set of form IDs available to students.
 * Currently: Form 1, 2, 3, 4 (thesis and publication, medical and non-medical).
 * Derived from ADMIN_ETHICS_FORM_CATALOG minus faculty-only forms.
 */
const FACULTY_ONLY_FORM_IDS: ReadonlySet<ApprovalFormId> = new Set(
  FACULTY_FORM_CATALOG.map((entry: { id: ApprovalFormId }) => entry.id),
);

export const STUDENT_ALLOWED_FORM_IDS: ReadonlySet<ApprovalFormId> = new Set(
  ADMIN_ETHICS_FORM_CATALOG
    .map((entry: { id: ApprovalFormId }) => entry.id)
    .filter((id: ApprovalFormId) => !FACULTY_ONLY_FORM_IDS.has(id)),
);

/**
 * Resolves the form ID from an ethics payload's requiredForm field.
 *
 * The requiredForm may contain either a modern `id` field or a legacy `label`
 * that needs to be inferred. Returns null if no form ID can be determined.
 */
export function resolveFormIdFromEthics(
  ethics: Record<string, unknown> | undefined,
): ApprovalFormId | null {
  if (!ethics) return null;

  const reqFormRaw = ethics.requiredForm;
  if (!reqFormRaw || typeof reqFormRaw !== "object" || Array.isArray(reqFormRaw)) {
    return null;
  }

  const reqForm = reqFormRaw as Partial<RequiredForm> & { id?: string };

  // Direct ID match
  if (reqForm.id && typeof reqForm.id === "string") {
    return reqForm.id as ApprovalFormId;
  }

  // Fallback: infer from legacy label + applicationType
  return inferFormIdFromLegacyRequiredForm(
    reqForm as Pick<RequiredForm, "label" | "applicationType"> | null | undefined,
  );
}

/**
 * Validates that the form contained in the ethics payload is available to the
 * authenticated user based on their applicant role.
 *
 * @param ethics - The ethics JSON payload from the submission request
 * @param applicantRole - The authenticated user's applicant role ("student" | "faculty")
 * @returns true if the form is allowed (or if no form ID could be determined,
 *          which preserves backwards compatibility), false otherwise
 */
export function isFormAllowedForApplicant(
  ethics: Record<string, unknown> | undefined,
  applicantRole: "student" | "faculty" | null | undefined,
): boolean {
  const formId = resolveFormIdFromEthics(ethics);
  if (!formId) {
    // No form ID could be determined — allow through for backwards compatibility
    // with older submissions that may not have a structured requiredForm.
    return true;
  }

  if (applicantRole === "faculty") {
    return FACULTY_ALLOWED_FORM_IDS.has(formId);
  }

  if (applicantRole === "student") {
    return STUDENT_ALLOWED_FORM_IDS.has(formId);
  }

  // Unknown role — deny
  return false;
}
