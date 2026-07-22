"use client";

import { ConditionalCallout, FormSection } from "./form-ui";

export const INFORMED_CONSENT_FIELD_KEYS = [
  "informedConsentParticipantName",
  "informedConsentParentage",
  "informedConsentProjectTitle",
  "informedConsentConductedBy",
  "informedConsentSignature",
  "informedConsentCnic",
  "informedConsentDate",
  "informedConsentParticipantNameUr",
  "informedConsentParentageUr",
  "informedConsentProjectTitleUr",
  "informedConsentNameUr",
  "informedConsentSignatureUr",
  "informedConsentCnicUr",
  "informedConsentDateUr",
] as const;

export const EMPTY_INFORMED_CONSENT_FIELDS: Record<
  (typeof INFORMED_CONSENT_FIELD_KEYS)[number],
  string
> = {
  informedConsentParticipantName: "",
  informedConsentParentage: "",
  informedConsentProjectTitle: "",
  informedConsentConductedBy: "",
  informedConsentSignature: "",
  informedConsentCnic: "",
  informedConsentDate: "",
  informedConsentParticipantNameUr: "",
  informedConsentParentageUr: "",
  informedConsentProjectTitleUr: "",
  informedConsentNameUr: "",
  informedConsentSignatureUr: "",
  informedConsentCnicUr: "",
  informedConsentDateUr: "",
};

export function InformedConsentDocumentSection() {
  return (
    <ConditionalCallout className="mt-4">
      <FormSection
        title={
          <div className="flex items-center justify-between gap-3">
            <span>INFORMED CONSENT DOCUMENT</span>
            <a
              href="/Consent-Form-IREB.docx"
              download
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90"
            >
              <svg
                width={16}
                height={16}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path d="M10.461 13.755a.625.625 0 01-.922 0L6.205 10.11a.625.625 0 11.923-.843l2.247 2.457V2.5a.625.625 0 111.25 0v9.223l2.247-2.457a.625.625 0 01.923.843l-3.334 3.646z" />
                <path d="M3.125 12.5a.625.625 0 10-1.25 0v.046c0 1.14 0 2.058.097 2.78.101.75.317 1.382.818 1.884.502.501 1.133.717 1.884.818.722.097 1.64.097 2.78.097h5.092c1.14 0 2.058 0 2.78-.097.75-.101 1.382-.317 1.884-.818.501-.502.717-1.134.818-1.884.097-.722.097-1.64.097-2.78V12.5a.625.625 0 10-1.25 0c0 1.196-.001 2.03-.086 2.66-.082.611-.233.935-.463 1.166-.23.23-.555.38-1.166.463-.63.085-1.464.086-2.66.086h-5c-1.196 0-2.03-.001-2.66-.086-.611-.082-.935-.233-1.166-.463-.23-.23-.38-.555-.463-1.166-.085-.63-.086-1.464-.086-2.66z" />
              </svg>
              Download Consent Form
            </a>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-body dark:text-dark-6">
          Download the standard UOL informed consent form template above, complete it, and attach
          the filled document as part of your application submission.
        </p>
      </FormSection>
    </ConditionalCallout>
  );
}
