"use client";

import { useEffect, useState } from "react";
import type { CommonFormProps, FormState } from "./form-stepper-types";
import { ignoreRequiredValidationProps } from "./form-validation-mark";
import { Required } from "./required";
import { FieldGroup } from "./form-ui";
import {
  AttachmentCard,
  BaseInput,
  BaseSelect,
  BaseTextarea,
  CheckboxGroup,
  ConditionalCallout,
  DeclarationCheckbox,
  FieldRow,
  FormSection,
  ReadOnlyInput,
  StepHeader,
  WarnNote,
} from "./form-ui";

const FORM_6_REQUIRED_ATTACHMENTS = [
  "Questionnaire/Interview Guide",
  "Participant Consent Form",
  "Other Instituittional Approval Letter(s) (if applicable)",
] as const;

const FORM_6_MANDATORY_ATTACHMENTS = [
  FORM_6_REQUIRED_ATTACHMENTS[0],
  FORM_6_REQUIRED_ATTACHMENTS[2],
] as const;
const FORM_6_MANDATORY_ATTACHMENT_SET = new Set<string>(FORM_6_MANDATORY_ATTACHMENTS);

const SDGS = [
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

function buildForm6Declaration(name: string): string {
  return `I/We ${name} hereby certify that: this manuscript is original, not previously published. All research involving human subjects was conducted with appropriate ethical approval. All participant identities are adequately protected and anonymized where required. All funding sources and conflicts of interest have been disclosed. The manuscript adheres to ethical guidelines for responsible reporting and representation. All authors have consented to this submission and agree with the content.`;
}

function hasTrimmedValue(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

/** True when any co-author field has data (e.g. resumed draft). Types alone are ignored (defaults are UOL). */
function hasForm6CoAuthorEntry(form: FormState): boolean {
  return [
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
    form.publicationAuthor2UolSapId,
    form.publicationAuthor2UolName,
    form.publicationAuthor2UolEmail,
    form.publicationAuthor2UolFaculty,
    form.publicationAuthor2UolDepartment,
    form.publicationAuthor2ExternalName,
    form.publicationAuthor2ExternalEmail,
    form.publicationAuthor2ExternalUniversity,
    form.publicationAuthor2ExternalFaculty,
    form.publicationAuthor2ExternalDepartment,
    form.publicationAuthor3UolSapId,
    form.publicationAuthor3UolName,
    form.publicationAuthor3UolEmail,
    form.publicationAuthor3UolFaculty,
    form.publicationAuthor3UolDepartment,
    form.publicationAuthor3ExternalName,
    form.publicationAuthor3ExternalEmail,
    form.publicationAuthor3ExternalUniversity,
    form.publicationAuthor3ExternalFaculty,
    form.publicationAuthor3ExternalDepartment,
  ].some(hasTrimmedValue);
}

export function Form6ResearchPublicationFacultyNonMedicalForm({
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
  const [coAuthorSectionOpen, setCoAuthorSectionOpen] = useState(false);

  useEffect(() => {
    if (hasForm6CoAuthorEntry(form)) {
      setCoAuthorSectionOpen(true);
    }
  }, [
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
    form.publicationAuthor2UolSapId,
    form.publicationAuthor2UolName,
    form.publicationAuthor2UolEmail,
    form.publicationAuthor2UolFaculty,
    form.publicationAuthor2UolDepartment,
    form.publicationAuthor2ExternalName,
    form.publicationAuthor2ExternalEmail,
    form.publicationAuthor2ExternalUniversity,
    form.publicationAuthor2ExternalFaculty,
    form.publicationAuthor2ExternalDepartment,
    form.publicationAuthor3UolSapId,
    form.publicationAuthor3UolName,
    form.publicationAuthor3UolEmail,
    form.publicationAuthor3UolFaculty,
    form.publicationAuthor3UolDepartment,
    form.publicationAuthor3ExternalName,
    form.publicationAuthor3ExternalEmail,
    form.publicationAuthor3ExternalUniversity,
    form.publicationAuthor3ExternalFaculty,
    form.publicationAuthor3ExternalDepartment,
  ]);

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

  const clearCoAuthorSection = () => {
    setCoAuthorSectionOpen(false);
    setForm((prev) => ({
      ...prev,
      publicationCoAuthor1Type: "",
      publicationCoAuthor2Type: "",
      publicationCoAuthor3Type: "",
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
      publicationAuthor2UolSapId: "",
      publicationAuthor2UolName: "",
      publicationAuthor2UolEmail: "",
      publicationAuthor2UolFaculty: "",
      publicationAuthor2UolDepartment: "",
      publicationAuthor2ExternalName: "",
      publicationAuthor2ExternalEmail: "",
      publicationAuthor2ExternalUniversity: "",
      publicationAuthor2ExternalFaculty: "",
      publicationAuthor2ExternalDepartment: "",
      publicationAuthor3UolSapId: "",
      publicationAuthor3UolName: "",
      publicationAuthor3UolEmail: "",
      publicationAuthor3UolFaculty: "",
      publicationAuthor3UolDepartment: "",
      publicationAuthor3ExternalName: "",
      publicationAuthor3ExternalEmail: "",
      publicationAuthor3ExternalUniversity: "",
      publicationAuthor3ExternalFaculty: "",
      publicationAuthor3ExternalDepartment: "",
    }));
  };

  /* ---------- STEP 0: Scholar Information ---------- */
  if (currentStep === 0) {
    return (
      <section className="flex flex-col gap-6">
        <StepHeader index={1} title="Scholar's Information" />

        {/* 1.1 Scholar */}
        <FormSection title="1.1 Scholar's Information">
          <FieldRow>
            <ReadOnlyInput value={form.scholarName} placeholder="Scholar's Name (Auto fetch)" />
            <ReadOnlyInput value={form.scholarSapId} placeholder="SAP ID (Auto fetch)" />
            <ReadOnlyInput value={form.scholarEmail} placeholder="Email (Auto fetch)" />
            <ReadOnlyInput value={form.scholarFaculty} placeholder="Faculty (Auto fetch)" />
            <ReadOnlyInput value={form.scholarDepartment} placeholder="Department (Auto fetch)" />
            <ReadOnlyInput value={form.scholarProgram} placeholder="Program (Auto fetch)" />
          </FieldRow>
        </FormSection>

        {!coAuthorSectionOpen ? (
          <FormSection
            title="1.2 Co-Author"
            subtitle="Optional. Add co-authors if applicable."
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

        {/* 1.2 Co-Author 1 */}
        <FormSection
          title="1.2 Co-Authors' Information"
          subtitle="Provide co-author details (optional)."
        >
          <FieldGroup label="Please select:">
            <BaseSelect
              value={form.publicationCoAuthor1Type}
              onChange={onFieldChange("publicationCoAuthor1Type")}
              className="max-w-xs"
            >
              <option value="">Select</option>
              <option value="UOL">Option 1: UOL</option>
              <option value="External">Option 2: External</option>
            </BaseSelect>
          </FieldGroup>

          <FieldRow className="mt-4">
            {form.publicationCoAuthor1Type === "UOL" ? (
              <>
                <FieldGroup label="SAP ID">
                  <BaseInput
                    value={form.publicationAuthor1UolSapId}
                    onChange={onFieldChange("publicationAuthor1UolSapId")}
                    placeholder="SAP ID"
                  />
                </FieldGroup>
                <FieldGroup label="Name">
                  <BaseInput
                    value={form.publicationAuthor1UolName}
                    onChange={onFieldChange("publicationAuthor1UolName")}
                    placeholder="Name"
                  />
                </FieldGroup>
                <FieldGroup label="Email">
                  <BaseInput
                    value={form.publicationAuthor1UolEmail}
                    onChange={onFieldChange("publicationAuthor1UolEmail")}
                    placeholder="Email"
                  />
                </FieldGroup>
                <FieldGroup label="Faculty">
                  <BaseSelect
                    value={form.publicationAuthor1UolFaculty}
                    onChange={onFieldChange("publicationAuthor1UolFaculty")}
                  >
                    <option value="">Faculty (Dropdown window)</option>
                    {facultyOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </BaseSelect>
                </FieldGroup>
                <FieldGroup label="Department" className="md:col-span-2">
                  <BaseSelect
                    value={form.publicationAuthor1UolDepartment}
                    onChange={onFieldChange("publicationAuthor1UolDepartment")}
                    disabled={!form.publicationAuthor1UolFaculty}
                  >
                    <option value="">Department (Dropdown window)</option>
                    {getDepartmentsForFaculty(form.publicationAuthor1UolFaculty).map(
                      (item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ),
                    )}
                  </BaseSelect>
                </FieldGroup>
              </>
            ) : form.publicationCoAuthor1Type === "External" ? (
              <>
                <FieldGroup label="Name">
                  <BaseInput
                    value={form.publicationAuthor1ExternalName}
                    onChange={onFieldChange("publicationAuthor1ExternalName")}
                    placeholder="Name"
                  />
                </FieldGroup>
                <FieldGroup label="Email">
                  <BaseInput
                    value={form.publicationAuthor1ExternalEmail}
                    onChange={onFieldChange("publicationAuthor1ExternalEmail")}
                    placeholder="Email"
                  />
                </FieldGroup>
                <FieldGroup label="University">
                  <BaseInput
                    value={form.publicationAuthor1ExternalUniversity}
                    onChange={onFieldChange("publicationAuthor1ExternalUniversity")}
                    placeholder="University"
                  />
                </FieldGroup>
               
              </>
            ) : null}
          </FieldRow>
        </FormSection>

      
        
          </>
        )}

        {/* 1.3 Research Details */}
        <FormSection title="1.3 Research Details">
          <FieldRow>
            <Required label="Research Title *" className="md:col-span-2">
              <BaseInput
                value={form.publicationTitle}
                onChange={onFieldChange("publicationTitle")}
                placeholder="Enter Research Title"
              />
            </Required>
            <Required label="Research Objective 1 *" className="md:col-span-2">
              <BaseTextarea
                value={form.publicationObjective1}
                onChange={onFieldChange("publicationObjective1")}
                rows={2}
                placeholder="Enter Research Objective"
              />
            </Required>
            <Required label="Research Objective 2 *" className="md:col-span-2">
              <BaseTextarea
                value={form.publicationObjective2}
                onChange={onFieldChange("publicationObjective2")}
                rows={2}
                placeholder="Enter Research Objective"
              />
            </Required>
            {extraObjectivesCount >= 1 && (
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">
                  Research Objective 3
                </label>
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
              </div>
            )}

            {extraObjectivesCount >= 2 && (
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">
                  Research Objective 4
                </label>
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
              </div>
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

            <Required
              label="Please select relevant Sustainable Development Goals (You may select multiple) *"
              kind="selection"
              className="md:col-span-2"
            >
              <CheckboxGroup
                options={SDGS}
                checkedFn={(item) => hasCsvOption("sdgs", item)}
                toggleFn={(item) => toggleCsvOption("sdgs", item)}
                columns={2}
              />
            </Required>

            <Required label="Research Methodology (Methods and Materials) *" className="md:col-span-2">
              <BaseTextarea
                value={form.publicationMethodology}
                onChange={onFieldChange("publicationMethodology")}
                rows={4}
                placeholder="Describe"
              />
            </Required>

            <Required label="How many participants will you be recruiting? *" className="md:col-span-2">
              <BaseSelect
                value={form.publicationParticipantsEstimate}
                onChange={onFieldChange("publicationParticipantsEstimate")}
              >
                <option value="">
                  Select
                </option>
                {PARTICIPANT_BANDS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </BaseSelect>
            </Required>

            <Required
              label="f) Select Research Population *"
              kind="selection"
              className="md:col-span-2"
            >
              
              <CheckboxGroup
                options={RESEARCH_POPULATION_OPTIONS}
                checkedFn={(item) => hasCsvOption("publicationPopulationType", item)}
                toggleFn={(item) =>
                  toggleCsvOption("publicationPopulationType", item)
                }
                columns={2}
              />
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
        <StepHeader index={2} title="Ethical Considerations" />

        <FormSection title="Participants & Recruitment">
          <Required label="2.1 Does the article report findings from research involving human participants? *">
            <BaseSelect
              value={form.publicationHumanSubjects}
              onChange={onFieldChange("publicationHumanSubjects")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </BaseSelect>
          </Required>

          <Required
            label="2.2 How participants will be recruited? (Select) (Multiple Select)?"
            kind="selection"
            className="mt-4"
          >
            <CheckboxGroup
              options={RECRUITMENT_CHANNELS}
              checkedFn={(item) => hasCsvOption("publicationRecruitmentChannels", item)}
              toggleFn={(item) =>
                toggleCsvOption("publicationRecruitmentChannels", item)
              }
              columns={2}
            />
          </Required>
        </FormSection>

        <FormSection title="Consent, Data & Compensation">
          <FieldRow>
            <Required label="2.3 Will participants provide informed consent? *">
              <BaseSelect
                value={form.publicationInformedConsent}
                onChange={onFieldChange("publicationInformedConsent")}
              >
                <option value="">Select</option>
                <option>Written Consent</option>
                <option>Oral Consent</option>
                <option>Waived</option>
                <option>N/A</option>
              </BaseSelect>
            </Required>
            <Required label="2.4 Have any research data been collected prior to receiving ethical approval? *">
              <BaseSelect
                value={form.preApprovalDataCollected}
                onChange={onFieldChange("preApprovalDataCollected")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>
            <Required label="2.5 Can participants withdraw from the study at any time? *">
              <BaseSelect
                value={form.canWithdraw}
                onChange={onFieldChange("canWithdraw")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>
            <Required label="2.6 Will participants receive any compensation? *">
              <BaseSelect
                value={form.compensation}
                onChange={onFieldChange("compensation")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>
          </FieldRow>
        </FormSection>

        <FormSection title="Confidentiality & Vulnerable Populations">
          <Required
            label="2.7 How are participants' confidentiality and data privacy protected in the research? (required)"
            kind="selection"
          >
            <CheckboxGroup
              options={CONFIDENTIALITY_OPTIONS}
              checkedFn={(item) => hasCsvOption("confidentialityOptions", item)}
              toggleFn={(item) => toggleCsvOption("confidentialityOptions", item)}
              columns={2}
            />
            {hasCsvOption("confidentialityOptions", "Others") && (
              <BaseInput
                value={form.confidentialityOptionsOther ?? ""}
                onChange={onFieldChange("confidentialityOptionsOther")}
                placeholder="Others, please specific"
                className="mt-3"
              />
            )}
          </Required>

          <Required
            label="2.8 Does your research involve any vulnerable populations? *"
            className="mt-4"
          >
            <BaseSelect
              value={form.vulnerablePopulation}
              onChange={onFieldChange("vulnerablePopulation")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
              <option>N/A</option>
            </BaseSelect>
          </Required>
        </FormSection>

        <FormSection title="Sensitive Topics, Retention, & Risks">
          <Required label="2.9 Does the manuscript address sensitive topics or potentially stigmatizing information? *">
            <BaseSelect
              value={form.publicationSensitiveHealthTopics}
              onChange={onFieldChange("publicationSensitiveHealthTopics")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </BaseSelect>
          </Required>
          {form.publicationSensitiveHealthTopics === "Yes" && (
            <ConditionalCallout className="mt-3">
              <Required label="Details for sensitive topics *">
                <BaseTextarea
                  value={form.publicationSensitiveTopicsDetails ?? ""}
                  onChange={onFieldChange("publicationSensitiveTopicsDetails")}
                  rows={3}
                  placeholder="If 'Yes', explain how such information is presented responsibly."
                />
              </Required>
            </ConditionalCallout>
          )}

          <Required label="2.10 How long will the collected data be retained? *" className="mt-4">
            <BaseSelect
              value={form.dataRetentionYears}
              onChange={onFieldChange("dataRetentionYears")}
            >
              <option value="">Select</option>
              <option>1-5 years</option>
              <option>6-10 years</option>
              <option>11-15 years</option>
              <option>More than 16 years</option>
            </BaseSelect>
          </Required>
          {form.dataRetentionYears === "More than 16 years" && (
            <ConditionalCallout className="mt-3">
              <Required label="2.10 Longer retention reason *">
                <BaseTextarea
                  value={form.longRetentionReason}
                  onChange={onFieldChange("longRetentionReason")}
                  rows={3}
                  placeholder="If you have selected 'More than 16 years,' please further explain the need for keeping data for a longer time."
                />
              </Required>
            </ConditionalCallout>
          )}

          <Required label="2.11 Is this manuscript being submitted simultaneously to multiple journals? *" className="mt-4">
            <BaseSelect
              value={form.publicationSimultaneousJournals}
              onChange={onFieldChange("publicationSimultaneousJournals")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </BaseSelect>
          </Required>

          <Required label="2.12 Are there any undisclosed conflicts of interest? *" className="mt-4">
            <BaseSelect
              value={form.publicationConflictsUndisclosed}
              onChange={onFieldChange("publicationConflictsUndisclosed")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
              <option>Undecided</option>
            </BaseSelect>
          </Required>
          {form.publicationConflictsUndisclosed === "Yes" && (
            <ConditionalCallout className="mt-3">
              <Required label="Conflict disclosure details *">
                <BaseTextarea
                  value={form.publicationConflictDisclosureDetails}
                  onChange={onFieldChange("publicationConflictDisclosureDetails")}
                  rows={3}
                  placeholder="If 'Yes', describe below."
                />
              </Required>
            </ConditionalCallout>
          )}

          <Required label="2.13 Does your research have any potential adverse effects or risks? *" className="mt-4">
            <BaseSelect
              value={form.publicationHasRisks ?? ""}
              onChange={onFieldChange("publicationHasRisks")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </BaseSelect>
          </Required>
          {form.publicationHasRisks === "Yes" && (
            <ConditionalCallout className="mt-3">
              <Required label="Risk details *">
                <BaseTextarea
                  value={form.publicationPotentialRisks}
                  onChange={onFieldChange("publicationPotentialRisks")}
                  rows={3}
                  placeholder="Elaborate..."
                />
              </Required>
            </ConditionalCallout>
          )}

          <Required label="2.14 Are third-party copyrights or permissions required? *" className="mt-4">
            <BaseSelect
              value={form.publicationThirdPartyPermissions}
              onChange={onFieldChange("publicationThirdPartyPermissions")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </BaseSelect>
          </Required>
          {form.publicationThirdPartyPermissions === "Yes" && (
            <ConditionalCallout className="mt-3">
              <Required label="Third-party permission details *">
                <BaseTextarea
                  value={form.publicationThirdPartyPermissionDetails}
                  onChange={onFieldChange("publicationThirdPartyPermissionDetails")}
                  rows={3}
                  placeholder="If 'Yes', confirm all permissions have been obtained."
                />
              </Required>
            </ConditionalCallout>
          )}
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
        />

        <FormSection title="Funding & Collaboration">
          <FieldRow>
            <Required label="3.1 Has your research received institutional funding? *">
              <BaseSelect
                value={form.institutionalFunding}
                onChange={onFieldChange("institutionalFunding")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>
            

            <Required label="3.2 Does your research involve an international collaboration? *">
              <BaseSelect
                value={form.internationalCollaboration}
                onChange={onFieldChange("internationalCollaboration")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>
            <Required label="3.3 Will your research be conducted overseas/abroad? *">
              <BaseSelect
                value={form.conductedAbroad}
                onChange={onFieldChange("conductedAbroad")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>
          </FieldRow>

          {form.internationalCollaboration === "Yes" && (
            <ConditionalCallout className="mt-4">
              <Required label="International collaboration details *">
                <BaseTextarea
                  value={form.internationalCollaborationDetails}
                  onChange={onFieldChange("internationalCollaborationDetails")}
                  rows={3}
                  placeholder="If yes, give details (if not provided during step 1)"
                />
              </Required>
            </ConditionalCallout>
          )}

          <WarnNote className="mt-4">
            Note: If yes, the concerned institute&apos;s ethical approval form must be
            attached in the concerned section.
          </WarnNote>
        </FormSection>
      </section>
    );
  }

  /* ---------- STEP 3: Required Attachments ---------- */
  if (currentStep === 3) {
    return (
      <section className="flex flex-col gap-6">
        <StepHeader index={4} title="Required Attachments" />

        <div className="flex flex-col gap-3">
          {FORM_6_REQUIRED_ATTACHMENTS.map((item) => (
            <AttachmentCard
              key={item}
              label={item}
              isMandatory={FORM_6_MANDATORY_ATTACHMENT_SET.has(item)}
              optionalText="(if applicable)"
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

  /* ---------- STEP 4: Declaration ---------- */
  return (
    <section className="flex flex-col gap-6">
      <StepHeader index={5} title="Declaration and Submission" required />

      <DeclarationCheckbox
        checked={form.form3DeclarationAccepted === "yes"}
        onChange={(checked) => {
          setForm((prev) => {
            const declarationName =
              prev.scholarName.trim() || prev.applicantName.trim() || "______________";
            return {
              ...prev,
              form3DeclarationAccepted: checked ? "yes" : "",
              declaration: checked ? buildForm6Declaration(declarationName) : "",
            };
          });
        }}
      >
        I/We{" "}
        <span className="font-semibold">
          {form.scholarName.trim() || form.applicantName.trim() || "______________"}
        </span>{" "}
        hereby certify that: this manuscript is original, not previously published.
        All research involving human subjects was conducted with appropriate ethical
        approval. All participant identities are adequately protected and anonymized
        where required. All funding sources and conflicts of interest have been
        disclosed. The manuscript adheres to ethical guidelines for responsible
        reporting and representation. All authors have consented to this submission
        and agree with the content.
      </DeclarationCheckbox>
    </section>
  );
}
