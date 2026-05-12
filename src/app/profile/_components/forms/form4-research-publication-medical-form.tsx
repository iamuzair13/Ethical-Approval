"use client";

import type { CommonFormProps } from "./form-stepper-types";
import { CoPersonSection } from "./co-person-section";
import { ResearchObjectiveSection } from "./research-objective-section";
import { ResearchPopulationBox } from "./research-population-box";
import { SdgCheckboxDropdown } from "./sdg-checkbox-dropdown";
import {
  allInlineRequiredProps,
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
  RequiredFieldsBanner,
  RequiredMark,
  StepHeader,
  WarnNote,
} from "./form-ui";

/** Step 5 — rows 1 and 3 require checkbox + upload; rows 2 and 4 optional */
export const FORM_4_REQUIRED_ATTACHMENTS = [
  "Questionnaire/Interview Guide",
  "Participant Consent Form",
  "Other Institutional Approval Letter(s) (If applicable)",
] as const;

export const FORM_4_MANDATORY_ATTACHMENT_LABELS: readonly string[] = [
  FORM_4_REQUIRED_ATTACHMENTS[0],
  FORM_4_REQUIRED_ATTACHMENTS[2],
];

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

          <FormSection title="External researcher in team?">
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
              <Required label="Sustainable Development Goals (multi-select) *" className="md:col-span-2 w-full">
                <SdgCheckboxDropdown
                  isChecked={(value) => hasCsvOption("sdgs", value)}
                  onToggle={(value) => toggleCsvOption("sdgs", value)}
                />
              </Required>
              <Required
                label="Select Research Population (You may select multiple) *"
                kind="selection"
                className="md:col-span-2 w-full"
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
              <Required label="How many participant will you be recruiting? (Estimated Number) *" className="md:col-span-2 w-full">
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
             
              <Required label="Study Design and Methodology *" className="md:col-span-2 w-full">
                <BaseTextarea
                  value={form.publicationMethodology}
                  onChange={onFieldChange("publicationMethodology")}
                  rows={4}
                  placeholder="Describe"
                />
              </Required>
            </FieldRow>
          </FormSection>
        </section>
      )}

      {currentStep === 1 && (
        <section className="flex flex-col gap-6">
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

            <Required label="How will participants be recruited? (You may select multiple)" className="mt-4 w-full">
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
                    If &apos;Yes&apos;, confirm and describe how appropriate ethical protections were in place.
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
              label="If yes to the above question, has approval from the concerned ethics committee been obtained? *"
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
        <section className="flex flex-col gap-6">
          <StepHeader index={3} title="Data Integrity and Permissions" />

          <FormSection>
            <Required label="3.1 Will the data be presented accurately and completely in the manuscript? *" className="mt-4 w-full">
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
            </Required>

            

            

            <div className="mt-4 flex flex-col gap-2 md:col-span-2">
              <label htmlFor="f4-s3-q04" className="text-sm font-medium text-dark dark:text-white">
                3.2 Are there any third-party copyrights or permissions required (figures, tables,
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
        <section className="flex flex-col gap-6">
          <StepHeader index={4} title="Institutional Approvals & Collaboration" />

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
              {form.externalFunding === "Yes" && (
                <FieldGroup
                  label="Specify external funding source *"
                  className="md:col-span-2"
                >
                  <BaseInput
                    value={form.externalFundingSource}
                    onChange={onFieldChange("externalFundingSource")}
                    placeholder="Name of funding agency, grant, sponsor, etc."
                  />
                </FieldGroup>
              )}
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
              {form.internationalCollaboration === "Yes" && (
                <Required
                  label="Provide collaboration details *"
                  className="md:col-span-2"
                >
                  <BaseTextarea
                    value={form.internationalCollaborationDetails}
                    onChange={onFieldChange("internationalCollaborationDetails")}
                    rows={3}
                    placeholder="Enter Details"
                  />
                </Required>
              )}
              <Required label="Will your research, or a part of it, be conducted overseas/abroad? *">
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
