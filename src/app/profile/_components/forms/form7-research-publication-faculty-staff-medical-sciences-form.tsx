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
  ConditionalCallout,
  DeclarationCheckbox,
  FieldGroup,
  FieldRow,
  FormSection,
  InfoNote,
  RadioTileGroup,
  ReadOnlyInput,
  StepHeader,
} from "./form-ui";

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

const REQUIRED_ATTACHMENTS = [
  "Questionnaire/Interview Guide",
  "Participant Consent Form",
  "Other Institutional Approval Letter(s) (If applicable)",
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

function buildMedicalFacultyPublicationDeclaration(name: string): string {
  return `I/We ${name} hereby certify that: this manuscript is original, not previously published in any form. All research involving human subjects was conducted with appropriate ethical approval from the relevant departments. All participant/patient identities are adequately protected and anonymized where required. All funding sources, conflicts of interest, and potential biases have been fully disclosed. The manuscript accurately and completely reports all methods, results, and adverse events. The manuscript adheres to established ethical guidelines for responsible reporting in medical research. All authors have reviewed and approved this manuscript and agree with its content. No portion of this work has been plagiarized or previously published without proper attribution.`;
}

export function Form7ResearchPublicationFacultyStaffMedicalSciencesForm({
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
        <StepHeader
          index={1}
          title="Scholar's Information"
          required
          subtitle="Ethical Review Form — Research Publication (for Faculty/Staff of Medical Sciences)"
        />

        <FormSection title="1.1 Scholar Profile">
          <FieldRow>
            <ReadOnlyInput value={form.scholarName} placeholder="Scholar's Name (Auto fetch)" />
            <ReadOnlyInput value={form.scholarSapId} placeholder="SAP ID/Reg. No (Auto fetch)" />
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

        <FormSection title="1.3 Research Details">
          <FieldRow>
            <Required label="a) Research Title *" className="md:col-span-2">
              <BaseInput
                value={form.publicationTitle}
                onChange={onFieldChange("publicationTitle")}
              />
            </Required>

            <ResearchObjectiveSection
              defaultKeys={[
                "publicationObjective1",
                "publicationObjective2",
                "publicationObjective3",
              ]}
              extrasKey="publicationObjectivesExtras"
              requiredCount={3}
              labelPrefix="b) Research Objectives"
              form={form}
              setForm={setForm}
              onFieldChange={onFieldChange}
            />

            <Required
              label="c) Sustainable Development Goals (You may select multiple) *"
              kind="selection"
              className="md:col-span-2"
            >
              <p className="mb-2 text-sm font-semibold text-dark dark:text-white">
                c) Please select relevant Sustainable Development Goals (multiple
                options can also be selected) as per your research:
              </p>
              <SdgCheckboxDropdown
                isChecked={(value) => hasCsvOption("sdgs", value)}
                onToggle={(value) => toggleCsvOption("sdgs", value)}
              />
            </Required>

            <Required label="d) How many participants will you be recruiting? *">
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
              label="e) Select Research Population (You may select multiple) *"
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

            <Required label="f) Study Design and Methodology *" className="md:col-span-2">
              <BaseTextarea
                value={form.publicationMethodology}
                onChange={onFieldChange("publicationMethodology")}
                rows={5}
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
        <StepHeader index={2} title="Ethical Considerations" required />

        <FormSection title="Human Subjects, Recruitment & Consent">
          <Required
            label="2.1 Does the article report findings from research involving human subjects? *"
            kind="radio"
          >
            <RadioTileGroup
              name="pubMedicalHumanSubjects"
              value={form.publicationHumanSubjects}
              onChange={(v) =>
                setForm((p) => ({ ...p, publicationHumanSubjects: v }))
              }
              options={["Yes", "No"]}
            />
          </Required>

          <Required
            label="2.2 How will participants be recruited? (You may select multiple) *"
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

          <Required
            label="2.3 Did the research obtain informed consent from participants/patients? *"
            className="mt-4"
          >
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
            <InfoNote className="mt-2">
              Note: Provide attach the consent form (as per UOL format) in the
              concerned section [Link of the Form].
            </InfoNote>
          </Required>

          <Required
            label="2.4 Have any research data been collected prior to receiving ethical approval? *"
            className="mt-4"
          >
            <BaseSelect
              value={form.publicationPreApprovalDataCollected}
              onChange={onFieldChange("publicationPreApprovalDataCollected")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
              <option>Not applicable</option>
            </BaseSelect>
            <InfoNote className="mt-2">
              Note: If &lsquo;yes&rsquo; is selected, please attach the participant
              information letter (cover letter) and participant consent form.
            </InfoNote>
          </Required>
        </FormSection>

        <FormSection title="Withdrawal, Compensation & Anonymization">
          <FieldRow>
            <Required
              label="2.5 Can participants withdraw from the study at any time? *"
              kind="radio"
            >
              <RadioTileGroup
                name="pubMedicalWithdraw"
                value={form.publicationCanWithdraw}
                onChange={(v) =>
                  setForm((p) => ({ ...p, publicationCanWithdraw: v }))
                }
                options={["Yes", "No"]}
              />
            </Required>

            <Required
              label="2.6 Will participants receive any compensation? *"
              kind="radio"
            >
              <RadioTileGroup
                name="pubMedicalComp"
                value={form.publicationCompensation}
                onChange={(v) =>
                  setForm((p) => ({ ...p, publicationCompensation: v }))
                }
                options={["Yes", "No"]}
              />
            </Required>
          </FieldRow>

          <Required
            label="2.7 Are all patient/participant identities adequately anonymized or de-identified in the manuscript? *"
            className="mt-4"
          >
            <BaseSelect
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
        </FormSection>

        <FormSection title="Sensitive Topics, Vulnerable Populations & Specimens">
          <Required
            label="2.8 Does the manuscript address sensitive health topics? *"
            kind="radio"
          >
            <RadioTileGroup
              name="pubMedicalSensitive"
              value={form.publicationSensitiveHealthTopics}
              onChange={(v) =>
                setForm((p) => ({ ...p, publicationSensitiveHealthTopics: v }))
              }
              options={["Yes", "No"]}
            />
          </Required>

          <Required
            label="2.9 Does the article involve vulnerable patient populations? *"
            className="mt-4"
          >
            <BaseSelect
              value={form.publicationVulnerablePopulation}
              onChange={onFieldChange("publicationVulnerablePopulation")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
              <option>N/A</option>
            </BaseSelect>
          </Required>

          <Required
            label="2.10 Will this research involve biological specimens? *"
            className="mt-4"
          >
            <BaseSelect
              value={form.publicationBiologicalSpecimens}
              onChange={onFieldChange("publicationBiologicalSpecimens")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </BaseSelect>
          </Required>

          {form.publicationBiologicalSpecimens === "Yes" && (
            <ConditionalCallout className="mt-3">
              <FieldGroup label="If 'Yes', describe collection, storage, handling and biosafety measures.">
                <BaseTextarea
                  value={form.publicationBiologicalSpecimenDetails}
                  onChange={onFieldChange("publicationBiologicalSpecimenDetails")}
                  rows={3}
                />
              </FieldGroup>
            </ConditionalCallout>
          )}
        </FormSection>

        <FormSection title="Pharmaceutical & Animal Subjects">
          <Required label="2.11 Does the manuscript involve pharmacological or therapeutic interventions? *">
            <BaseSelect
              value={form.publicationPharmaInterventions}
              onChange={onFieldChange("publicationPharmaInterventions")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </BaseSelect>
            <InfoNote className="mt-2">
              If &apos;Yes&apos;, verify drug names, dosages, and adverse effects are
              accurately reported. Also attach the approval for pharmaceutical
              substance use.
            </InfoNote>
          </Required>
          {form.publicationPharmaInterventions === "Yes" && (
            <ConditionalCallout className="mt-3">
              <FieldGroup label="2.11 Intervention details *">
                <BaseTextarea
                  value={form.publicationPharmaInterventionDetails}
                  onChange={onFieldChange("publicationPharmaInterventionDetails")}
                  rows={3}
                />
              </FieldGroup>
            </ConditionalCallout>
          )}

          <Required
            label="2.12 Will animal subjects be used in this research? *"
            className="mt-4"
          >
            <BaseSelect
              value={form.publicationAnimalSubjects}
              onChange={onFieldChange("publicationAnimalSubjects")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </BaseSelect>
          </Required>
          {form.publicationAnimalSubjects === "Yes" && (
            <ConditionalCallout className="mt-3">
              <FieldGroup label="If 'Yes', justify use and describe animal care/welfare measures.">
                <BaseTextarea
                  value={form.publicationAnimalWelfareDetails}
                  onChange={onFieldChange("publicationAnimalWelfareDetails")}
                  rows={3}
                />
              </FieldGroup>
            </ConditionalCallout>
          )}

          <Required
            label="2.13 If yes to 2.12, has approval from the concerned ethics committee been obtained? *"
            className="mt-4"
          >
            <BaseSelect
              value={form.publicationAnimalEthicsApproval}
              onChange={onFieldChange("publicationAnimalEthicsApproval")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
              <option>Pending</option>
              <option>Not Applicable</option>
            </BaseSelect>
            <InfoNote className="mt-2">
              Note: Please attach the approval letter in the required attachments
              section.
            </InfoNote>
          </Required>
        </FormSection>

        <FormSection title="Conflicts, Risks & Submission History">
          <Required label="2.14 Are there any undisclosed conflicts of interest or funding sources? *">
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
              <FieldGroup label="If 'Yes', provide complete disclosure.">
                <BaseTextarea
                  value={form.publicationConflictDisclosureDetails}
                  onChange={onFieldChange("publicationConflictDisclosureDetails")}
                  rows={3}
                />
              </FieldGroup>
            </ConditionalCallout>
          )}

          <FieldGroup
            label="2.15 If applicable, identify all potential risks and adverse effects (physical, psychological, social, legal):"
            className="mt-4"
          >
            <BaseTextarea
              value={form.publicationPotentialRisks}
              onChange={onFieldChange("publicationPotentialRisks")}
              rows={3}
            />
          </FieldGroup>

          <Required
            label="2.16 Is this manuscript being submitted simultaneously to multiple journals? *"
            className="mt-4"
          >
            <BaseSelect
              value={form.publicationSimultaneousJournals}
              onChange={onFieldChange("publicationSimultaneousJournals")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </BaseSelect>
          </Required>

          <Required
            label="2.17 Has this research (or substantially similar research) been previously published? *"
            className="mt-4"
          >
            <BaseSelect
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
    );
  }

  /* ---------- STEP 2: Data Integrity and Permissions ---------- */
  if (currentStep === 2) {
    return (
      <section className="flex flex-col gap-6">
        <StepHeader index={3} title="Data Integrity and Permissions" required />

        <FormSection>
          <Required label="3.1 Will the data be presented accurately and completely in the manuscript? *">
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

          <Required
            label="3.2 Does the article follow relevant reporting guidelines (CONSORT, STROBE, PRISMA, etc.)? *"
            className="mt-4"
          >
            <BaseSelect
              value={form.publicationReportingGuidelines}
              onChange={onFieldChange("publicationReportingGuidelines")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
              <option>Not applicable</option>
            </BaseSelect>
          </Required>

          <Required
            label="3.3 Have all adverse events and safety data been accurately reported? *"
            className="mt-4"
          >
            <BaseSelect
              value={form.publicationAdverseEventsReported}
              onChange={onFieldChange("publicationAdverseEventsReported")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
              <option>Not applicable</option>
            </BaseSelect>
          </Required>

          <Required
            label="3.4 Are there any third-party copyrights or permissions required? *"
            className="mt-4"
          >
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
              <FieldGroup label="If 'Yes', confirm permissions have been obtained and documented.">
                <BaseTextarea
                  value={form.publicationThirdPartyPermissionDetails}
                  onChange={onFieldChange("publicationThirdPartyPermissionDetails")}
                  rows={3}
                />
              </FieldGroup>
            </ConditionalCallout>
          )}
        </FormSection>
      </section>
    );
  }

  /* ---------- STEP 3: Institutional Approvals ---------- */
  if (currentStep === 3) {
    return (
      <section className="flex flex-col gap-6">
        <StepHeader
          index={4}
          title="Institutional Approvals & Collaboration"
          required
        />

        <FormSection title="Funding & Collaboration">
          <FieldRow>
            <Required label="4.1 Has your research received institutional funding? *">
              <BaseSelect
                value={form.institutionalFunding}
                onChange={onFieldChange("institutionalFunding")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>

            <Required label="4.2 Has your research received external funding? *">
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
              label="Specify external funding source"
              className="mt-4"
            >
              <BaseInput
                value={form.externalFundingSource}
                onChange={onFieldChange("externalFundingSource")}
                placeholder="Name of funding agency, grant, sponsor, etc."
              />
            </FieldGroup>
          )}

          <Required
            label="4.3 Does your research involve an international collaboration? *"
            className="mt-4"
          >
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
            <ConditionalCallout className="mt-3">
              <FieldGroup label="If yes, give details (if not provided during step 1) *">
                <BaseTextarea
                  value={form.internationalCollaborationDetails}
                  onChange={onFieldChange("internationalCollaborationDetails")}
                  rows={3}
                />
              </FieldGroup>
            </ConditionalCallout>
          )}

          <Required
            label="4.4 Will your research, or a part of it, be conducted overseas/abroad? *"
            className="mt-4"
          >
            <BaseSelect
              value={form.conductedAbroad}
              onChange={onFieldChange("conductedAbroad")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </BaseSelect>
            <InfoNote className="mt-2">
              Note: If yes, the concerned institute&apos;s ethical approval form must
              be attached in the concerned section.
            </InfoNote>
          </Required>
        </FormSection>
      </section>
    );
  }

  /* ---------- STEP 4: Required Attachments ---------- */
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

  /* ---------- STEP 5: Declaration ---------- */
  return (
    <section className="flex flex-col gap-6">
      <StepHeader index={6} title="Declaration and Submission" required />

      <DeclarationCheckbox
        checked={form.form3DeclarationAccepted === "yes"}
        onChange={(checked) => {
          setForm((prev) => {
            const declarationName =
              prev.scholarName.trim() ||
              prev.applicantName.trim() ||
              "_____________________";
            return {
              ...prev,
              form3DeclarationAccepted: checked ? "yes" : "",
              declaration: checked
                ? buildMedicalFacultyPublicationDeclaration(declarationName)
                : "",
            };
          });
        }}
      >
        {buildMedicalFacultyPublicationDeclaration(
          form.scholarName.trim() ||
            form.applicantName.trim() ||
            "_____________________",
        )}
      </DeclarationCheckbox>
    </section>
  );
}
