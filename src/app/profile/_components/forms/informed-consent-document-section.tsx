"use client";

import { useEffect, useRef, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import type { FormState } from "./form-stepper-types";
import { Required } from "./required";
import {
  BaseInput,
  ConditionalCallout,
  FieldRow,
  FormSection,
  SubsectionTitle,
} from "./form-ui";

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

type InformedConsentDocumentSectionProps = {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  onFieldChange: (
    key: string,
  ) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  projectTitleDefault?: string;
  conductedByDefault?: string;
};

export function InformedConsentDocumentSection({
  form,
  setForm,
  onFieldChange,
  projectTitleDefault = "",
  conductedByDefault = "",
}: InformedConsentDocumentSectionProps) {
  const prefilledRef = useRef(false);

  useEffect(() => {
    if (prefilledRef.current) return;
    prefilledRef.current = true;
    const title = projectTitleDefault.trim();
    const conductedBy = conductedByDefault.trim();
    if (!title && !conductedBy) return;

    setForm((prev) => {
      const next = { ...prev };
      if (title && !prev.informedConsentProjectTitle.trim()) {
        next.informedConsentProjectTitle = title;
      }
      if (title && !prev.informedConsentProjectTitleUr.trim()) {
        next.informedConsentProjectTitleUr = title;
      }
      if (conductedBy && !prev.informedConsentConductedBy.trim()) {
        next.informedConsentConductedBy = conductedBy;
      }
      return next;
    });
  }, [projectTitleDefault, conductedByDefault, setForm]);

  return (
    <ConditionalCallout className="mt-4">
      <FormSection title="INFORMED CONSENT DOCUMENT">
        <p className="mb-4 text-sm leading-relaxed text-body dark:text-dark-6">
          Complete all fields below using the standard UOL informed consent template. Fixed
          paragraphs are shown for reference; enter values for each blank.
        </p>

        <SubsectionTitle className="mb-3">English</SubsectionTitle>
        <div className="mb-4 space-y-2 text-sm leading-relaxed text-body dark:text-dark-6">
          <p>
            I [name] S/O, D/O [parentage] hereby agree to participate in the project to be carried
            out, titled [project title]. Conducted by: [investigator].
          </p>
          <p>
            I have been provided with a detailed explanation about the nature of the project and the
            significance of my participation in it. I have also been explained that I have to
            provide all relevant information, to the best of my knowledge, to the investigator. I
            have been assured that no risks are involved in this research.
          </p>
          <p>
            I am willing to cooperate with the investigator in a respectful way in order to
            facilitate his/her work. I have also been informed that all the information I provided
            will be kept strictly confidential. Furthermore, I also understand that my participation
            is entirely voluntarily and that I have right to withdraw from the study at any time
            without providing any reasons.
          </p>
        </div>

        <FieldRow className="mb-4">
          <Required label="Participant name (I ______) *">
            <BaseInput
              value={form.informedConsentParticipantName}
              onChange={onFieldChange("informedConsentParticipantName")}
            />
          </Required>
          <Required label="S/O, D/O *">
            <BaseInput
              value={form.informedConsentParentage}
              onChange={onFieldChange("informedConsentParentage")}
            />
          </Required>
          <Required label="Project title *">
            <BaseInput
              value={form.informedConsentProjectTitle}
              onChange={onFieldChange("informedConsentProjectTitle")}
            />
          </Required>
          <Required label="Conducted by *">
            <BaseInput
              value={form.informedConsentConductedBy}
              onChange={onFieldChange("informedConsentConductedBy")}
            />
          </Required>
        </FieldRow>

        <FieldRow className="mb-6">
          <Required label="Signature *">
            <BaseInput
              value={form.informedConsentSignature}
              onChange={onFieldChange("informedConsentSignature")}
            />
          </Required>
          <Required label="CNIC No. *">
            <BaseInput
              value={form.informedConsentCnic}
              onChange={onFieldChange("informedConsentCnic")}
            />
          </Required>
          <Required label="Date *">
            <BaseInput
              type="date"
              value={form.informedConsentDate}
              onChange={onFieldChange("informedConsentDate")}
            />
          </Required>
        </FieldRow>

        <div dir="rtl">
        <SubsectionTitle className="mb-3">
          دستاویز (اردو میں رضامندی کا فارم)
        </SubsectionTitle>
        <div
          className="mb-4 space-y-2 text-sm leading-relaxed text-body dark:text-dark-6"
        >
          <p>
            میں [نام] S / O ، D / O [والد / ولدیت] — منصوبے کا عنوان [عنوان]. مجھے اس منصوبے کی
            نوعیت اور اس میں میری شرکت کی اہمیت کے بارے میں تفصیلی وضاحت فراہم کی گئی ہے۔
          </p>
          <p>
            مجھے یہ بھی سمجھایا گیا ہے کہ مجھے تمام متعلقہ معلومات فراہم کرنی ہیں۔ مجھے یقین دلایا
            گیا ہے کہ اس تحقیق میں کوئی خطرہ شامل نہیں ہے۔ میری شرکت مکمل طور پر رضاکارانہ ہے۔
          </p>
        </div>

        <FieldRow>
          <Required label="نام (مشارکت کنندہ) *">
            <BaseInput
              value={form.informedConsentParticipantNameUr}
              onChange={onFieldChange("informedConsentParticipantNameUr")}
            />
          </Required>
          <Required label="S/O, D/O *">
            <BaseInput
              value={form.informedConsentParentageUr}
              onChange={onFieldChange("informedConsentParentageUr")}
            />
          </Required>
          <Required label="منصوبے کا عنوان *">
            <BaseInput
              value={form.informedConsentProjectTitleUr}
              onChange={onFieldChange("informedConsentProjectTitleUr")}
            />
          </Required>
          <Required label="نام (دستخط والے) *">
            <BaseInput
              value={form.informedConsentNameUr}
              onChange={onFieldChange("informedConsentNameUr")}
            />
          </Required>
          <Required label="دستخط *">
            <BaseInput
              value={form.informedConsentSignatureUr}
              onChange={onFieldChange("informedConsentSignatureUr")}
            />
          </Required>
          <Required label="شناختی کارڈ نمبر *">
            <BaseInput
              value={form.informedConsentCnicUr}
              onChange={onFieldChange("informedConsentCnicUr")}
            />
          </Required>
          <Required label="تاریخ *">
            <BaseInput
              type="date"
              value={form.informedConsentDateUr}
              onChange={onFieldChange("informedConsentDateUr")}
            />
          </Required>
        </FieldRow>
        </div>
      </FormSection>
    </ConditionalCallout>
  );
}
