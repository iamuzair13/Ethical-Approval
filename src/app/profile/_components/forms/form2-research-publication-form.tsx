"use client";

import type { CommonFormProps } from "./form-stepper-types";
import { CoPersonSection } from "./co-person-section";
import { ResearchObjectiveSection } from "./research-objective-section";
import { ResearchPopulationBox } from "./research-population-box";
import { SdgCheckboxDropdown } from "./sdg-checkbox-dropdown";
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
  /** Optional — tick and upload only when applicable to your study. */
  "Participant Consent Form (Qualitative and mix-methods research with selective participations)",
  "Other Instituittional Approval Letter(s) (if applicable)",
];

/** Only questionnaire is mandatory; consent and other-institutional rows are optional. */
const FORM_2_MANDATORY_ATTACHMENTS = [FORM_2_REQUIRED_ATTACHMENTS[0]] as const;

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

        <CoPersonSection
          title="1.2 Co-Author"
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

            <FieldGroup
              label="Please select relevant Sustainable Development Goals (multiple select)"
              required
              fullWidth
            >
              <Required
                label="Please select relevant Sustainable Development Goals (multiple select) *"
                kind="selection"
              >
                <SdgCheckboxDropdown
                  isChecked={(value) => hasCsvOption("sdgs", value)}
                  onToggle={(value) => toggleCsvOption("sdgs", value)}
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
                label="Select Research Population (You may select multiple) *"
                kind="selection"
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
            label="2.2 Recruitment channels (You may select multiple)"
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

            <FieldGroup label="2.7 Confidentiality options (You may select multiple)" fullWidth>
              <Required label="2.7 Confidentiality options (You may select multiple)">
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

            <FieldGroup label="3.2 Has your research received external funding?">
              <Required label="3.2 Has your research received external funding?">
                <SimpleSelect
                  value={form.externalFunding}
                  onChange={onValueChange("externalFunding")}
                  options={["Yes", "No"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>

            {form.externalFunding === "Yes" && (
              <FieldGroup
                label="Specify external funding source"
                fullWidth
              >
                  <BaseInput
                    value={form.externalFundingSource}
                    onChange={onFieldChange("externalFundingSource")}
                    placeholder="Name of funding agency, grant, sponsor, etc."
                  />
              </FieldGroup>
            )}

            <FieldGroup label="3.3 International collaboration?">
              <Required label="3.3 Does your research involve an international collaboration?">
                <SimpleSelect
                  value={form.internationalCollaboration}
                  onChange={onValueChange("internationalCollaboration")}
                  options={["Yes", "No"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="3.4 Will any part of data be collected from overseas/abroad?">
              <Required label="3.4 Will any part of data be collected from overseas/abroad?">
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
