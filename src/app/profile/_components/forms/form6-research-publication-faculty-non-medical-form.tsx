"use client";

import type { CommonFormProps } from "./form-stepper-types";
import { Required } from "./required";
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
  "Participant Information Letter Only",
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

        {/* 1.2 Co-Author 1 */}
        <FormSection
          title="1.2 Co-Authors' Information"
          subtitle="Provide co-author details (optional)."
        >
          <Required label="Please select:">
            <BaseSelect
              value={form.publicationCoAuthor1Type}
              onChange={onFieldChange("publicationCoAuthor1Type")}
              className="max-w-xs"
            >
              <option value="UOL">Option 1: UOL</option>
              <option value="External">Option 2: External</option>
            </BaseSelect>
          </Required>

          <FieldRow className="mt-4">
            {form.publicationCoAuthor1Type === "UOL" ? (
              <>
                <Required label="Co-Author SAP ID">
                  <BaseInput
                    value={form.publicationAuthor1UolSapId}
                    onChange={onFieldChange("publicationAuthor1UolSapId")}
                    placeholder="Co-Author SAP ID"
                  />
                </Required>
                <Required label="Co-Author's Name">
                  <BaseInput
                    value={form.publicationAuthor1UolName}
                    onChange={onFieldChange("publicationAuthor1UolName")}
                    placeholder="Co-Author's Name"
                  />
                </Required>
                <Required label="Email">
                  <BaseInput
                    value={form.publicationAuthor1UolEmail}
                    onChange={onFieldChange("publicationAuthor1UolEmail")}
                    placeholder="Email"
                  />
                </Required>
                <Required label="Faculty">
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
                </Required>
                <Required label="Department" className="md:col-span-2">
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
                </Required>
              </>
            ) : (
              <>
                <Required label="Co-Author's Name">
                  <BaseInput
                    value={form.publicationAuthor1ExternalName}
                    onChange={onFieldChange("publicationAuthor1ExternalName")}
                    placeholder="Co-Author's Name"
                  />
                </Required>
                <Required label="Email">
                  <BaseInput
                    value={form.publicationAuthor1ExternalEmail}
                    onChange={onFieldChange("publicationAuthor1ExternalEmail")}
                    placeholder="Email"
                  />
                </Required>
                <Required label="University">
                  <BaseInput
                    value={form.publicationAuthor1ExternalUniversity}
                    onChange={onFieldChange("publicationAuthor1ExternalUniversity")}
                    placeholder="University"
                  />
                </Required>
                <Required label="Faculty">
                  <BaseInput
                    value={form.publicationAuthor1ExternalFaculty}
                    onChange={onFieldChange("publicationAuthor1ExternalFaculty")}
                    placeholder="Faculty"
                  />
                </Required>
                <Required label="Department">
                  <BaseInput
                    value={form.publicationAuthor1ExternalDepartment}
                    onChange={onFieldChange("publicationAuthor1ExternalDepartment")}
                    placeholder="Department"
                  />
                </Required>
              </>
            )}
          </FieldRow>
        </FormSection>

        {/* Co-Author 2 (optional, no Required wrappers) */}
        <FormSection
          title="Add Another Co-Author"
          subtitle="Co-Author #2 (optional)"
        >
          <BaseSelect
            value={form.publicationCoAuthor2Type}
            onChange={onFieldChange("publicationCoAuthor2Type")}
            className="max-w-xs"
          >
            <option value="UOL">Option 1: UOL</option>
            <option value="External">Option 2: External</option>
          </BaseSelect>

          <FieldRow className="mt-4">
            {form.publicationCoAuthor2Type === "UOL" ? (
              <>
                <BaseInput
                  value={form.publicationAuthor2UolSapId}
                  onChange={onFieldChange("publicationAuthor2UolSapId")}
                  placeholder="SAP ID Auto fetch from SAP database"
                />
                <BaseInput
                  value={form.publicationAuthor2UolName}
                  onChange={onFieldChange("publicationAuthor2UolName")}
                  placeholder="Co-Author's Name"
                />
                <BaseInput
                  value={form.publicationAuthor2UolEmail}
                  onChange={onFieldChange("publicationAuthor2UolEmail")}
                  placeholder="Email Auto fetch from SAP database"
                />
                <BaseInput
                  value={form.publicationAuthor2UolFaculty}
                  onChange={onFieldChange("publicationAuthor2UolFaculty")}
                  placeholder="Faculty Auto fetch from SAP database"
                />
                <BaseInput
                  value={form.publicationAuthor2UolDepartment}
                  onChange={onFieldChange("publicationAuthor2UolDepartment")}
                  placeholder="Department Auto fetch from SAP database"
                />
              </>
            ) : (
              <>
                <BaseInput
                  value={form.publicationAuthor2ExternalName}
                  onChange={onFieldChange("publicationAuthor2ExternalName")}
                  placeholder="Co-Author's Name"
                />
                <BaseInput
                  value={form.publicationAuthor2ExternalEmail}
                  onChange={onFieldChange("publicationAuthor2ExternalEmail")}
                  placeholder="Email"
                />
                <BaseInput
                  value={form.publicationAuthor2ExternalUniversity}
                  onChange={onFieldChange("publicationAuthor2ExternalUniversity")}
                  placeholder="University"
                />
                <BaseInput
                  value={form.publicationAuthor2ExternalFaculty}
                  onChange={onFieldChange("publicationAuthor2ExternalFaculty")}
                  placeholder="Faculty"
                />
                <BaseInput
                  value={form.publicationAuthor2ExternalDepartment}
                  onChange={onFieldChange("publicationAuthor2ExternalDepartment")}
                  placeholder="Department"
                />
              </>
            )}
          </FieldRow>
        </FormSection>

        {/* Co-Author 3 (optional) */}
        <FormSection
          title="Add Another Co-Author"
          subtitle="Co-Author #3 (optional)"
        >
          <BaseSelect
            value={form.publicationCoAuthor3Type}
            onChange={onFieldChange("publicationCoAuthor3Type")}
            className="max-w-xs"
          >
            <option value="UOL">Option 1: UOL</option>
            <option value="External">Option 2: External</option>
          </BaseSelect>

          <FieldRow className="mt-4">
            {form.publicationCoAuthor3Type === "UOL" ? (
              <>
                <BaseInput
                  value={form.publicationAuthor3UolSapId}
                  onChange={onFieldChange("publicationAuthor3UolSapId")}
                  placeholder="SAP ID"
                />
                <BaseInput
                  value={form.publicationAuthor3UolName}
                  onChange={onFieldChange("publicationAuthor3UolName")}
                  placeholder="Co-Author's Name"
                />
                <BaseInput
                  value={form.publicationAuthor3UolEmail}
                  onChange={onFieldChange("publicationAuthor3UolEmail")}
                  placeholder="Email"
                />
                <BaseSelect
                  value={form.publicationAuthor3UolFaculty}
                  onChange={onFieldChange("publicationAuthor3UolFaculty")}
                >
                  <option value="">Faculty (Dropdown window)</option>
                  {facultyOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </BaseSelect>
                <BaseSelect
                  value={form.publicationAuthor3UolDepartment}
                  onChange={onFieldChange("publicationAuthor3UolDepartment")}
                  disabled={!form.publicationAuthor3UolFaculty}
                >
                  <option value="">Department (Dropdown window)</option>
                  {getDepartmentsForFaculty(form.publicationAuthor3UolFaculty).map(
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
                  value={form.publicationAuthor3ExternalName}
                  onChange={onFieldChange("publicationAuthor3ExternalName")}
                  placeholder="Co-Author's Name"
                />
                <BaseInput
                  value={form.publicationAuthor3ExternalEmail}
                  onChange={onFieldChange("publicationAuthor3ExternalEmail")}
                  placeholder="Email"
                />
                <BaseInput
                  value={form.publicationAuthor3ExternalUniversity}
                  onChange={onFieldChange("publicationAuthor3ExternalUniversity")}
                  placeholder="University"
                />
                <BaseInput
                  value={form.publicationAuthor3ExternalFaculty}
                  onChange={onFieldChange("publicationAuthor3ExternalFaculty")}
                  placeholder="Faculty"
                />
                <BaseInput
                  value={form.publicationAuthor3ExternalDepartment}
                  onChange={onFieldChange("publicationAuthor3ExternalDepartment")}
                  placeholder="Department"
                />
              </>
            )}
          </FieldRow>
        </FormSection>

        {/* 1.3 Research Details */}
        <FormSection title="1.3 Research Details">
          <FieldRow>
            <Required label="Research Title *" className="md:col-span-2">
              <BaseInput
                value={form.publicationTitle}
                onChange={onFieldChange("publicationTitle")}
                placeholder="a) Research Title (required)"
              />
            </Required>
            <Required label="Research Objective 1 *" className="md:col-span-2">
              <BaseTextarea
                value={form.publicationObjective1}
                onChange={onFieldChange("publicationObjective1")}
                rows={2}
                placeholder="b) Research Objectives (required): 1."
              />
            </Required>
            <Required label="Research Objective 2 *" className="md:col-span-2">
              <BaseTextarea
                value={form.publicationObjective2}
                onChange={onFieldChange("publicationObjective2")}
                rows={2}
                placeholder="2."
              />
            </Required>
            <Required label="Research Objective 3 *" className="md:col-span-2">
              <BaseTextarea
                value={form.publicationObjective3}
                onChange={onFieldChange("publicationObjective3")}
                rows={2}
                placeholder="3."
              />
            </Required>

            <Required
              label="c) Please select relevant Sustainable Development Goals (multiple options can also be selected) as per your research: (required)"
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

            <Required label="Research Methodology *" className="md:col-span-2">
              <BaseTextarea
                value={form.publicationMethodology}
                onChange={onFieldChange("publicationMethodology")}
                rows={4}
                placeholder="d) Research Methodology (Methods and Materials) (required)"
              />
            </Required>

            <Required label="Participants estimate *" className="md:col-span-2">
              <BaseSelect
                value={form.publicationParticipantsEstimate}
                onChange={onFieldChange("publicationParticipantsEstimate")}
              >
                <option value="">
                  e) How many participants will you be recruiting? (required)
                </option>
                {PARTICIPANT_BANDS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </BaseSelect>
            </Required>

            <Required
              label="f) Select Research Population (type) (multiple select)"
              kind="selection"
              className="md:col-span-2"
            >
              <p className="mb-2 text-sm font-semibold text-dark dark:text-white">
                f) Select Research Population (type): (required) (Multiple select)
              </p>
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
              <Required label="2.9 Details for sensitive topics *">
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
              <Required label="2.12 Conflict disclosure details *">
                <BaseTextarea
                  value={form.publicationConflictDisclosureDetails}
                  onChange={onFieldChange("publicationConflictDisclosureDetails")}
                  rows={3}
                  placeholder="If 'Yes', provide full disclosure below."
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
              <Required label="2.13 Risk details *">
                <BaseTextarea
                  value={form.publicationPotentialRisks}
                  onChange={onFieldChange("publicationPotentialRisks")}
                  rows={3}
                  placeholder="If yes, further elaborate."
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
              <Required label="2.14 Third-party permission details *">
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
            <Required label="3.2 Has your research received external funding? *">
              <BaseSelect
                value={form.externalFunding}
                onChange={onFieldChange("externalFunding")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>

            <Required label="3.3 Does your research involve an international collaboration? *">
              <BaseSelect
                value={form.internationalCollaboration}
                onChange={onFieldChange("internationalCollaboration")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>
            <Required label="3.4 Will your research be conducted overseas/abroad? *">
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
              <Required label="3.3 International collaboration details *">
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
