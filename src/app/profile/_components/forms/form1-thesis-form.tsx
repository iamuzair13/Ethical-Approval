"use client";

import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { CommonFormProps } from "./form-stepper-types";
import {
  FORM_3_MANDATORY_ATTACHMENTS,
  FORM_3_REQUIRED_ATTACHMENTS,
} from "./form3-thesis-medical-form";
import { Required } from "./required";
import {
  AttachmentCard,
  BaseInput,
  BaseSelect,
  BaseTextarea,
  CheckboxGroup,
  ConditionalCallout,
  DeclarationCheckbox,
  ExtraUploadCard,
  FieldRow,
  FormSection,
  ReadOnlyInput,
  RadioTileGroup,
  RequiredFieldsBanner,
  RequiredMark,
  StepHeader,
  WarnNote,
} from "./form-ui";

/** Form 1 (Thesis – Non-Medical) shares the Form 3 attachment checklist. */
export const FORM_1_REQUIRED_ATTACHMENTS = FORM_3_REQUIRED_ATTACHMENTS;
const FORM_1_MANDATORY_ATTACHMENT_SET = new Set<string>(
  FORM_3_MANDATORY_ATTACHMENTS as readonly string[],
);

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

const RESEARCH_PURPOSE_OPTIONS = [
  "Research",
  "Scholarship and/or Pedagogical Research",
  "Inter-disciplinary research",
  "Educational qualification",
  "Educational research and evaluation",
  "Health Services Evaluation",
  "Other (specify in methodology)",
] as const;

const DATA_COLLECTION_OPTIONS = [
  "Interview (one-on-one, semi-structured, structured)",
  "Focus group",
  "Self-completion (questionnaire, dairies, survey apps)",
  "Through observation",
  "Through autoethnographic research",
  "Through experiments/user-testing",
  "Other (specify in methodology)",
] as const;

