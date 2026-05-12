"use client";

import { useEffect, useState } from "react";
import type { CommonFormProps, FormState } from "./form-stepper-types";
import {
  ignoreRequiredValidationProps,
} from "./form-validation-mark";
import { Required } from "./required";
import {
  AttachmentCard,
  BaseInput,
  BaseSelect,
  BaseTextarea,
  CheckboxGroup,
  DeclarationCheckbox,
  FieldGroup,
  FieldRow,
  FormSection,
  ReadOnlyInput,
  RequiredMark,
  SectionTitle,
  SimpleSelect,
  StepHeader,
} from "./form-ui";

/* ============================================
   CONSTANTS
   ============================================ */
const FORM_2_REQUIRED_ATTACHMENTS = [
  "Questionnaire/Interview Guide",
  "Participant Consent Form (Qualitative and mix-methods research with selective participations)",
  "Other Instituittional Approval Letter(s) (if applicable)",
];

const FORM_2_MANDATORY_ATTACHMENTS = [
  FORM_2_REQUIRED_ATTACHMENTS[0],
  FORM_2_REQUIRED_ATTACHMENTS[2],
] as const;

const SDG_OPTIONS = [
  "No Poverty",
  "Zero Hunger",
  "Good Health and Well-Being",
  "Quality Education",
  "Gender Equality",
  "Clean Water and Sanitation",
  "Affordable and Clean Energy",
  "Decent Work and Economic Growth",
  "Industry, Innovation, and Infrastructure",
  "Reduced Inequalities",
  "Sustainable Cities and Communities",
  "Responsible Consumption and Production",
  "Climate Action",
  "Life Below Water",
  "Life on Land",
  "Peace, Justice and Strong Institutions",
  "Partnership for the Goals",
] as const;

const RESEARCH_POPULATION_OPTIONS = [
  "University students",
  "Faculty members",
  "Librarians",
  "Patients/healthcare workers",
  "Children/minors",
  "General adults",
  "Employees/staff members",
  "Other (specify in methodology)",
] as const;

const RECRUITMENT_CHANNELS = [
  "Emails",
  "Google Forms/ Online Surveys",
  "Social Media (Facebook, Instagram, etc.)",
  "LinkedIn (professional networking platforms)",
  "Institutional Mailing Lists",
  "Online forms",
  "Academic Networks",
  "In-person",
  "Other",
] as const;

const CONFIDENTIALITY_OPTIONS = [
  "Anonymization/Pseudonymization",
  "Secure Storage (Electronic/Physical)",
  "Access Restrictions and Confidentiality Agreements",
  "No Disclosure of Identity",
  "Others",
] as const;

const PARTICIPANT_BANDS = [
  "1-20",
  "21-50",
  "51-100",
  "101-150",
  "151-200",
  "201-300",
  "301-400",
  "401-500",
  "501+",
] as const;

/* ============================================
   UTILITY
   ============================================ */
