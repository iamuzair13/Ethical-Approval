"use client";

import type { CommonFormProps } from "./form-stepper-types";
import {
  allInlineRequiredProps,
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
  FieldRow,
  FormSection,
  ReadOnlyInput,
  RequiredFieldsBanner,
  RequiredMark,
  StepHeader,
  WarnNote,
} from "./form-ui";

/** Step 5 — rows 1 and 3 require checkbox + upload; rows 2 and 4 optional */
export const FORM_4_REQUIRED_ATTACHMENTS = [
  "Questionnaire/Interview Guide",
  "Participant Consent Form",
  "Participant Information Letter Only",
  "Other Institutional Approval Letter(s) (If applicable)",
] as const;

export const FORM_4_MANDATORY_ATTACHMENT_LABELS: readonly string[] = [
  FORM_4_REQUIRED_ATTACHMENTS[0],
  FORM_4_REQUIRED_ATTACHMENTS[2],
];

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

const RESEARCH_POPULATION_OPTIONS = [
  "University students",
  "Faculty members",
  "Researchers/Laboratory staff",
  "Patients/clinical participants",
  "Specific disease groups/diagnosed patients",
  "Patients/healthcare workers",
  "Children/minors",
  "General adults",
  "Employees/staff members",
  "Other (specify in methodology)",
] as const;

function buildMedicalEthicsDeclarationParagraph(declarationName: string): string {
  return `I ${declarationName} hereby certify that: I have read and understood the ethical guidelines for medical and health sciences research. The information provided in this application is accurate and complete to the best of my knowledge. I will conduct this research strictly according to the approved protocol. I will report all adverse events and protocol deviations to my supervisor and the IREB immediately. I will obtain updated approvals if any significant changes to the protocol are necessary. I will not proceed with data collection without formal ethical approval.`;
}

export type Form4ResearchPublicationMedicalFormProps = CommonFormProps & {
  onClearSubmitError?: () => void;
};

