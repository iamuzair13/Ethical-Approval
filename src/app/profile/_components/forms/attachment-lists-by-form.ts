import type { ApprovalFormId } from "./form-registry";
import { FORM_3_REQUIRED_ATTACHMENTS } from "./form3-thesis-medical-form";

/** Mirrors stepper “Required attachments” lists per form id. */
export const ATTACHMENT_LIST_BY_FORM_ID: Record<ApprovalFormId, readonly string[]> = {
  "form1-thesis-non-medical": [
    "Complete Research Proposal/Protocol",
    "Research Questionnaire/Interview Guide (i.e., focus group guide)",
    "Participant Consent Form (Qualitative and mix-methods research with selective participations)",
    "Approval from Board of Study (BOS) and Board of Faculty (BOF)",
    "Other Institutional Approval Letter(s) (If applicable)",
  ],
  "form3-thesis-medical": FORM_3_REQUIRED_ATTACHMENTS,
  "form2-publication-non-medical": [
    "Questionnaire/Interview Guide",
    "Participant Consent Form (Qualitative and mix-methods research with selective participations)",
    "Other Instituittional Approval Letter(s) (if applicable)",
  ],
  "form4-publication-medical": [
    "Questionnaire/Interview Guide",
    "Participant Consent Form",
    "Other Institutional Approval Letter(s) (If applicable)",
  ],
  "form5-publication-faculty-staff": [
    "Questionnaire/Interview Guide",
    "Participant Consent Form",
    "Other Institutional Approval Letter(s) (If applicable)",
  ],
  "form6-publication-faculty-non-medical": [
    "Questionnaire/Interview Guide",
    "Participant Consent Form",
    "Other Instituittional Approval Letter(s) (if applicable)",
  ],
  "form7-publication-faculty-staff-medical": [
    "Questionnaire/Interview Guide",
    "Participant Consent Form",
    "Other Institutional Approval Letter(s) (If applicable)",
  ],
};

/**
 * Ordered slot labels for the form, then any extra keys present in `attachmentFiles`
 * that are not in the template (legacy / typo keys).
 */
export function resolveAttachmentSlotLabels(
  formId: ApprovalFormId | null,
  attachmentFiles: Record<string, string>,
): string[] {
  const base = formId ? [...ATTACHMENT_LIST_BY_FORM_ID[formId]] : [];
  const seen = new Set(base);
  for (const key of Object.keys(attachmentFiles)) {
    if (!seen.has(key)) {
      base.push(key);
      seen.add(key);
    }
  }
  if (base.length > 0) return base;
  return Object.keys(attachmentFiles);
}