function hasTrimmedValue(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

/** True when any Co-Author field has meaningful data (e.g. resumed draft). */
function hasForm2CoAuthorEntry(form: FormState): boolean {
  return [
    form.coauthorSapId,
    form.coauthorName,
    form.coauthorEmail,
    form.coauthorFaculty,
    form.coauthorDepartment,
    form.publicationAuthor1UolSapId,
    form.publicationAuthor1UolName,
    form.publicationAuthor1UolEmail,
    form.publicationAuthor1UolFaculty,
    form.publicationAuthor1UolDepartment,
    form.publicationAuthor1ExternalName,
    form.publicationAuthor1ExternalEmail,
    form.publicationAuthor1ExternalUniversity,
    form.publicationAuthor1ExternalFaculty,
    form.publicationAuthor1ExternalDepartment,
  ].some(hasTrimmedValue);
}

function buildMedicalEthicsDeclarationParagraph(declarationName: string): string {
  return `I ${declarationName} hereby certify that: I have read and understood the ethical guidelines for medical and health sciences research. The information provided in this application is accurate and complete to the best of my knowledge. I will conduct this research strictly according to the approved protocol. I will report all adverse events and protocol deviations to my supervisor and the IREB immediately. I will obtain updated approvals if any significant changes to the protocol are necessary. I will not proceed with data collection without formal ethical approval.`;
}

/* ============================================
   MAIN COMPONENT
   ============================================ */
export function Form2ResearchPublicationForm({
  currentStep,
  form,
  onFieldChange,
  setForm,
  hasCsvOption,
  toggleCsvOption,
  attachmentFiles,
  handleRequiredAttachmentUpload,
  facultyOptions,
  getDepartmentsForFaculty,
}: CommonFormProps) {
  const onValueChange =
    (key: keyof typeof form) =>
    (val: string) =>
      setForm((prev) => ({ ...prev, [key]: val }));

  const [coAuthorSectionOpen, setCoAuthorSectionOpen] = useState(false);

  useEffect(() => {
    if (hasForm2CoAuthorEntry(form)) {
      setCoAuthorSectionOpen(true);
    }
  }, [
    form.coauthorSapId,
    form.coauthorName,
    form.coauthorEmail,
    form.coauthorFaculty,
    form.coauthorDepartment,
    form.publicationAuthor1UolSapId,
    form.publicationAuthor1UolName,
    form.publicationAuthor1UolEmail,
    form.publicationAuthor1UolFaculty,
    form.publicationAuthor1UolDepartment,
    form.publicationAuthor1ExternalName,
    form.publicationAuthor1ExternalEmail,
    form.publicationAuthor1ExternalUniversity,
    form.publicationAuthor1ExternalFaculty,
    form.publicationAuthor1ExternalDepartment,
  ]);

  const clearCoAuthorSection = () => {
    setCoAuthorSectionOpen(false);
    setForm((prev) => ({
      ...prev,
      coauthorSapId: "",
      coauthorName: "",
      coauthorEmail: "",
      coauthorFaculty: "",
      coauthorDepartment: "",
      publicationCoAuthor1Type: "",
      publicationAuthor1UolSapId: "",
      publicationAuthor1UolName: "",
      publicationAuthor1UolEmail: "",
      publicationAuthor1UolFaculty: "",
      publicationAuthor1UolDepartment: "",
      publicationAuthor1ExternalName: "",
      publicationAuthor1ExternalEmail: "",
      publicationAuthor1ExternalUniversity: "",
      publicationAuthor1ExternalFaculty: "",
      publicationAuthor1ExternalDepartment: "",
    }));
  };

  const [extraObjectivesCount, setExtraObjectivesCount] = useState(0);

  useEffect(() => {
    let derived = 0;
    if (hasTrimmedValue(form.publicationObjective3)) derived = Math.max(derived, 1);
    if (hasTrimmedValue(form.publicationObjective4)) derived = Math.max(derived, 2);
    if (derived > 0) {
      setExtraObjectivesCount((prev) => Math.max(prev, derived));
    }
  }, [form.publicationObjective3, form.publicationObjective4]);

  const addExtraObjective = () => {
    setExtraObjectivesCount((c) => Math.min(2, c + 1));
  };

  const removeExtraObjective = (which: 3 | 4) => {
    setForm((prev) => {
      if (which === 3) {
        return {
          ...prev,
          publicationObjective3: prev.publicationObjective4 ?? "",
          publicationObjective4: "",
        };
      }
      return { ...prev, publicationObjective4: "" };
    });
    setExtraObjectivesCount((c) => Math.max(0, c - 1));
  };

  /* ---------- STEP 0: Scholar Information ---------- */
  if (currentStep === 0) {
    return (
      <section className="flex flex-col gap-6">
        <StepHeader
          index={1}
          title="Scholar's Information"
          required
          subtitle="Provide your scholar profile, co-authors, and core research details."
        />

        {/* 1.1 Scholar's Info */}
        <FormSection title="1.1 Scholar's Information">
          <FieldRow>
            <ReadOnlyInput value={form.scholarName} placeholder="Scholar's Name" />
            <ReadOnlyInput value={form.scholarSapId} placeholder="SAP ID / Reg. No" />
            <ReadOnlyInput value={form.scholarEmail} placeholder="Email" />
            <ReadOnlyInput value={form.scholarFaculty} placeholder="Faculty" />
            <ReadOnlyInput value={form.scholarDepartment} placeholder="Department" />
            <ReadOnlyInput value={form.scholarProgram} placeholder="Program" />
          </FieldRow>
        </FormSection>

        {!coAuthorSectionOpen ? (
          <FormSection
            title="1.2 Co-Author"
            subtitle="Optional. Add a co-author if applicable."
            {...ignoreRequiredValidationProps()}
          >
            <button
              type="button"
              onClick={() => setCoAuthorSectionOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white dark:border-primary dark:text-primary"
            >
              Add Co-Author
            </button>
          </FormSection>
        ) : (
          <>
            <div className="-mb-2 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={clearCoAuthorSection}
                className="text-sm font-medium text-dark-5 underline decoration-dark-5/60 underline-offset-2 transition hover:text-dark dark:text-gray-400 dark:hover:text-white"
              >
                Remove co-author
              </button>
            </div>
      
        {/* 1.3 Add Co-Author */}
        <FormSection title="1.2 Add Co-Author" {...ignoreRequiredValidationProps()}>
          <BaseSelect
            value={form.publicationCoAuthor1Type}
            onChange={onFieldChange("publicationCoAuthor1Type")}
            className="mb-4 max-w-xs"
          >
            <option value="UOL">Option 1: UOL</option>
            <option value="External">Option 2: External</option>
          </BaseSelect>

          <FieldRow>
            {form.publicationCoAuthor1Type === "UOL" ? (
              <>
                <BaseInput
                  value={form.publicationAuthor1UolSapId}
                  onChange={onFieldChange("publicationAuthor1UolSapId")}
                  placeholder="SAP ID"
                />
                <BaseInput
                  value={form.publicationAuthor1UolName}
                  onChange={onFieldChange("publicationAuthor1UolName")}
                  placeholder=" Name"
                />
                <BaseInput
                  value={form.publicationAuthor1UolEmail}
                  onChange={onFieldChange("publicationAuthor1UolEmail")}
                  placeholder="Email"
                />
                <BaseSelect
                  value={form.publicationAuthor1UolFaculty}
                  onChange={onFieldChange("publicationAuthor1UolFaculty")}
                >
                  <option value="">Faculty</option>
                  {facultyOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </BaseSelect>
                <BaseSelect
                  value={form.publicationAuthor1UolDepartment}
                  onChange={onFieldChange("publicationAuthor1UolDepartment")}
                  disabled={!form.publicationAuthor1UolFaculty}
                >
                  <option value="">Department</option>
                  {getDepartmentsForFaculty(form.publicationAuthor1UolFaculty).map(
                    (item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ),
                  )}
                </BaseSelect>
              </>
            ) : (
              <>
                <BaseInput
                  value={form.publicationAuthor1ExternalName}
                  onChange={onFieldChange("publicationAuthor1ExternalName")}
                  placeholder="Name"
                />
                <BaseInput
                  value={form.publicationAuthor1ExternalEmail}
                  onChange={onFieldChange("publicationAuthor1ExternalEmail")}
                  placeholder="Email"
                />
                <BaseInput
                  value={form.publicationAuthor1ExternalUniversity}
                  onChange={onFieldChange("publicationAuthor1ExternalUniversity")}
                  placeholder="University Name"
                />
                
              </>
            )}
          </FieldRow>
        </FormSection>
          </>
        )}

        {/* 1.4 Research Details */}
        <FormSection>
          <SectionTitle className="mb-4 md:col-span-2">
            1.3 Research Details <RequiredMark />
          </SectionTitle>

          <FieldRow>
            <FieldGroup label="Research Title" required fullWidth>
              <Required label="Research Title *">
                <BaseInput
                  value={form.publicationTitle}
                  onChange={onFieldChange("publicationTitle")}
                  placeholder="Research Title"
                />
              </Required>
            </FieldGroup>

            
              <Required label="Research Objective 1 *">
                <BaseTextarea
                  value={form.publicationObjective1}
                  onChange={onFieldChange("publicationObjective1")}
                  rows={2}
                  placeholder="Describe"
                />
              </Required>
            

            
              <Required label="Research Objective 2 *">
                <BaseTextarea
                  value={form.publicationObjective2}
                  onChange={onFieldChange("publicationObjective2")}
                  rows={2}
                  placeholder="Describe"
                />
              </Required>

            {extraObjectivesCount >= 1 && (
              <FieldGroup label="Research Objective 3" fullWidth>
                <BaseTextarea
                  value={form.publicationObjective3}
                  onChange={onFieldChange("publicationObjective3")}
                  rows={2}
                  placeholder="Describe (optional)"
                />
                <div className="mt-1.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeExtraObjective(3)}
                    className="text-xs font-medium text-dark-5 underline decoration-dark-5/60 underline-offset-2 transition hover:text-dark dark:text-gray-400 dark:hover:text-white"
                  >
                    Remove Objective 3
                  </button>
                </div>
              </FieldGroup>
            )}

            {extraObjectivesCount >= 2 && (
              <FieldGroup label="Research Objective 4" fullWidth>
                <BaseTextarea
                  value={form.publicationObjective4}
                  onChange={onFieldChange("publicationObjective4")}
                  rows={2}
                  placeholder="Describe (optional)"
                />
                <div className="mt-1.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeExtraObjective(4)}
                    className="text-xs font-medium text-dark-5 underline decoration-dark-5/60 underline-offset-2 transition hover:text-dark dark:text-gray-400 dark:hover:text-white"
                  >
                    Remove Objective 4
                  </button>
                </div>
              </FieldGroup>
            )}

            {extraObjectivesCount < 2 && (
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={addExtraObjective}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white dark:border-primary dark:text-primary"
                >
                  + Add Research Objective
                </button>
              </div>
            )}

            <FieldGroup
              label="Please select relevant Sustainable Development Goals (multiple select)"
              required
              fullWidth
            >
              <Required
                label="Please select relevant Sustainable Development Goals (multiple select) *"
                kind="selection"
              >
                <CheckboxGroup
                  options={SDG_OPTIONS}
                  checkedFn={(item) => hasCsvOption("sdgs", item)}
                  toggleFn={(item) => toggleCsvOption("sdgs", item)}
                  columns={2}
                />
              </Required>
            </FieldGroup>

            <FieldGroup
              label="Research Methodology (Methods and Materials)"
              required
              fullWidth
            >
              <Required label="Research Methodology (Methods and Materials) *">
                <BaseTextarea
                  value={form.publicationMethodology}
                  onChange={onFieldChange("publicationMethodology")}
                  rows={4}
                />
              </Required>
            </FieldGroup>

            
              <Required label="How many participants will you be recruiting? (estimated number) *">
                <BaseSelect
                  value={form.publicationParticipantsEstimate}
                  onChange={onFieldChange("publicationParticipantsEstimate")}
                >
                  <option value="">Select</option>
                  {PARTICIPANT_BANDS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </BaseSelect>
              </Required>
           

            
              <Required
                label="Select Research Population (You may select multiple)*"
                kind="selection"
              >
                <div className="flex w-full">
                <CheckboxGroup
                  options={RESEARCH_POPULATION_OPTIONS}
                  checkedFn={(item) => hasCsvOption("publicationPopulationType", item)}
                  toggleFn={(item) =>
                    toggleCsvOption("publicationPopulationType", item)
                  }
                  columns={2}
                />
                </div>
              </Required>

          </FieldRow>
        </FormSection>
      </section>
    );
  }

  /* ---------- STEP 1: Ethical Considerations ---------- */
  if (currentStep === 1) {
    return (
      <section className="flex flex-col gap-6">
        <StepHeader
          index={2}
          title="Ethical Considerations"
          required
          subtitle="Tell us about participants, consent, and confidentiality safeguards."
        />

        <FormSection title="2.1 Human Participants">
          <FieldRow>
            <FieldGroup label="2.1 Does your research involve human participants or human subjects?">
              <Required label="Does your research involve human participants or human subjects? *">
                <SimpleSelect
                  value={form.publicationHumanSubjects}
                  onChange={onValueChange("publicationHumanSubjects")}
                  options={["Yes", "No"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>
          </FieldRow>
        </FormSection>

        <FormSection title="2.2 Recruitment Channels">
          <FieldGroup
            label="2.2 Recruitment channels (multi-select)"
            required
            fullWidth
          >
            <Required label="You may select multiple *">
              <CheckboxGroup
                options={RECRUITMENT_CHANNELS}
                checkedFn={(item) => hasCsvOption("publicationRecruitmentChannels", item)}
                toggleFn={(item) =>
                  toggleCsvOption("publicationRecruitmentChannels", item)
                }
                columns={2}
              />
            </Required>
          </FieldGroup>
        </FormSection>

        <FormSection title="Consent, Compensation & Confidentiality">
          <FieldRow>
            <FieldGroup label="2.3 Informed consent">
              <Required label="2.3 Informed consent">
                <SimpleSelect
                  value={form.publicationInformedConsent}
                  onChange={onValueChange("publicationInformedConsent")}
                  options={["Written Consent", "Oral Consent", "Waived", "N/A"]}
                  placeholder="Select consent type"
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="2.4 Data collected prior to ethical approval?">
              <Required label="2.4 Have any research data been collected prior to receiving ethical approval?">
                <SimpleSelect
                  value={form.preApprovalDataCollected}
                  onChange={onValueChange("preApprovalDataCollected")}
                  options={["Yes", "No"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="2.5 Can participants withdraw at any time?">
              <Required label="2.5 Can participants withdraw from the study at any time?">
                <SimpleSelect
                  value={form.canWithdraw}
                  onChange={onValueChange("canWithdraw")}
                  options={["Yes", "No"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="2.6 Receive compensation?">
              <Required label="2.6 Receive compensation?">
                <SimpleSelect
                  value={form.compensation}
                  onChange={onValueChange("compensation")}
                  options={["Yes", "No"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="2.7 Confidentiality options (multi-select)" fullWidth>
              <Required label="2.7 Confidentiality options (multi-select)">
                <CheckboxGroup
                  options={CONFIDENTIALITY_OPTIONS}
                  checkedFn={(item) => hasCsvOption("confidentialityOptions", item)}
                  toggleFn={(item) => toggleCsvOption("confidentialityOptions", item)}
                  columns={2}
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="2.8 Vulnerable populations?" fullWidth>
              <Required label="2.8 Does your research involve any vulnerable populations?">
                <SimpleSelect
                  value={form.vulnerablePopulation}
                  onChange={onValueChange("vulnerablePopulation")}
                  options={["Yes", "No", "N/A"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>
          </FieldRow>
        </FormSection>
      </section>
    );
  }

  /* ---------- STEP 2: Institutional Approvals ---------- */
  if (currentStep === 2) {
    return (
      <section className="flex flex-col gap-6">
        <StepHeader
          index={3}
          title="Institutional Approvals & Collaboration"
          required
        />

        <FormSection title="Funding & Collaboration">
          <FieldRow>
            <FieldGroup label="3.1 Has your research received institutional funding?">
              <Required label="3.1 Has your research received institutional funding?">
                <SimpleSelect
                  value={form.institutionalFunding}
                  onChange={onValueChange("institutionalFunding")}
                  options={["Yes", "No"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>

           

            <FieldGroup label="3.2 International collaboration?">
              <Required label="3.2 Does your research involve an international collaboration?">
                <SimpleSelect
                  value={form.internationalCollaboration}
                  onChange={onValueChange("internationalCollaboration")}
                  options={["Yes", "No"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="3.3 Will any part of data be collected from overseas/abroad?">
              <Required label="3.3 Will any part of data be collected from overseas/abroad?">
                <SimpleSelect
                  value={form.conductedAbroad}
                  onChange={onValueChange("conductedAbroad")}
                  options={["Yes", "No"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>
          </FieldRow>
        </FormSection>
      </section>
    );
  }

  /* ---------- STEP 3: Required Attachments ---------- */
  if (currentStep === 3) {
    return (
      <section className="flex flex-col gap-6">
        <StepHeader
          index={4}
          title="Required Attachments"
          required
          subtitle="Tick the documents that apply to your study and upload each file."
        />

        <div className="flex flex-col gap-3">
          {FORM_2_REQUIRED_ATTACHMENTS.map((item) => {
            const isMandatory = (FORM_2_MANDATORY_ATTACHMENTS as readonly string[]).includes(
              item,
            );
            return (
              <AttachmentCard
                key={item}
                label={item}
                isMandatory={isMandatory}
                isChecked={hasCsvOption("requiredAttachments", item)}
                onToggle={() => toggleCsvOption("requiredAttachments", item)}
                fileName={attachmentFiles[item]}
                onUpload={handleRequiredAttachmentUpload(item)}
              />
            );
          })}
        </div>
      </section>
    );
  }

  /* ---------- STEP 4: Declaration and Submission ---------- */
  return (
    <section className="flex flex-col gap-6">
      <StepHeader index={5} title="Declaration and Submission" required />

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