export function Form4ResearchPublicationMedicalForm({
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
  onClearSubmitError,
}: Form4ResearchPublicationMedicalFormProps) {
  return (
    <div className="flex flex-col gap-6">
      <RequiredFieldsBanner variant="all-required" />

      {currentStep === 0 && (
        <section className="flex flex-col gap-6">
          <StepHeader index={1} title="Scholar's Information" />

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

          <FormSection title="1.2 Coauthor's Information">
            <FieldRow>
              <Required label="Coauthor's SAP ID *" className="w-full">
                <BaseInput
                  value={form.coauthorSapId}
                  onChange={onFieldChange("coauthorSapId")}
                  placeholder="SAP ID"
                />
              </Required>
              <Required label="Coauthor's Name *" className="w-full">
                <BaseInput
                  value={form.coauthorName}
                  onChange={onFieldChange("coauthorName")}
                  placeholder="Coauthor's Name"
                />
              </Required>
              <Required label="Coauthor's Email *" className="w-full">
                <BaseInput
                  type="email"
                  value={form.coauthorEmail}
                  onChange={onFieldChange("coauthorEmail")}
                  placeholder="Email"
                />
              </Required>
              <Required label="Coauthor's Faculty *" className="w-full">
                <BaseSelect
                  value={form.coauthorFaculty}
                  onChange={onFieldChange("coauthorFaculty")}
                >
                  <option value="">Faculty</option>
                  {facultyOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </BaseSelect>
              </Required>
              <Required label="Coauthor's Department *" className="w-full">
                <BaseSelect
                  value={form.coauthorDepartment}
                  onChange={onFieldChange("coauthorDepartment")}
                  disabled={!form.coauthorFaculty}
                >
                  <option value="">Department</option>
                  {getDepartmentsForFaculty(form.coauthorFaculty).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </BaseSelect>
              </Required>
            </FieldRow>
          </FormSection>

          <FormSection title="1.3 Co-Author" {...ignoreRequiredValidationProps()}>
            <BaseSelect
              required={false}
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
                    required={false}
                    value={form.publicationAuthor1UolSapId}
                    onChange={onFieldChange("publicationAuthor1UolSapId")}
                    placeholder="Co-Author SAP ID"
                  />
                  <BaseInput
                    required={false}
                    value={form.publicationAuthor1UolName}
                    onChange={onFieldChange("publicationAuthor1UolName")}
                    placeholder="Coauthor's Name"
                  />
                  <BaseInput
                    required={false}
                    value={form.publicationAuthor1UolEmail}
                    onChange={onFieldChange("publicationAuthor1UolEmail")}
                    placeholder="Email"
                  />
                  <BaseSelect
                    required={false}
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
                    required={false}
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
                    required={false}
                    value={form.publicationAuthor1ExternalName}
                    onChange={onFieldChange("publicationAuthor1ExternalName")}
                    placeholder="Co-author Name"
                  />
                  <BaseInput
                    required={false}
                    value={form.publicationAuthor1ExternalEmail}
                    onChange={onFieldChange("publicationAuthor1ExternalEmail")}
                    placeholder="Email"
                  />
                  <BaseInput
                    required={false}
                    value={form.publicationAuthor1ExternalUniversity}
                    onChange={onFieldChange("publicationAuthor1ExternalUniversity")}
                    placeholder="University Name"
                  />
                  <BaseSelect
                    required={false}
                    value={form.publicationAuthor1ExternalFaculty}
                    onChange={onFieldChange("publicationAuthor1ExternalFaculty")}
                  >
                    <option value="">Faculty</option>
                    {facultyOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </BaseSelect>
                  <BaseSelect
                    required={false}
                    value={form.publicationAuthor1ExternalDepartment}
                    onChange={onFieldChange("publicationAuthor1ExternalDepartment")}
                    disabled={!form.publicationAuthor1ExternalFaculty}
                  >
                    <option value="">Department</option>
                    {getDepartmentsForFaculty(form.publicationAuthor1ExternalFaculty).map(
                      (item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ),
                    )}
                  </BaseSelect>
                </>
              )}
            </FieldRow>
          </FormSection>

          <FormSection title="Add another Co-Author" {...ignoreRequiredValidationProps()}>
            <BaseSelect
              required={false}
              value={form.publicationCoAuthor2Type}
              onChange={onFieldChange("publicationCoAuthor2Type")}
              className="mb-4 max-w-xs"
            >
              <option value="UOL">Option 1: UOL</option>
              <option value="External">Option 2: External</option>
            </BaseSelect>
            <FieldRow>
              {form.publicationCoAuthor2Type === "UOL" ? (
                <>
                  <BaseInput
                    required={false}
                    value={form.publicationAuthor2UolSapId}
                    onChange={onFieldChange("publicationAuthor2UolSapId")}
                    placeholder="Co-Author SAP ID"
                  />
                  <BaseInput
                    required={false}
                    value={form.publicationAuthor2UolName}
                    onChange={onFieldChange("publicationAuthor2UolName")}
                    placeholder="Coauthor's Name"
                  />
                  <BaseInput
                    required={false}
                    value={form.publicationAuthor2UolEmail}
                    onChange={onFieldChange("publicationAuthor2UolEmail")}
                    placeholder="Email"
                  />
                  <BaseSelect
                    required={false}
                    value={form.publicationAuthor2UolFaculty}
                    onChange={onFieldChange("publicationAuthor2UolFaculty")}
                  >
                    <option value="">Faculty</option>
                    {facultyOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </BaseSelect>
                  <BaseSelect
                    required={false}
                    value={form.publicationAuthor2UolDepartment}
                    onChange={onFieldChange("publicationAuthor2UolDepartment")}
                    disabled={!form.publicationAuthor2UolFaculty}
                  >
                    <option value="">Department</option>
                    {getDepartmentsForFaculty(form.publicationAuthor2UolFaculty).map(
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
                    required={false}
                    value={form.publicationAuthor2ExternalName}
                    onChange={onFieldChange("publicationAuthor2ExternalName")}
                    placeholder="Co-author Name"
                  />
                  <BaseInput
                    required={false}
                    value={form.publicationAuthor2ExternalEmail}
                    onChange={onFieldChange("publicationAuthor2ExternalEmail")}
                    placeholder="Email"
                  />
                  <BaseInput
                    required={false}
                    value={form.publicationAuthor2ExternalUniversity}
                    onChange={onFieldChange("publicationAuthor2ExternalUniversity")}
                    placeholder="University Name"
                  />
                  <BaseSelect
                    required={false}
                    value={form.publicationAuthor2ExternalFaculty}
                    onChange={onFieldChange("publicationAuthor2ExternalFaculty")}
                  >
                    <option value="">Faculty</option>
                    {facultyOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </BaseSelect>
                  <BaseSelect
                    required={false}
                    value={form.publicationAuthor2ExternalDepartment}
                    onChange={onFieldChange("publicationAuthor2ExternalDepartment")}
                    disabled={!form.publicationAuthor2ExternalFaculty}
                  >
                    <option value="">Department</option>
                    {getDepartmentsForFaculty(form.publicationAuthor2ExternalFaculty).map(
                      (item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ),
                    )}
                  </BaseSelect>
                </>
              )}
            </FieldRow>
          </FormSection>

          <FormSection title="External researcher in team?" {...ignoreRequiredValidationProps()}>
            <BaseSelect
              required={false}
              value={form.hasExternalResearcher}
              onChange={onFieldChange("hasExternalResearcher")}
              className="max-w-xs"
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </BaseSelect>
            {form.hasExternalResearcher === "Yes" && (
              <BaseTextarea
                required={false}
                value={form.externalResearcherDetails}
                onChange={onFieldChange("externalResearcherDetails")}
                rows={3}
                placeholder="Provide names, qualifications and affiliations."
                className="mt-3"
              />
            )}
          </FormSection>

          <FormSection title="1.4 Research Details">
            <FieldRow>
              <Required label="Research Title *" className="md:col-span-2 w-full">
                <BaseInput
                  value={form.publicationTitle}
                  onChange={onFieldChange("publicationTitle")}
                  placeholder="Research Title"
                />
              </Required>
              <Required label="Research Objective 1 *" className="md:col-span-2 w-full">
                <BaseTextarea
                  value={form.publicationObjective1}
                  onChange={onFieldChange("publicationObjective1")}
                  rows={2}
                  placeholder="Research Objective 1"
                />
              </Required>
              <Required label="Research Objective 2 *" className="md:col-span-2 w-full">
                <BaseTextarea
                  value={form.publicationObjective2}
                  onChange={onFieldChange("publicationObjective2")}
                  rows={2}
                  placeholder="Research Objective 2"
                />
              </Required>
              <BaseTextarea
                value={form.publicationObjective3}
                onChange={onFieldChange("publicationObjective3")}
                rows={2}
                placeholder="Research Objective 3"
                className="md:col-span-2"
              />
              <Required label="Sustainable Development Goals (multi-select)" className="md:col-span-2 w-full">
                <div className="rounded-lg border border-stroke p-3 dark:border-dark-3">
                  <p className="mb-2 text-sm font-semibold text-dark dark:text-white">
                    Sustainable Development Goals (multi-select)
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SDG_OPTIONS.map((item) => (
                      <label key={item} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={hasCsvOption("sdgs", item)}
                          onChange={() => toggleCsvOption("sdgs", item)}
                          className="accent-primary"
                        />
                        <span className="text-dark dark:text-white">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </Required>
              <Required label="Participants Estimate *" className="md:col-span-2 w-full">
                <BaseSelect
                  value={form.publicationParticipantsEstimate}
                  onChange={onFieldChange("publicationParticipantsEstimate")}
                >
                  <option value="">Participants Estimate</option>
                  {PARTICIPANT_BANDS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </BaseSelect>
              </Required>
              <Required label="Research Population Type *" className="md:col-span-2 w-full">
                <BaseSelect
                  value={form.publicationPopulationType}
                  onChange={onFieldChange("publicationPopulationType")}
                >
                  <option value="">Select Research Population (type)</option>
                  {RESEARCH_POPULATION_OPTIONS.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </BaseSelect>
              </Required>
              <Required label="Study Design and Methodology *" className="md:col-span-2 w-full">
                <BaseTextarea
                  value={form.publicationMethodology}
                  onChange={onFieldChange("publicationMethodology")}
                  rows={4}
                  placeholder="Study Design and Methodology"
                />
              </Required>
            </FieldRow>
          </FormSection>
        </section>
      )}

      {currentStep === 1 && (
        <section className="flex flex-col gap-6" {...allInlineRequiredProps()}>
          <StepHeader index={2} title="Ethical Considerations" />

          <FormSection>
            <Required
              label="Does the article report findings from research involving human subjects? *"
              className="w-full"
            >
              <BaseSelect
                id="f4-s2-q01"
                value={form.publicationHumanSubjects}
                onChange={onFieldChange("publicationHumanSubjects")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>

            <Required label="How will participants be recruited? (Select multiple)" className="mt-4 w-full">
              <CheckboxGroup
                options={RECRUITMENT_CHANNELS}
                checkedFn={(item) => hasCsvOption("publicationRecruitmentChannels", item)}
                toggleFn={(item) => toggleCsvOption("publicationRecruitmentChannels", item)}
                columns={2}
              />
            </Required>

            <Required
              label="Did the research obtain informed consent from participants/patients? *"
              className="mt-4 w-full"
            >
              <BaseSelect
                id="f4-s2-q03"
                value={form.publicationInformedConsent}
                onChange={onFieldChange("publicationInformedConsent")}
              >
                <option value="">Select</option>
                <option>Written informed consent</option>
                <option>Oral informed consent</option>
                <option>Waived consent</option>
                <option>Not applicable</option>
              </BaseSelect>
              <p className="mt-2 text-xs leading-relaxed text-body dark:text-dark-6">
                Note: Provide attach the consent form (as per UOL format) in the concerned
                section [Link of the Form].
              </p>
            </Required>

            <Required
              label="Have any research data been collected prior to receiving ethical approval? *"
              className="mt-4 w-full"
            >
              <BaseSelect
                id="f4-s2-q04"
                value={form.publicationPreApprovalDataCollected}
                onChange={onFieldChange("publicationPreApprovalDataCollected")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
                <option>Not applicable</option>
              </BaseSelect>
              <p className="mt-2 text-xs leading-relaxed text-body dark:text-dark-6">
                Note: If &apos;yes&apos; is selected, please attach the participant
                information letter (cover letter) and participant consent form.
              </p>
            </Required>

            <Required
              label="Can participants withdraw from the study at any time? *"
              className="mt-4 w-full"
            >
              <BaseSelect
                id="f4-s2-q05"
                value={form.publicationCanWithdraw}
                onChange={onFieldChange("publicationCanWithdraw")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>

            <Required label="Will participants receive any compensation? *" className="mt-4 w-full">
              <BaseSelect
                id="f4-s2-q06"
                value={form.publicationCompensation}
                onChange={onFieldChange("publicationCompensation")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>

            <Required
              label="Are all patient/participant identities adequately anonymized or de-identified in the manuscript? *"
              className="mt-4 w-full"
            >
              <BaseSelect
                id="f4-s2-q07"
                value={form.publicationAnonymized}
                onChange={onFieldChange("publicationAnonymized")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
                <option>Partially</option>
                <option>N/A</option>
              </BaseSelect>
            </Required>

            <Required
              label="Does the manuscript address sensitive health topics (e.g., mental health, infectious disease, sensitive procedures)? *"
              className="mt-4 w-full"
            >
              <BaseSelect
                id="f4-s2-q08"
                value={form.publicationSensitiveHealthTopics}
                onChange={onFieldChange("publicationSensitiveHealthTopics")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>

            <Required
              label="Does the article involve vulnerable patient populations (children, elderly, institutionalized)? *"
              className="mt-4 w-full"
            >
              <BaseSelect
                id="f4-s2-q09"
                value={form.publicationVulnerablePopulation}
                onChange={onFieldChange("publicationVulnerablePopulation")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
                <option>N/A</option>
              </BaseSelect>
              {form.publicationVulnerablePopulation === "Yes" && (
                <div className="mt-3 flex flex-col gap-2">
                  <label
                    htmlFor="f4-s2-q09-detail"
                    className="text-sm font-medium text-dark dark:text-white"
                  >
                    If &apos;Yes&apos;, confirm appropriate ethical protections were in place.
                  </label>
                  <BaseTextarea
                    id="f4-s2-q09-detail"
                    value={form.publicationVulnerableProtections}
                    onChange={onFieldChange("publicationVulnerableProtections")}
                    rows={3}
                  />
                </div>
              )}
            </Required>

            <Required
              label="Will this research involve biological specimens (blood, tissue, genetic material, etc.)? *"
              className="mt-4 w-full"
            >
              <BaseSelect
                id="f4-s2-q10"
                value={form.publicationBiologicalSpecimens}
                onChange={onFieldChange("publicationBiologicalSpecimens")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
              {form.publicationBiologicalSpecimens === "Yes" && (
                <div className="mt-3 flex flex-col gap-2">
                  <label
                    htmlFor="f4-s2-q10-detail"
                    className="text-sm font-medium text-dark dark:text-white"
                  >
                    If &apos;Yes&apos;, describe collection, storage, and handling procedures
                    with biosafety measures.
                  </label>
                  <BaseTextarea
                    id="f4-s2-q10-detail"
                    value={form.publicationBiologicalSpecimenDetails}
                    onChange={onFieldChange("publicationBiologicalSpecimenDetails")}
                    rows={3}
                  />
                </div>
              )}
            </Required>

            <Required
              label="Does the manuscript involve pharmacological or therapeutic interventions? *"
              className="mt-4 w-full"
            >
              <BaseSelect
                id="f4-s2-q11"
                value={form.publicationPharmaInterventions}
                onChange={onFieldChange("publicationPharmaInterventions")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
              {form.publicationPharmaInterventions === "Yes" && (
                <div className="mt-3 flex flex-col gap-2">
                  <label
                    htmlFor="f4-s2-q11-detail"
                    className="text-sm font-medium text-dark dark:text-white"
                  >
                    If &apos;Yes&apos;, verify drug names, dosages, and adverse effects are
                    accurately reported. Also attach the approval for pharmaceutical substance
                    use.
                  </label>
                  <BaseTextarea
                    id="f4-s2-q11-detail"
                    value={form.publicationPharmaInterventionDetails}
                    onChange={onFieldChange("publicationPharmaInterventionDetails")}
                    rows={3}
                  />
                </div>
              )}
            </Required>

            <Required label="Will animal subjects be used in this research? *" className="mt-4 w-full">
              <BaseSelect
                id="f4-s2-q12"
                value={form.publicationAnimalSubjects}
                onChange={onFieldChange("publicationAnimalSubjects")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
              {form.publicationAnimalSubjects === "Yes" && (
                <div className="mt-3 flex flex-col gap-2">
                  <label
                    htmlFor="f4-s2-q12-detail"
                    className="text-sm font-medium text-dark dark:text-white"
                  >
                    If &apos;Yes&apos;, justify use and describe animal care/welfare measures.
                  </label>
                  <BaseTextarea
                    id="f4-s2-q12-detail"
                    value={form.publicationAnimalWelfareDetails}
                    onChange={onFieldChange("publicationAnimalWelfareDetails")}
                    rows={3}
                  />
                </div>
              )}
            </Required>

            <Required
              label="If yes to 2.12, has approval from the concerned ethics committee been obtained? *"
              className="mt-4 w-full"
            >
              <BaseSelect
                id="f4-s2-q13"
                value={form.publicationAnimalEthicsApproval}
                onChange={onFieldChange("publicationAnimalEthicsApproval")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
                <option>Pending</option>
                <option>Not Applicable</option>
              </BaseSelect>
              <p className="mt-2 text-xs leading-relaxed text-body dark:text-dark-6">
                Note: Please attach the approval letter in the required attachments section.
              </p>
            </Required>

            <Required
              label="Are there any undisclosed conflicts of interest or funding sources? *"
              className="mt-4 w-full"
            >
              <BaseSelect
                id="f4-s2-q14"
                value={form.publicationConflictsUndisclosed}
                onChange={onFieldChange("publicationConflictsUndisclosed")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
                <option>Undecided</option>
              </BaseSelect>
              {form.publicationConflictsUndisclosed === "Yes" && (
                <div className="mt-3 flex flex-col gap-2">
                  <label
                    htmlFor="f4-s2-q14-detail"
                    className="text-sm font-medium text-dark dark:text-white"
                  >
                    If &apos;Yes&apos;, provide complete disclosure including pharmaceutical
                    sponsorship, financial stakes, or employment conflicts.
                  </label>
                  <BaseTextarea
                    id="f4-s2-q14-detail"
                    value={form.publicationConflictDisclosureDetails}
                    onChange={onFieldChange("publicationConflictDisclosureDetails")}
                    rows={3}
                  />
                </div>
              )}
            </Required>

            <Required
              label="If applicable, identify all potential risks and adverse effects (physical, psychological, social, legal): *"
              className="mt-4 w-full"
            >
              <BaseTextarea
                id="f4-s2-q15"
                value={form.publicationPotentialRisks}
                onChange={onFieldChange("publicationPotentialRisks")}
                rows={4}
              />
            </Required>

            <Required
              label="Is this manuscript being submitted simultaneously to multiple journals? *"
              className="mt-4 w-full"
            >
              <BaseSelect
                id="f4-s2-q16"
                value={form.publicationSimultaneousJournals}
                onChange={onFieldChange("publicationSimultaneousJournals")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>

            <Required
              label="Has this research (or substantially similar research) been previously published? *"
              className="mt-4 w-full"
            >
              <BaseSelect
                id="f4-s2-q17"
                value={form.publicationPreviouslyPublished}
                onChange={onFieldChange("publicationPreviouslyPublished")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>
          </FormSection>
        </section>
      )}

      {currentStep === 2 && (
        <section className="flex flex-col gap-6" {...allInlineRequiredProps()}>
          <StepHeader index={3} title="Data Integrity and Permissions" />

          <FormSection>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label htmlFor="f4-s3-q01" className="text-sm font-medium text-dark dark:text-white">
                3.1 Will the data be presented accurately and completely in the manuscript?
              </label>
              <BaseSelect
                id="f4-s3-q01"
                value={form.publicationDataAccurate}
                onChange={onFieldChange("publicationDataAccurate")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
                <option>Partial disclosure</option>
              </BaseSelect>
            </div>

            <div className="mt-4 flex flex-col gap-2 md:col-span-2">
              <label htmlFor="f4-s3-q02" className="text-sm font-medium text-dark dark:text-white">
                3.2 Does the article follow relevant reporting guidelines (CONSORT, STROBE,
                PRISMA, etc.)?
              </label>
              <BaseSelect
                id="f4-s3-q02"
                value={form.publicationReportingGuidelines}
                onChange={onFieldChange("publicationReportingGuidelines")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
                <option>Not applicable</option>
              </BaseSelect>
            </div>

            <div className="mt-4 flex flex-col gap-2 md:col-span-2">
              <label htmlFor="f4-s3-q03" className="text-sm font-medium text-dark dark:text-white">
                3.3 Have all adverse events and safety data been accurately reported?
              </label>
              <BaseSelect
                id="f4-s3-q03"
                value={form.publicationAdverseEventsReported}
                onChange={onFieldChange("publicationAdverseEventsReported")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
                <option>Not applicable</option>
              </BaseSelect>
            </div>

            <div className="mt-4 flex flex-col gap-2 md:col-span-2">
              <label htmlFor="f4-s3-q04" className="text-sm font-medium text-dark dark:text-white">
                3.4 Are there any third-party copyrights or permissions required (figures, tables,
                images, datasets)?
              </label>
              <BaseSelect
                id="f4-s3-q04"
                value={form.publicationThirdPartyPermissions}
                onChange={onFieldChange("publicationThirdPartyPermissions")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
              {form.publicationThirdPartyPermissions === "Yes" && (
                <div className="mt-3 flex flex-col gap-2">
                  <label
                    htmlFor="f4-s3-q04-detail"
                    className="text-sm font-medium text-dark dark:text-white"
                  >
                    If &apos;Yes&apos;, confirm that all permissions have been obtained and
                    documented.
                  </label>
                  <BaseTextarea
                    id="f4-s3-q04-detail"
                    value={form.publicationThirdPartyPermissionDetails}
                    onChange={onFieldChange("publicationThirdPartyPermissionDetails")}
                    rows={3}
                  />
                </div>
              )}
            </div>
          </FormSection>
        </section>
      )}

      {currentStep === 3 && (
        <section className="flex flex-col gap-6" {...allInlineRequiredProps()}>
          <StepHeader index={4} title="Institutional Approvals & Collaboration" />

          <FormSection>
            <FieldRow>
              <BaseSelect
                value={form.institutionalFunding}
                onChange={onFieldChange("institutionalFunding")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
              <BaseSelect value={form.externalFunding} onChange={onFieldChange("externalFunding")}>
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
              <BaseSelect
                value={form.internationalCollaboration}
                onChange={onFieldChange("internationalCollaboration")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
              <BaseSelect value={form.conductedAbroad} onChange={onFieldChange("conductedAbroad")}>
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </FieldRow>
            {form.internationalCollaboration === "Yes" && (
              <BaseTextarea
                value={form.internationalCollaborationDetails}
                onChange={onFieldChange("internationalCollaborationDetails")}
                rows={3}
                placeholder="Provide international collaboration details."
                className="mt-4"
              />
            )}
            {form.conductedAbroad === "Yes" && (
              <WarnNote className="mt-4">
                Note: Attach the concerned institute&apos;s ethical approval form in required
                attachments.
              </WarnNote>
            )}
          </FormSection>
        </section>
      )}

      {currentStep === 4 && (
        <section className="flex flex-col gap-6">
          <StepHeader index={5} title="Required Attachments" />

          <div className="flex flex-col gap-3">
            {FORM_4_REQUIRED_ATTACHMENTS.map((item) => (
              <AttachmentCard
                key={item}
                label={item}
                isMandatory={FORM_4_MANDATORY_ATTACHMENT_LABELS.includes(item)}
                isChecked={hasCsvOption("requiredAttachments", item)}
                onToggle={() => toggleCsvOption("requiredAttachments", item)}
                fileName={attachmentFiles[item]}
                onUpload={handleRequiredAttachmentUpload(item)}
              />
            ))}
          </div>
        </section>
      )}

      {currentStep === 5 && (
        <section className="flex flex-col gap-6">
          <StepHeader index={6} title="Declaration and Submission" required />

          <DeclarationCheckbox
            checked={form.publicationDeclarationAccepted === "yes"}
            onChange={(checked) => {
              setForm((prev) => {
                const declarationName =
                  prev.scholarName.trim() ||
                  prev.applicantName.trim() ||
                  "_____________________";
                return {
                  ...prev,
                  publicationDeclarationAccepted: checked ? "yes" : "",
                  declaration: checked
                    ? buildMedicalEthicsDeclarationParagraph(declarationName)
                    : "",
                };
              });
              onClearSubmitError?.();
            }}
          >
            I{" "}
            <span className="font-semibold">
              {form.scholarName.trim() ||
                form.applicantName.trim() ||
                "_____________________"}
            </span>{" "}
            hereby certify that: I have read and understood the ethical guidelines for medical and
            health sciences research. The information provided in this application is accurate and
            complete to the best of my knowledge. I will conduct this research strictly according to
            the approved protocol. I will report all adverse events and protocol deviations to my
            supervisor and the IREB immediately. I will obtain updated approvals if any significant
            changes to the protocol are necessary. I will not proceed with data collection without
            formal ethical approval.
            <RequiredMark />
          </DeclarationCheckbox>
        </section>
      )}
    </div>
  );
}
