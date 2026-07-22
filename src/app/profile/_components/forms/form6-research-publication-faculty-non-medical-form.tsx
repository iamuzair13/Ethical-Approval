"use client";

import type { CommonFormProps } from "./form-stepper-types";
import { CoPersonSection } from "./co-person-section";
import { ResearchObjectiveSection } from "./research-objective-section";
import { ResearchPopulationBox } from "./research-population-box";
import { SdgCheckboxDropdown } from "./sdg-checkbox-dropdown";
import { ignoreRequiredValidationProps } from "./form-validation-mark";
import { InformedConsentDocumentSection } from "./informed-consent-document-section";
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
  FORM_6_REQUIRED_ATTACHMENTS[1],
] as const;
const FORM_6_MANDATORY_ATTACHMENT_SET = new Set<string>(FORM_6_MANDATORY_ATTACHMENTS);

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

        <CoPersonSection
          title="1.2 Co-Authors' Information"
          entityLabel="Co-Author"
          form={form}
          setForm={setForm}
          onFieldChange={onFieldChange}
          facultyOptions={facultyOptions}
          getDepartmentsForFaculty={getDepartmentsForFaculty}
          defaultKeys={{
            type: "publicationCoAuthor1Type",
            uol: {
              sapId: "publicationAuthor1UolSapId",
              name: "publicationAuthor1UolName",
              email: "publicationAuthor1UolEmail",
              faculty: "publicationAuthor1UolFaculty",
              department: "publicationAuthor1UolDepartment",
            },
            external: {
              name: "publicationAuthor1ExternalName",
              email: "publicationAuthor1ExternalEmail",
              university: "publicationAuthor1ExternalUniversity",
              faculty: "publicationAuthor1ExternalFaculty",
              department: "publicationAuthor1ExternalDepartment",
            },
          }}
          extraKeysList={[
            {
              type: "publicationCoAuthor2Type",
              uol: {
                sapId: "publicationAuthor2UolSapId",
                name: "publicationAuthor2UolName",
                email: "publicationAuthor2UolEmail",
                faculty: "publicationAuthor2UolFaculty",
                department: "publicationAuthor2UolDepartment",
              },
              external: {
                name: "publicationAuthor2ExternalName",
                email: "publicationAuthor2ExternalEmail",
                university: "publicationAuthor2ExternalUniversity",
                faculty: "publicationAuthor2ExternalFaculty",
                department: "publicationAuthor2ExternalDepartment",
              },
            },
            {
              type: "publicationCoAuthor3Type",
              uol: {
                sapId: "publicationAuthor3UolSapId",
                name: "publicationAuthor3UolName",
                email: "publicationAuthor3UolEmail",
                faculty: "publicationAuthor3UolFaculty",
                department: "publicationAuthor3UolDepartment",
              },
              external: {
                name: "publicationAuthor3ExternalName",
                email: "publicationAuthor3ExternalEmail",
                university: "publicationAuthor3ExternalUniversity",
                faculty: "publicationAuthor3ExternalFaculty",
                department: "publicationAuthor3ExternalDepartment",
              },
            },
          ]}
        />

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
            <ResearchObjectiveSection
              defaultKeys={[
                "publicationObjective1",
                "publicationObjective2",
                "publicationObjective3",
              ]}
              extrasKey="publicationObjectivesExtras"
              requiredCount={2}
              form={form}
              setForm={setForm}
              onFieldChange={onFieldChange}
            />

            <Required
              label="Please select relevant Sustainable Development Goals (You may select multiple) *"
              kind="selection"
              className="md:col-span-2"
            >
              <SdgCheckboxDropdown
                isChecked={(value) => hasCsvOption("sdgs", value)}
                onToggle={(value) => toggleCsvOption("sdgs", value)}
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
              label="f) Select Research Population (You may select multiple) *"
              kind="selection"
              className="md:col-span-2"
            >
              <ResearchPopulationBox
                isChecked={(value) =>
                  hasCsvOption("publicationPopulationType", value)
                }
                onToggle={(value) =>
                  toggleCsvOption("publicationPopulationType", value)
                }
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
            label="2.2 How participants will be recruited? (Select) (You may select multiple)?"
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
          </FieldRow>

          {form.preApprovalDataCollected === "Yes" && (
            <InformedConsentDocumentSection />
          )}

          <FieldRow>
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
              <FieldGroup label="Details for sensitive topics">
                <BaseTextarea
                  value={form.publicationSensitiveTopicsDetails ?? ""}
                  onChange={onFieldChange("publicationSensitiveTopicsDetails")}
                  rows={3}
                  placeholder="If 'Yes', explain how such information is presented responsibly."
                />
              </FieldGroup>
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
              <FieldGroup label="Conflict disclosure details">
                <BaseTextarea
                  value={form.publicationConflictDisclosureDetails}
                  onChange={onFieldChange("publicationConflictDisclosureDetails")}
                  rows={3}
                  placeholder="If 'Yes', describe below."
                />
              </FieldGroup>
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
              <FieldGroup label="Risk details *">
                <BaseTextarea
                  value={form.publicationPotentialRisks}
                  onChange={onFieldChange("publicationPotentialRisks")}
                  rows={3}
                  placeholder="Elaborate..."
                />
              </FieldGroup>
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
              <FieldGroup label="Third-party permission details">
                <BaseTextarea
                  value={form.publicationThirdPartyPermissionDetails}
                  onChange={onFieldChange("publicationThirdPartyPermissionDetails")}
                  rows={3}
                  placeholder="If 'Yes', confirm all permissions have been obtained."
                />
              </FieldGroup>
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

            {form.externalFunding === "Yes" && (
              <FieldGroup
                label="Specify external funding source"
                className="md:col-span-2"
              >
                <BaseInput
                  value={form.externalFundingSource}
                  onChange={onFieldChange("externalFundingSource")}
                  placeholder="Name of funding agency, grant, sponsor, etc."
                />
              </FieldGroup>
            )}

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
              <FieldGroup label="International collaboration details *">
                <BaseTextarea
                  value={form.internationalCollaborationDetails}
                  onChange={onFieldChange("internationalCollaborationDetails")}
                  rows={3}
                  placeholder="If yes, give details (if not provided during step 1)"
                />
              </FieldGroup>
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
