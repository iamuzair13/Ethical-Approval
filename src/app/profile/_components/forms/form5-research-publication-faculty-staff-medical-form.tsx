"use client";

import type { CommonFormProps } from "./form-stepper-types";
import { Required } from "./required";
import {
  AttachmentCard,
  BaseInput,
  BaseSelect,
  BaseTextarea,
  DeclarationCheckbox,
  FieldGroup,
  FieldRow,
  FormSection,
  ReadOnlyInput,
  RequiredMark,
  StepHeader,
} from "./form-ui";

const REQUIRED_ATTACHMENTS = [
  "Questionnaire/Interview Guide",
  "Participant Consent Form",
  "Other Institutional Approval Letter(s) (If applicable)",
];

function buildMedicalEthicsDeclarationParagraph(declarationName: string): string {
  return `I ${declarationName} hereby certify that: I have read and understood the ethical guidelines for medical and health sciences research. The information provided in this application is accurate and complete to the best of my knowledge. I will conduct this research strictly according to the approved protocol. I will report all adverse events and protocol deviations to my supervisor and the IREB immediately. I will obtain updated approvals if any significant changes to the protocol are necessary. I will not proceed with data collection without formal ethical approval.`;
}

export function Form5ResearchPublicationFacultyStaffForm({
  currentStep,
  form,
  onFieldChange,
  setForm,
  hasCsvOption,
  toggleCsvOption,
  attachmentFiles,
  handleRequiredAttachmentUpload,
}: CommonFormProps) {
  if (currentStep === 0) {
    return (
      <section className="flex flex-col gap-6">
        <StepHeader index={1} title="Scholar's Information" required />

        <FormSection title="1.1 Scholar Profile">
          <FieldRow>
            <ReadOnlyInput value={form.scholarName} placeholder="Scholar's Name" />
            <ReadOnlyInput value={form.scholarSapId} placeholder="SAP ID / Reg. No" />
            <ReadOnlyInput value={form.scholarEmail} placeholder="Email" />
          </FieldRow>
        </FormSection>

        <FormSection title="1.2 Research Details">
          <FieldRow>
            <Required label="Research Title *" className="md:col-span-2">
              <BaseInput
                value={form.publicationTitle}
                onChange={onFieldChange("publicationTitle")}
                placeholder="Research Title"
              />
            </Required>
            <Required label="Study Design and Methodology *" className="md:col-span-2">
              <BaseTextarea
                value={form.publicationMethodology}
                onChange={onFieldChange("publicationMethodology")}
                rows={3}
                placeholder="Study Design and Methodology"
              />
            </Required>
          </FieldRow>
        </FormSection>
      </section>
    );
  }

  if (currentStep === 1) {
    return (
      <section className="flex flex-col gap-6">
        <StepHeader index={2} title="Ethical Considerations" required />

        <FormSection>
          <FieldRow>
            <Required label="Human subjects involved? *">
              <BaseSelect
                value={form.publicationHumanSubjects}
                onChange={onFieldChange("publicationHumanSubjects")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>
            <Required label="Informed consent from participants/patients? *">
              <BaseSelect
                value={form.publicationInformedConsent}
                onChange={onFieldChange("publicationInformedConsent")}
              >
                <option value="">Select</option>
                <option>Written informed consent</option>
                <option>Oral informed consent</option>
                <option>Waived consent</option>
                <option>Not applicable</option>
              </BaseSelect>
            </Required>
          </FieldRow>
        </FormSection>
      </section>
    );
  }

  if (currentStep === 2) {
    return (
      <section className="flex flex-col gap-6">
        <StepHeader index={3} title="Data Integrity and Permissions" required />

        <FormSection>
          <Required label="Data accurate? *">
            <BaseSelect
              value={form.publicationDataAccurate}
              onChange={onFieldChange("publicationDataAccurate")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
              <option>Partial disclosure</option>
            </BaseSelect>
          </Required>
        </FormSection>
      </section>
    );
  }

  if (currentStep === 3) {
    return (
      <section className="flex flex-col gap-6">
        <StepHeader
          index={4}
          title="Institutional Approvals & Collaboration"
          required
        />

        <FormSection>
          <FieldRow>
            <Required label="Has your research received institutional funding? *">
              <BaseSelect
                value={form.institutionalFunding}
                onChange={onFieldChange("institutionalFunding")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>
            <Required label="Has your research received external funding? *">
              <BaseSelect
                value={form.externalFunding}
                onChange={onFieldChange("externalFunding")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>
          </FieldRow>

          {form.externalFunding === "Yes" && (
            <FieldGroup
              label="Specify external funding source *"
              className="mt-4"
            >
              <BaseInput
                value={form.externalFundingSource}
                onChange={onFieldChange("externalFundingSource")}
                placeholder="Name of funding agency, grant, sponsor, etc."
              />
            </FieldGroup>
          )}
        </FormSection>
      </section>
    );
  }

  if (currentStep === 4) {
    return (
      <section className="flex flex-col gap-6">
        <StepHeader index={5} title="Required Attachments" required />

        <div className="flex flex-col gap-3">
          {REQUIRED_ATTACHMENTS.map((item) => (
            <AttachmentCard
              key={item}
              label={item}
              isMandatory={
                item === "Questionnaire/Interview Guide" || item === "Participant Consent Form"
              }
              isChecked={hasCsvOption("requiredAttachments", item)}
              onToggle={() => toggleCsvOption("requiredAttachments", item)}
              fileName={attachmentFiles[item]}
              onUpload={handleRequiredAttachmentUpload(item)}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <StepHeader index={6} title="Declaration and Submission" required />

      <DeclarationCheckbox
        checked={form.form3DeclarationAccepted === "yes"}
        onChange={(checked) => {
          setForm((prev) => {
            const declarationName =
              prev.scholarName.trim() || prev.applicantName.trim() || "_____________________";
            return {
              ...prev,
              form3DeclarationAccepted: checked ? "yes" : "",
              declaration: checked
                ? buildMedicalEthicsDeclarationParagraph(declarationName)
                : "",
            };
          });
        }}
      >
        I{" "}
        <span className="font-semibold">
          {form.scholarName.trim() ||
            form.applicantName.trim() ||
            "_____________________"}
        </span>{" "}
        hereby certify that: I have read and understood the ethical guidelines for
        medical and health sciences research. The information provided in this
        application is accurate and complete to the best of my knowledge. I will
        conduct this research strictly according to the approved protocol. I will
        report all adverse events and protocol deviations to my supervisor and the
        IREB immediately. I will obtain updated approvals if any significant
        changes to the protocol are necessary. I will not proceed with data
        collection without formal ethical approval.
        <RequiredMark />
      </DeclarationCheckbox>
    </section>
  );
}