const RESEARCH_POPULATION_OPTIONS = [
  "University students",
  "Faculty members",
  "Librarians, Patients/healthcare workers",
  "Children/minors, General adults",
  "Employees/staff members",
  "Other (specify in methodology)",
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

const SENSITIVE_TOPIC_TYPES = [
  "Trauma/PTSD",
  "Physical/Emotional/Psychological Abuse",
  "Assault",
  "Mental Health",
  "Domestic Abuse",
  "Stigmatized Health Conditions",
  "Immigration/Refugee Status",
  "Others",
] as const;

const DATA_RETENTION_OPTIONS = [
  "1-5 years",
  "6-10 years",
  "11-15 years",
  "More than 16 years",
] as const;

const INFORMED_CONSENT_OPTIONS = [
  "Written Consent",
  "Oral Consent",
  "Waived",
  "N/A",
] as const;

function buildMedicalEthicsDeclarationParagraph(declarationName: string): string {
  return `I ${declarationName} hereby certify that: I have read and understood the ethical guidelines for medical and health sciences research. The information provided in this application is accurate and complete to the best of my knowledge. I will conduct this research strictly according to the approved protocol. I will report all adverse events and protocol deviations to my supervisor and the IREB immediately. I will obtain updated approvals if any significant changes to the protocol are necessary. I will not proceed with data collection without formal ethical approval.`;
}

export type Form1ThesisFormProps = CommonFormProps & {
  extraUploadFiles: string[];
  setExtraUploadFiles: Dispatch<SetStateAction<string[]>>;
  handleExtraUploadChange: (index: number) => (e: ChangeEvent<HTMLInputElement>) => void;
  onClearSubmitError?: () => void;
};

export function Form1ThesisForm({
  currentStep,
  form,
  onFieldChange,
  setForm,
  hasCsvOption,
  toggleCsvOption,
  attachmentFiles,
  handleRequiredAttachmentUpload,
  extraUploadFiles,
  setExtraUploadFiles,
  handleExtraUploadChange,
  facultyOptions,
  getDepartmentsForFaculty,
  onClearSubmitError,
}: Form1ThesisFormProps) {
  const declarationName =
    form.scholarName.trim() || form.applicantName.trim() || "_____________________";

  return (
    <div className="flex flex-col gap-6">
      <RequiredFieldsBanner variant="all-required" />

      {/* ---------- STEP 1: Researcher(s) and Thesis/Project Information ---------- */}
      {currentStep === 0 && (
        <section className="flex flex-col gap-6">
          <StepHeader index={1} title="Researcher(s) and Thesis/Project Information" />

          {/* 1.1 Scholar's Information */}
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

          {/* 1.2 Supervisor's Information */}
          <FormSection title="1.2 Supervisor(s)'s Information">
            <FieldRow>
              <Required label="Supervisor(s)'s SAP ID *">
                <BaseInput
                  value={form.supervisorSapId}
                  onChange={onFieldChange("supervisorSapId")}
                  placeholder="SAP ID"
                />
              </Required>
              <Required label="Supervisor's Name *">
                <BaseInput
                  value={form.supervisorName}
                  onChange={onFieldChange("supervisorName")}
                  placeholder="Supervisor's Name"
                />
              </Required>
              <Required label="Email *">
                <BaseInput
                  type="email"
                  value={form.supervisorEmail}
                  onChange={onFieldChange("supervisorEmail")}
                  placeholder="Email"
                />
              </Required>
              <Required label="Faculty *">
                <BaseSelect
                  value={form.supervisorFaculty}
                  onChange={onFieldChange("supervisorFaculty")}
                >
                  <option value="">Select Faculty</option>
                  {facultyOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </BaseSelect>
              </Required>
              <Required label="Department *" className="md:col-span-2">
                <BaseSelect
                  value={form.supervisorDepartment}
                  onChange={onFieldChange("supervisorDepartment")}
                  disabled={!form.supervisorFaculty}
                >
                  <option value="">Select Department</option>
                  {getDepartmentsForFaculty(form.supervisorFaculty).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </BaseSelect>
              </Required>
            </FieldRow>
          </FormSection>

          {/* 1.3 Co-supervisor */}
          <FormSection title="1.3 Co-supervisor">
            <BaseSelect
              required
              value={form.coSupervisorType}
              onChange={onFieldChange("coSupervisorType")}
              className="mb-4 max-w-xs"
            >
              <option value="UOL">Option 1: UOL</option>
              <option value="External">Option 2: External</option>
            </BaseSelect>
            <FieldRow>
              {form.coSupervisorType === "UOL" ? (
                <>
                  <Required label="Co-supervisor (UOL) SAP ID *">
                    <BaseInput
                      required
                      value={form.uolCoSupervisorSapId}
                      onChange={onFieldChange("uolCoSupervisorSapId")}
                      placeholder="SAP ID"
                    />
                  </Required>
                  <Required label="Co-supervisor (UOL) Name *">
                    <BaseInput
                      required
                      value={form.uolCoSupervisorName}
                      onChange={onFieldChange("uolCoSupervisorName")}
                      placeholder="Supervisor's Name"
                    />
                  </Required>
                  <Required label="Co-supervisor (UOL) Email *">
                    <BaseInput
                      required
                      type="email"
                      value={form.uolCoSupervisorEmail}
                      onChange={onFieldChange("uolCoSupervisorEmail")}
                      placeholder="Email"
                    />
                  </Required>
                  <Required label="Co-supervisor (UOL) Faculty *">
                    <BaseSelect
                      required
                      value={form.uolCoSupervisorFaculty}
                      onChange={onFieldChange("uolCoSupervisorFaculty")}
                    >
                      <option value="">Select Faculty</option>
                      {facultyOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </BaseSelect>
                  </Required>
                  <Required label="Co-supervisor (UOL) Department *" className="md:col-span-2">
                    <BaseSelect
                      required
                      value={form.uolCoSupervisorDepartment}
                      onChange={onFieldChange("uolCoSupervisorDepartment")}
                      disabled={!form.uolCoSupervisorFaculty}
                    >
                      <option value="">Select Department</option>
                      {getDepartmentsForFaculty(form.uolCoSupervisorFaculty).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </BaseSelect>
                  </Required>
                </>
              ) : (
                <>
                  <Required label="External Co-supervisor Name *">
                    <BaseInput
                      value={form.externalCoSupervisorName}
                      onChange={onFieldChange("externalCoSupervisorName")}
                      placeholder="Co-supervisor's Name"
                    />
                  </Required>
                  <Required label="External Co-supervisor Reg. No. *">
                    <BaseInput
                      value={form.externalCoSupervisorRegNo}
                      onChange={onFieldChange("externalCoSupervisorRegNo")}
                      placeholder="Reg. No."
                    />
                  </Required>
                  <Required label="External Co-supervisor Email *">
                    <BaseInput
                      type="email"
                      value={form.externalCoSupervisorEmail}
                      onChange={onFieldChange("externalCoSupervisorEmail")}
                      placeholder="Email"
                    />
                  </Required>
                  <Required label="External Co-supervisor University *">
                    <BaseInput
                      value={form.externalUniversity}
                      onChange={onFieldChange("externalUniversity")}
                      placeholder="University"
                    />
                  </Required>
                  <Required label="External Co-supervisor Faculty *">
                    <BaseSelect
                      value={form.externalFaculty}
                      onChange={onFieldChange("externalFaculty")}
                    >
                      <option value="">Select Faculty</option>
                      {facultyOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </BaseSelect>
                  </Required>
                  <Required label="External Co-supervisor Department *">
                    <BaseSelect
                      value={form.externalDepartment}
                      onChange={onFieldChange("externalDepartment")}
                      disabled={!form.externalFaculty}
                    >
                      <option value="">Select Department</option>
                      {getDepartmentsForFaculty(form.externalFaculty).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </BaseSelect>
                  </Required>
                </>
              )}
            </FieldRow>
          </FormSection>

          {/* 1.4 Thesis/Project Details */}
          <FormSection title="1.4 Thesis/Project Details">
            <FieldRow>
              <Required label="Thesis/Project Title *" className="md:col-span-2">
                <BaseInput
                  value={form.thesisTitle}
                  onChange={onFieldChange("thesisTitle")}
                  placeholder="Thesis / Project Title"
                />
              </Required>
              <Required label="Expected Start Date *">
                <BaseInput
                  type="date"
                  value={form.expectedStartDate}
                  onChange={onFieldChange("expectedStartDate")}
                />
              </Required>
              <Required label="Expected End Date *">
                <BaseInput
                  type="date"
                  value={form.expectedEndDate}
                  onChange={onFieldChange("expectedEndDate")}
                />
              </Required>
              <Required label="Research Locations *" className="md:col-span-2">
                <BaseInput
                  value={form.researchLocations}
                  onChange={onFieldChange("researchLocations")}
                  placeholder="Research Location(s)"
                />
              </Required>
              <Required label="Research Objective 1 *" className="md:col-span-2">
                <BaseTextarea
                  value={form.researchObjective1}
                  onChange={onFieldChange("researchObjective1")}
                  rows={2}
                  placeholder="Research Objective 1"
                />
              </Required>
              <Required label="Research Objective 2 *" className="md:col-span-2">
                <BaseTextarea
                  value={form.researchObjective2}
                  onChange={onFieldChange("researchObjective2")}
                  rows={2}
                  placeholder="Research Objective 2"
                />
              </Required>
              <BaseTextarea
                value={form.researchObjective3}
                onChange={onFieldChange("researchObjective3")}
                rows={2}
                placeholder="Research Objective 3"
                className="md:col-span-2"
              />
              <BaseTextarea
                value={form.researchObjective4}
                onChange={onFieldChange("researchObjective4")}
                rows={2}
                placeholder="Research Objective 4"
                className="md:col-span-2"
              />
            </FieldRow>
          </FormSection>

          {/* 1.5 Sustainable Development Goals */}
          <FormSection title="1.5 Sustainable Development Goals">
            <Required
              label="Please select relevant Sustainable Development Goals (multi-select) *"
              kind="selection"
            >
              <CheckboxGroup
                options={SDG_OPTIONS}
                checkedFn={(item) => hasCsvOption("sdgs", item)}
                toggleFn={(item) => toggleCsvOption("sdgs", item)}
              />
            </Required>
          </FormSection>

          {/* 1.6 Purpose of Research */}
          <FormSection title="1.6 Purpose of Research">
            <Required
              label="Select the appropriate purpose of the research (multi-select) *"
              kind="selection"
            >
              <CheckboxGroup
                options={RESEARCH_PURPOSE_OPTIONS}
                checkedFn={(item) => hasCsvOption("researchPurpose", item)}
                toggleFn={(item) => toggleCsvOption("researchPurpose", item)}
              />
            </Required>
          </FormSection>

          {/* 1.7 Data Collection Method */}
          <FormSection title="1.7 Data Collection Method">
            <Required
              label="Select the chosen method of data collection (single-select) *"
              kind="radio"
            >
              <RadioTileGroup
                name="dataCollectionMethod"
                value={form.dataCollectionMethod}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, dataCollectionMethod: val }))
                }
                options={DATA_COLLECTION_OPTIONS}
                columns={1}
              />
            </Required>
          </FormSection>

          {/* 1.8 Research Population */}
          <FormSection title="1.8 Research Population">
            <Required
              label="Select Research Population (single-select) *"
              kind="radio"
            >
              <RadioTileGroup
                name="researchPopulation"
                value={form.researchPopulation}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, researchPopulation: val }))
                }
                options={RESEARCH_POPULATION_OPTIONS}
                columns={1}
              />
            </Required>
          </FormSection>

          {/* 1.9 Methodology & Participants */}
          <FormSection title="1.9 Research Methodology & Participants">
            <FieldRow cols={1}>
              <Required label="Research Methodology (Methods and Materials) *">
                <BaseTextarea
                  value={form.methodology}
                  onChange={onFieldChange("methodology")}
                  rows={4}
                  placeholder="Research Methodology (Methods and Materials)"
                />
              </Required>
              <Required label="How many participants will you be recruiting? (estimated range) *">
                <BaseSelect
                  value={form.participantsEstimate}
                  onChange={onFieldChange("participantsEstimate")}
                  className="max-w-md"
                >
                  <option value="">Select range</option>
                  {PARTICIPANT_BANDS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </BaseSelect>
              </Required>
            </FieldRow>
          </FormSection>
        </section>
      )}

      {/* ---------- STEP 2: Ethical Considerations ---------- */}
      {currentStep === 1 && (
        <section className="flex flex-col gap-6">
          <StepHeader index={2} title="Ethical Considerations" />

          <FormSection>
            <FieldRow>
              <Required label="Does your research involve human participants or human subjects? *">
                <BaseSelect
                  value={form.involveHumanParticipants}
                  onChange={onFieldChange("involveHumanParticipants")}
                >
                  <option value="">Select</option>
                  <option>Yes</option>
                  <option>No</option>
                </BaseSelect>
              </Required>
              <Required label="Will any personally identifiable information be collected? *">
                <BaseSelect
                  value={form.collectPii}
                  onChange={onFieldChange("collectPii")}
                >
                  <option value="">Select</option>
                  <option>Yes</option>
                  <option>No</option>
                </BaseSelect>
              </Required>
            </FieldRow>

            {form.collectPii === "Yes" && (
              <ConditionalCallout className="mt-4">
                <BaseTextarea
                  value={form.piiTypes}
                  onChange={onFieldChange("piiTypes")}
                  rows={2}
                  placeholder="PII Types (Name, Email, ID, MRN, Audio/Video, Other)"
                />
              </ConditionalCallout>
            )}
          </FormSection>

          <FormSection title="Recruitment">
            <Required
              label="How will participants be recruited? (multi-select) *"
              kind="selection"
            >
              <CheckboxGroup
                options={RECRUITMENT_CHANNELS}
                checkedFn={(item) => hasCsvOption("recruitmentChannels", item)}
                toggleFn={(item) => toggleCsvOption("recruitmentChannels", item)}
              />
            </Required>
          </FormSection>

          <FormSection title="Consent & Data Collection Approval">
            <FieldRow>
              <Required label="Will participants provide informed consent? *">
                <BaseSelect
                  value={form.informedConsentType}
                  onChange={onFieldChange("informedConsentType")}
                >
                  <option value="">Select</option>
                  {INFORMED_CONSENT_OPTIONS.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </BaseSelect>
              </Required>
              <Required label="Have any research data been collected prior to receiving ethical approval? *">
                <BaseSelect
                  value={form.preApprovalDataCollected}
                  onChange={onFieldChange("preApprovalDataCollected")}
                >
                  <option value="">Select</option>
                  <option>Yes</option>
                  <option>No</option>
                </BaseSelect>
              </Required>
            </FieldRow>

            {form.preApprovalDataCollected === "Yes" && (
              <WarnNote className="mt-4">
                Note: Please attach the participant information letter (cover letter) and
                participant consent form in the attachments section.
              </WarnNote>
            )}
          </FormSection>

          <FormSection title="Participation Conditions">
            <FieldRow>
              <Required label="Can participants withdraw from the study at any time? *">
                <BaseSelect
                  value={form.canWithdraw}
                  onChange={onFieldChange("canWithdraw")}
                >
                  <option value="">Select</option>
                  <option>Yes</option>
                  <option>No</option>
                </BaseSelect>
              </Required>
              <Required label="Will participants receive any compensation? *">
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

          <FormSection title="Confidentiality & Data Privacy">
            <Required
              label="How will you ensure participant confidentiality and data privacy? (multi-select) *"
              kind="selection"
            >
              <CheckboxGroup
                options={CONFIDENTIALITY_OPTIONS}
                checkedFn={(item) => hasCsvOption("confidentialityOptions", item)}
                toggleFn={(item) => toggleCsvOption("confidentialityOptions", item)}
                columns={1}
              />
            </Required>
            {hasCsvOption("confidentialityOptions", "Others") && (
              <ConditionalCallout className="mt-4">
                <BaseInput
                  value={form.confidentialityOtherDetails}
                  onChange={onFieldChange("confidentialityOtherDetails")}
                  placeholder="Others, please specify"
                />
              </ConditionalCallout>
            )}
          </FormSection>

          <FormSection title="Vulnerable Populations">
            <Required label="Does your research involve any vulnerable populations (children under 18, elderly, persons with disabilities, economically disadvantaged individuals, individuals engaged in criminal activities, individuals in care homes, individuals impacted by trauma such as disasters, war, abuse, etc.)? *">
              <BaseSelect
                value={form.vulnerablePopulation}
                onChange={onFieldChange("vulnerablePopulation")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>
            {form.vulnerablePopulation === "Yes" && (
              <ConditionalCallout className="mt-4">
                <BaseTextarea
                  value={form.vulnerableSafeguards}
                  onChange={onFieldChange("vulnerableSafeguards")}
                  rows={2}
                  placeholder="If yes, describe special protections and ethical safeguards."
                />
              </ConditionalCallout>
            )}
          </FormSection>

          <FormSection title="Sensitive Topics">
            <Required label="Will your research address sensitive topics (e.g., trauma, abuse, discrimination, stigmatized conditions)? *">
              <BaseSelect
                value={form.sensitiveTopics}
                onChange={onFieldChange("sensitiveTopics")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>
            {form.sensitiveTopics === "Yes" && (
              <ConditionalCallout className="mt-4 flex flex-col gap-3">
                <Required
                  label="If yes, select all applicable sensitive topics *"
                  kind="selection"
                >
                  <CheckboxGroup
                    options={SENSITIVE_TOPIC_TYPES}
                    checkedFn={(item) => hasCsvOption("sensitiveTopicTypes", item)}
                    toggleFn={(item) => toggleCsvOption("sensitiveTopicTypes", item)}
                  />
                </Required>
                {hasCsvOption("sensitiveTopicTypes", "Others") && (
                  <Required label="Others, please specify *">
                    <BaseInput
                      value={form.sensitiveTopicOtherDetails}
                      onChange={onFieldChange("sensitiveTopicOtherDetails")}
                      placeholder="Others, please specify"
                    />
                  </Required>
                )}
              </ConditionalCallout>
            )}
          </FormSection>

          <FormSection title="Risks & Adverse Effects">
            <Required label="Does your research have any potential adverse effects or risks (such as environmental, physical, psychological, social, legal)? *">
              <BaseSelect
                value={form.potentialRisks}
                onChange={onFieldChange("potentialRisks")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>
            {form.potentialRisks === "Yes" && (
              <ConditionalCallout className="mt-4">
                <Required label="If yes, further elaborate. *">
                  <BaseTextarea
                    value={form.potentialRiskDetails}
                    onChange={onFieldChange("potentialRiskDetails")}
                    rows={2}
                    placeholder="If yes, further elaborate."
                  />
                </Required>
              </ConditionalCallout>
            )}
          </FormSection>

          <FormSection title="Data Retention">
            <Required label="How long will personal data be retained? Please select the estimated time. *">
              <BaseSelect
                value={form.dataRetentionYears}
                onChange={onFieldChange("dataRetentionYears")}
              >
                <option value="">Select</option>
                {DATA_RETENTION_OPTIONS.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </BaseSelect>
            </Required>
            {form.dataRetentionYears === "More than 16 years" && (
              <ConditionalCallout className="mt-4">
                <Required label="If More than 16 years is selected, explain why longer retention is needed. *">
                  <BaseTextarea
                    value={form.longRetentionReason}
                    onChange={onFieldChange("longRetentionReason")}
                    rows={2}
                    placeholder="If More than 16 years is selected, explain why longer retention is needed."
                  />
                </Required>
              </ConditionalCallout>
            )}
          </FormSection>

          <FormSection title="Conflict of Interest">
            <Required label="Do you have any real or perceived conflict of interest that could bias the research? *">
              <BaseSelect
                value={form.conflictOfInterest}
                onChange={onFieldChange("conflictOfInterest")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
                <option>Undecided</option>
              </BaseSelect>
            </Required>
            {form.conflictOfInterest === "Yes" && (
              <ConditionalCallout className="mt-4">
                <Required label="If yes, explain and describe how it will be managed. *">
                  <BaseTextarea
                    value={form.conflictManagement}
                    onChange={onFieldChange("conflictManagement")}
                    rows={2}
                    placeholder="If yes, explain and describe how it will be managed."
                  />
                </Required>
              </ConditionalCallout>
            )}
          </FormSection>

          <FormSection title="Records Access">
            <Required label="Will your research involve accessing personal or institutional records without consent? *">
              <BaseSelect
                value={form.recordsWithoutConsent}
                onChange={onFieldChange("recordsWithoutConsent")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>
            {form.recordsWithoutConsent === "Yes" && (
              <ConditionalCallout className="mt-4">
                <Required label="If yes, justify and provide institutional approval documentation. *">
                  <BaseTextarea
                    value={form.recordsWithoutConsentJustification}
                    onChange={onFieldChange("recordsWithoutConsentJustification")}
                    rows={2}
                    placeholder="If yes, justify and provide institutional approval documentation."
                  />
                </Required>
              </ConditionalCallout>
            )}
          </FormSection>
        </section>
      )}

      {/* ---------- STEP 3: Institutional Approvals & Collaboration ---------- */}
      {currentStep === 2 && (
        <section className="flex flex-col gap-6">
          <StepHeader
            index={3}
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
              <Required label="Does your research involve an international collaboration? *">
                <BaseSelect
                  value={form.internationalCollaboration}
                  onChange={onFieldChange("internationalCollaboration")}
                >
                  <option value="">Select</option>
                  <option>Yes</option>
                  <option>No</option>
                </BaseSelect>
              </Required>
              <Required label="Conducted abroad? *">
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

            {form.conductedAbroad === "Yes" && (
              <WarnNote className="mt-4">
                Note: If yes, the concerned institute&apos;s ethical approval form must be
                attached in the concerned section.
              </WarnNote>
            )}

            {form.internationalCollaboration === "Yes" && (
              <ConditionalCallout className="mt-4">
                <BaseTextarea
                  value={form.internationalCollaborationDetails}
                  onChange={onFieldChange("internationalCollaborationDetails")}
                  rows={4}
                  placeholder="If yes, give international collaboration details (if not provided in Step 1)."
                />
              </ConditionalCallout>
            )}
          </FormSection>
        </section>
      )}

      {/* ---------- STEP 4: Required Attachments ---------- */}
      {currentStep === 3 && (
        <section className="flex flex-col gap-6">
          <StepHeader index={4} title="Required Attachments" required />
          <p className="text-sm text-body dark:text-dark-6">
            Please attach the following documents (check all that apply):
          </p>

          <div className="flex flex-col gap-3">
            {FORM_1_REQUIRED_ATTACHMENTS.map((item) => (
              <AttachmentCard
                key={item}
                label={item}
                isMandatory={FORM_1_MANDATORY_ATTACHMENT_SET.has(item)}
                isChecked={hasCsvOption("requiredAttachments", item)}
                onToggle={() => toggleCsvOption("requiredAttachments", item)}
                fileName={attachmentFiles[item]}
                onUpload={handleRequiredAttachmentUpload(item)}
              />
            ))}
          </div>

          <FormSection
            title="Additional Documents"
            className="border-dashed"
          >
            <div className="mb-3 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setExtraUploadFiles((prev) => [...prev, ""])}
                className="inline-flex size-8 items-center justify-center rounded-full border border-primary text-lg font-bold text-primary transition hover:bg-primary/10"
                aria-label="Add additional upload"
              >
                +
              </button>
            </div>
            <div className="grid gap-3">
              {extraUploadFiles.map((fileName, index) => (
                <ExtraUploadCard
                  key={`${index}-extra-upload`}
                  index={index}
                  fileName={fileName}
                  onUpload={handleExtraUploadChange(index)}
                />
              ))}
            </div>
          </FormSection>
        </section>
      )}

      {/* ---------- STEP 5: Declaration and Submission ---------- */}
      {currentStep === 4 && (
        <section className="flex flex-col gap-6">
          <StepHeader index={5} title="Declaration and Submission" required />

          <DeclarationCheckbox
            checked={form.declarationAccepted === "yes"}
            onChange={(checked) => {
              setForm((prev) => {
                const name =
                  prev.scholarName.trim() ||
                  prev.applicantName.trim() ||
                  "_____________________";
                return {
                  ...prev,
                  declarationAccepted: checked ? "yes" : "",
                  declaration: checked
                    ? buildMedicalEthicsDeclarationParagraph(name)
                    : "",
                };
              });
              onClearSubmitError?.();
            }}
          >
            I <span className="font-semibold">{declarationName}</span> hereby certify that:
            I have read and understood the ethical guidelines for medical and health
            sciences research. The information provided in this application is accurate
            and complete to the best of my knowledge. I will conduct this research
            strictly according to the approved protocol. I will report all adverse events
            and protocol deviations to my supervisor and the IREB immediately. I will
            obtain updated approvals if any significant changes to the protocol are
            necessary. I will not proceed with data collection without formal ethical
            approval.
            <RequiredMark />
          </DeclarationCheckbox>
        </section>
      )}
    </div>
  );
}
