import type { ApprovalFormId } from "./form-registry";

/** Mirrors stepper “Required attachments” lists per form id. */
export const ATTACHMENT_LIST_BY_FORM_ID: Record<ApprovalFormId, readonly string[]> = {
  "form1-thesis-non-medical": [
    "Complete Research Proposal/Protocol",
    "Research Questionnaire/Interview Guide (i.e., focus group guide)",
    "Participant Consent Form ",
    "Approval from Board of Study (BOS) and Board of Faculty (BOF)",
    "Other Institutional Approval Letter(s) (If applicable)",
  ],
  "form3-thesis-medical": [
    "Complete Research Proposal/Protocol",
    "Research Questionnaire/Interview Guide (i.e., focus group guide)",
    "Participant Consent Form",
    "Approval from Board of Study (BOS) and Board of Faculty (BOF)",
    "Other Institutional Approval Letter(s) (If applicable)",
  ],
  "form2-publication-non-medical": [
    "Questionnaire/Interview Guide",
    "Participant Consent Form",
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
  const template = formId ? ATTACHMENT_LIST_BY_FORM_ID[formId] : undefined;
  const base = Array.isArray(template) ? [...template] : [];
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
