"use client";

import type { ChangeEvent, Dispatch, SetStateAction } from "react";
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
  ExtraUploadCard,
  FieldGroup,
  FieldRow,
  FormSection,
  InfoNote,
  ReadOnlyInput,
  RequiredMark,
  StepHeader,
  SubsectionTitle,
  WarnNote,
} from "./form-ui";

/** Match Step 6 checklist on Form #3 (Medical Sciences). */
export const FORM_3_REQUIRED_ATTACHMENTS = [
  "Complete Research Proposal/Protocol",
  "Research Questionnaire/Interview Guide (i.e., focus group guide)",
  "Participant Information Letter (Cover Letter)",
  "Participant Consent Form",
  "Participant Information Letter Only",
  "Approval from Board of Study (BOS) and Board of Faculty (BOF)",
  "Other Institutional Approval Letter(s) (If applicable)",
] as const;

/** Only these are mandatory in Step 6; all others remain optional. */
export const FORM_3_MANDATORY_ATTACHMENTS = [
  "Complete Research Proposal/Protocol",
  "Research Questionnaire/Interview Guide (i.e., focus group guide)",
  "Participant Information Letter (Cover Letter)",
  "Approval from Board of Study (BOS) and Board of Faculty (BOF)",
] as const;
const FORM_3_MANDATORY_ATTACHMENT_SET = new Set<string>(
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
  "Scientific Research",
  "Applied Health Sciences Research",
  "Clinical/Healthcare research",
  "Inter-disciplinary research",
  "Educational research",
  "Health services evaluation",
  "Laboratory/experimental research",
  "Community/Public Health research",
  "Other (specify in methodology)",
] as const;

const RESEARCH_CLASSIFICATION_OPTIONS = [
  "Clinical trial",
  "Observational study",
  "Cross-sectional study",
  "Educational research (involving humans)",
  "Behavioral/Psychological research",
  "Biomedical research, Epidemiological study",
  "Laboratory-based research",
  "Other (specify in methodology)",
] as const;

const DATA_COLLECTION_OPTIONS = [
  "Interview (one-on-one, semi-structured, structured)",
  "Focus group",
  "Self-completion (questionnaire, dairies, survey apps)",
  "Through observation/field observation",
  "Laboratory experiments",
  "Clinical assessments/patients records review",
  "Biological sample collection (blood, saliva, tissue, etc.)",
  "Diagnostic tools",
  "User testing/Experimental Interventions",
  "Other (specify in methodology)",
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

const VULNERABLE_GROUP_OPTIONS = [
  "Children (under 18)",
  "Pregnant women or nursing mothers",
  "Elderly (65+ or cognitively impaired)",
  "Persons with disabilities",
  "Prisoners or detained individuals",
  "Economically disadvantaged",
  "Not applicable",
  "Other",
] as const;

const DRUG_ROUTE_OPTIONS = [
  "Oral",
  "Intravenous (IV)",
  "Intramuscular (IM)",
  "Topical",
  "Inhalational",
  "Subcutaneous",
  "Other",
  "Not Applicable",
] as const;

const DATA_PROTECTION_OPTIONS = [
  "Anonymization/Pseudonymization",
  "Secure Storage (Electronic/Physical)",
  "Access Restrictions and Confidentiality Agreements",
  "No Disclosure of Identity",
  "Third-Party Agreement",
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

const PII_TYPES = [
  ["piiName", "Name"],
  ["piiEmailPhone", "Email/phone"],
  ["piiStudentEmployeeId", "Student/employee ID"],
  ["piiMedicalRecordNumber", "Medical record number"],
  ["piiAudioVideoRecordings", "Audio/video recordings"],
] as const;

export type Form3ThesisMedicalFormProps = CommonFormProps & {
  extraUploadFiles: string[];
  setExtraUploadFiles: Dispatch<SetStateAction<string[]>>;
  handleExtraUploadChange: (index: number) => (e: ChangeEvent<HTMLInputElement>) => void;
};

export function Form3ThesisMedicalForm({
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
}: Form3ThesisMedicalFormProps) {
  /* ---------- STEP 0: Researcher & Thesis ---------- */
  if (currentStep === 0) {
    return (
      <section className="flex flex-col gap-6">
        <StepHeader
          index={1}
          title="Researcher(s) and Thesis/Project Information"
          subtitle="Students' Thesis/Projects (for Medical Sciences)"
        />

        {/* 1.1 Scholar's Information */}
        <FormSection title="1.1 Scholar's Information">
          <FieldRow>
            <ReadOnlyInput value={form.scholarName} placeholder="Scholar's Name" />
            <ReadOnlyInput value={form.scholarSapId} placeholder="SAP ID / Reg. No." />
            <ReadOnlyInput value={form.scholarEmail} placeholder="Email" />
            <ReadOnlyInput value={form.scholarFaculty} placeholder="Faculty" />
            <ReadOnlyInput value={form.scholarDepartment} placeholder="Department" />
            <ReadOnlyInput value={form.scholarProgram} placeholder="Program" />
          </FieldRow>
        </FormSection>

        {/* 1.2 Supervisor's Information */}
        <FormSection title="1.2 Supervisor(s)'s Information">
          <FieldRow>
            <Required label="Supervisor's SAP ID *">
              <BaseInput
                placeholder="Enter SAP ID"
                value={form.supervisorSapId}
                onChange={onFieldChange("supervisorSapId")}
              />
            </Required>
            <Required label="Supervisor's Name *">
              <BaseInput
                placeholder="Enter Supervisor's Name"
                value={form.supervisorName}
                onChange={onFieldChange("supervisorName")}
              />
            </Required>
            <Required label="Supervisor's Email *">
              <BaseInput
                placeholder="Enter Supervisor's Email"
                value={form.supervisorEmail}
                onChange={onFieldChange("supervisorEmail")}
              />
            </Required>
            <Required label="Faculty">
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
            <Required label="Department" className="md:col-span-2">
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
        <FormSection
          title="1.3 Co-supervisor"
          subtitle="Choose UOL or External and provide their details."
        >
          <BaseSelect
            value={form.coSupervisorType}
            onChange={onFieldChange("coSupervisorType")}
            className="mb-4 max-w-xs"
          >
            <option value="">Select Option</option>
            <option value="UOL">Option 1: UOL</option>
            <option value="External">Option 2: External</option>
          </BaseSelect>

          <FieldRow>
            {form.coSupervisorType === "UOL" ? (
              <>
                <Required label="Co-supervisor SAP ID *">
                  <BaseInput
                    value={form.uolCoSupervisorSapId}
                    onChange={onFieldChange("uolCoSupervisorSapId")}
                    placeholder="SAP ID"
                  />
                </Required>
                <Required label="Co-supervisor's Name *">
                  <BaseInput
                    value={form.uolCoSupervisorName}
                    onChange={onFieldChange("uolCoSupervisorName")}
                    placeholder="Supervisor's Name"
                  />
                </Required>
                <Required label="Co-supervisor's Email *">
                  <BaseInput
                    value={form.uolCoSupervisorEmail}
                    onChange={onFieldChange("uolCoSupervisorEmail")}
                    placeholder="Email"
                  />
                </Required>
                <Required label="Co-supervisor's Faculty *">
                  <BaseSelect
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
                <Required
                  label="Co-supervisor's Department *"
                  className="md:col-span-2"
                >
                  <BaseSelect
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
                <Required label="Co-supervisor's Name">
                  <BaseInput
                    value={form.externalCoSupervisorName}
                    onChange={onFieldChange("externalCoSupervisorName")}
                    placeholder="Co-supervisor's Name"
                  />
                </Required>
                <Required label="Co-supervisor's Reg. No.">
                  <BaseInput
                    value={form.externalCoSupervisorRegNo}
                    onChange={onFieldChange("externalCoSupervisorRegNo")}
                    placeholder="Reg. No."
                  />
                </Required>
                <Required label="Co-supervisor's Email">
                  <BaseInput
                    value={form.externalCoSupervisorEmail}
                    onChange={onFieldChange("externalCoSupervisorEmail")}
                    placeholder="Email"
                  />
                </Required>
                <Required label="Co-supervisor's University">
                  <BaseInput
                    value={form.externalCoSupervisorUniversity}
                    onChange={onFieldChange("externalCoSupervisorUniversity")}
                    placeholder="University"
                  />
                </Required>
                <Required label="Co-supervisor's Faculty">
                  <BaseSelect
                    value={form.externalCoSupervisorFaculty}
                    onChange={onFieldChange("externalCoSupervisorFaculty")}
                  >
                    <option value="">Faculty</option>
                    {facultyOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </BaseSelect>
                </Required>
                <Required
                  label="Co-supervisor's Department"
                  className="md:col-span-2"
                >
                  <BaseSelect
                    value={form.externalCoSupervisorDepartment}
                    onChange={onFieldChange("externalCoSupervisorDepartment")}
                    disabled={!form.externalCoSupervisorFaculty}
                  >
                    <option value="">Department</option>
                    {getDepartmentsForFaculty(form.externalCoSupervisorFaculty).map(
                      (item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ),
                    )}
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
                placeholder="a) Thesis/Project Title"
              />
            </Required>
            <Required label="Research Discipline *" className="md:col-span-2">
              <BaseInput
                value={form.researchDiscipline}
                onChange={onFieldChange("researchDiscipline")}
                placeholder="b) Research Discipline"
              />
            </Required>
            <Required label="Expected Start Date *">
              <BaseInput
                type="date"
                value={form.expectedStartDate}
                onChange={onFieldChange("expectedStartDate")}
                placeholder="c) Expected Start Date"
              />
            </Required>
            <Required label="Expected End Date *">
              <BaseInput
                type="date"
                value={form.expectedEndDate}
                onChange={onFieldChange("expectedEndDate")}
                placeholder="d) Expected End Date"
              />
            </Required>
            <Required label="Research Location(s) *" className="md:col-span-2">
              <BaseInput
                value={form.researchLocations}
                onChange={onFieldChange("researchLocations")}
                placeholder="e) Research Location(s)"
              />
            </Required>
            <FieldGroup label="Funding Source (if applicable)" fullWidth>
              <BaseInput
                value={form.fundingSource}
                onChange={onFieldChange("fundingSource")}
                placeholder="f) Funding Source (if applicable)"
              />
            </FieldGroup>

            <Required label="Research Objective 1 *" className="md:col-span-2">
              <BaseTextarea
                value={form.researchObjective1}
                onChange={onFieldChange("researchObjective1")}
                placeholder="Objective 1"
                rows={2}
              />
            </Required>
            <Required label="Research Objective 2 *" className="md:col-span-2">
              <BaseTextarea
                value={form.researchObjective2}
                onChange={onFieldChange("researchObjective2")}
                placeholder="Objective 2"
                rows={2}
              />
            </Required>
            <FieldGroup label="Research Objective 3" fullWidth>
              <BaseTextarea
                value={form.researchObjective3}
                onChange={onFieldChange("researchObjective3")}
                placeholder="Objective 3"
                rows={2}
              />
            </FieldGroup>
            <FieldGroup label="Research Objective 4" fullWidth>
              <BaseTextarea
                value={form.researchObjective4}
                onChange={onFieldChange("researchObjective4")}
                placeholder="Objective 4"
                rows={2}
              />
            </FieldGroup>

            <Required
              label="Please select relevant Sustainable Development Goals (multiple options can also be selected) as per your research *"
              kind="selection"
              className="md:col-span-2"
            >
              <CheckboxGroup
                options={SDG_OPTIONS}
                checkedFn={(item) => hasCsvOption("sdgs", item)}
                toggleFn={(item) => toggleCsvOption("sdgs", item)}
                columns={2}
              />
            </Required>

            <Required
              label="Purpose of research (multiple) *"
              kind="selection"
              className="md:col-span-2"
            >
              <CheckboxGroup
                options={RESEARCH_PURPOSE_OPTIONS}
                checkedFn={(item) => hasCsvOption("researchPurpose", item)}
                toggleFn={(item) => toggleCsvOption("researchPurpose", item)}
                columns={2}
              />
            </Required>

            <Required
              label="Research Classification (multiple) *"
              kind="selection"
              className="md:col-span-2"
            >
              <CheckboxGroup
                options={RESEARCH_CLASSIFICATION_OPTIONS}
                checkedFn={(item) => hasCsvOption("researchClassification", item)}
                toggleFn={(item) =>
                  toggleCsvOption("researchClassification", item)
                }
                columns={2}
              />
            </Required>

            <Required
              label="Select the chosen method of data collection: (single-select) *"
              kind="selection"
              className="md:col-span-2"
            >
              <div className="grid gap-2">
                {DATA_COLLECTION_OPTIONS.map((item) => {
                  const checked = form.dataCollectionMethod === item;
                  return (
                    <label
                      key={item}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        checked
                          ? "border-primary bg-primary/5 dark:border-primary/50 dark:bg-primary/10"
                          : "border-stroke hover:bg-gray-1 dark:border-dark-3 dark:hover:bg-dark-3"
                      }`}
                    >
                      <input
                        type="radio"
                        name="dataCollectionMethodForm3"
                        checked={checked}
                        onChange={() =>
                          setForm((prev) => ({ ...prev, dataCollectionMethod: item }))
                        }
                        className="h-4 w-4 shrink-0 accent-primary"
                      />
                      <span className="text-sm leading-snug text-dark dark:text-white">
                        {item}
                      </span>
                    </label>
                  );
                })}
              </div>
            </Required>

            <Required
              label="Select Research Population (type) *"
              kind="selection"
              className="md:col-span-2"
            >
              <CheckboxGroup
                options={RESEARCH_POPULATION_OPTIONS}
                checkedFn={(item) => hasCsvOption("researchPopulation", item)}
                toggleFn={(item) => toggleCsvOption("researchPopulation", item)}
                columns={2}
              />
            </Required>

            <Required label="Describe methods and materials *" className="md:col-span-2">
              <BaseTextarea
                value={form.methodology}
                onChange={onFieldChange("methodology")}
                rows={5}
                placeholder="Describe methods and materials"
              />
            </Required>

            <Required
              label="How many participants will you be recruiting? (estimated number) *"
              className="md:col-span-2"
            >
              <BaseSelect
                value={form.participantsEstimate}
                onChange={onFieldChange("participantsEstimate")}
                className="max-w-md"
              >
                <option value="">Select range</option>
                {PARTICIPANT_BANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </BaseSelect>
            </Required>
          </FieldRow>
        </FormSection>
      </section>
    );
  }

  /* ---------- STEP 1: Ethical Considerations ---------- */
  if (currentStep === 1) {
    const togglePii = (
      key:
        | "piiName"
        | "piiEmailPhone"
        | "piiStudentEmployeeId"
        | "piiMedicalRecordNumber"
        | "piiAudioVideoRecordings",
    ) => {
      setForm((prev) => ({ ...prev, [key]: prev[key] === "yes" ? "" : "yes" }));
    };

    return (
      <section className="flex flex-col gap-6">
        <StepHeader index={2} title="Ethical Considerations" />

        {/* Human subjects + PII */}
        <FormSection title="Human Subjects & Personal Information">
          <FieldRow>
            <Required label="Does this research involve human subjects or patients? *">
              <BaseSelect
                value={form.involveHumanParticipants}
                onChange={onFieldChange("involveHumanParticipants")}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </BaseSelect>
            </Required>

            <Required label="Will personally identifiable information be collected? *">
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
              <Required
                label="If Yes, specify the type(s) *"
                kind="selection"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {PII_TYPES.map(([key, label]) => {
                    const checked = form[key] === "yes";
                    return (
                      <label
                        key={key}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                          checked
                            ? "border-primary bg-primary/5 dark:border-primary/50 dark:bg-primary/10"
                            : "border-stroke hover:bg-gray-1 dark:border-dark-3 dark:hover:bg-dark-3"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePii(key)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                        />
                        <span className="text-sm leading-snug text-dark dark:text-white">
                          {label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </Required>
              <Required label="Other: *" className="mt-3">
                <BaseInput
                  value={form.piiOther}
                  onChange={onFieldChange("piiOther")}
                  placeholder="Other"
                />
              </Required>
            </ConditionalCallout>
          )}
        </FormSection>

        {/* Recruitment & Consent */}
        <FormSection title="Recruitment, Consent & Pre-approval Data">
          <Required
            label="How will participants be recruited? *"
            kind="selection"
          >
            <CheckboxGroup
              options={RECRUITMENT_CHANNELS}
              checkedFn={(item) => hasCsvOption("recruitmentChannels", item)}
              toggleFn={(item) => toggleCsvOption("recruitmentChannels", item)}
              columns={2}
            />
          </Required>

          <FieldRow className="mt-4">
            <Required label="Select the type of informed consent *">
              <BaseSelect
                value={form.informedConsentType}
                onChange={onFieldChange("informedConsentType")}
              >
                <option value="">Select</option>
                <option>Written informed consent</option>
                <option>Oral informed consent (with witness)</option>
                <option>Waiver of consent</option>
                <option>Not applicable</option>
              </BaseSelect>
            </Required>

            <Required label="Have any research data been collected prior to ethical approval? *">
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

          <InfoNote className="mt-3">
            Note: Attach the consent form (UOL format) in the Attachments section.
          </InfoNote>
          {form.preApprovalDataCollected === "Yes" && (
            <WarnNote className="mt-2">
              Attach the participant information letter and consent form where applicable.
            </WarnNote>
          )}
        </FormSection>

        {/* Vulnerable, Withdraw, Compensation */}
        <FormSection title="Participant Welfare">
          <Required
            label="Does the research involve vulnerable populations? *"
            kind="selection"
          >
            <CheckboxGroup
              options={VULNERABLE_GROUP_OPTIONS}
              checkedFn={(item) => hasCsvOption("vulnerableGroups", item)}
              toggleFn={(item) => toggleCsvOption("vulnerableGroups", item)}
              columns={2}
            />
          </Required>

          <FieldRow className="mt-4">
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

          <Required
            label="Describe how you will manage adverse events or participant complaints: *"
            className="mt-4"
          >
            <BaseTextarea
              value={form.adverseEventsManagement}
              onChange={onFieldChange("adverseEventsManagement")}
              rows={3}
            />
          </Required>
        </FormSection>

        {/* Biological & Risk */}
        <FormSection title="Biological Specimens, Risk & Conflicts">
          <Required label="Will this involve biological specimens (blood, tissue, genetic material)? *">
            <BaseSelect
              value={form.thesisBiologicalSpecimensInvolved}
              onChange={onFieldChange("thesisBiologicalSpecimensInvolved")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </BaseSelect>
          </Required>

          {form.thesisBiologicalSpecimensInvolved === "Yes" && (
            <ConditionalCallout className="mt-3">
              <Required label="Describe collection, storage, handling and biosafety *">
                <BaseTextarea
                  value={form.thesisBiologicalSpecimensDetails}
                  onChange={onFieldChange("thesisBiologicalSpecimensDetails")}
                  rows={3}
                  placeholder="Describe collection, storage, handling and biosafety"
                />
              </Required>
            </ConditionalCallout>
          )}

          <Required label="Risk Level of Research: *" className="mt-4">
            <BaseSelect
              value={form.researchRiskLevel}
              onChange={onFieldChange("researchRiskLevel")}
            >
              <option value="">Select</option>
              <option value="Minimal risk">Minimal risk (ordinary daily activities)</option>
              <option value="Low risk">Low risk (minimal discomfort or inconvenience)</option>
              <option value="Moderate risk">
                Moderate risk (some potential harm or discomfort)
              </option>
              <option value="High risk">High risk (significant potential for harm)</option>
            </BaseSelect>
            {(form.researchRiskLevel === "Moderate risk" ||
              form.researchRiskLevel === "High risk") && (
              <BaseTextarea
                value={form.researchRiskJustification}
                onChange={onFieldChange("researchRiskJustification")}
                rows={2}
                placeholder="Justification for moderate/high risk *"
                className="mt-3"
              />
            )}
          </Required>

          <Required
            label="If applicable, identify all potential risks and adverse effects (physical, psychological, social, legal): *"
            className="mt-4"
          >
            <BaseTextarea
              value={form.potentialRiskDetails}
              onChange={onFieldChange("potentialRiskDetails")}
              rows={4}
            />
          </Required>

          <Required
            label="Do you have any real or perceived conflict of interest that could bias the research? *"
            className="mt-4"
          >
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
            <ConditionalCallout className="mt-3">
              <Required label="Provide full disclosure *">
                <BaseTextarea
                  value={form.conflictManagement}
                  onChange={onFieldChange("conflictManagement")}
                  rows={3}
                  placeholder="Provide full disclosure"
                />
              </Required>
            </ConditionalCallout>
          )}
        </FormSection>
      </section>
    );
  }

  /* ---------- STEP 2: Biomedical & Pharmaceutical ---------- */
  if (currentStep === 2) {
    return (
      <section className="flex flex-col gap-6">
        <StepHeader
          index={3}
          title="Biomedical & Pharmaceutical Aspects (If Applicable)"
          required
        />

        <FormSection title="Pharmaceutical Substances / Drug Administration">
          <Required label="Will this research involve pharmaceutical substances or drug administration? *">
            <BaseSelect
              value={form.publicationPharmaInterventions}
              onChange={onFieldChange("publicationPharmaInterventions")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </BaseSelect>
          </Required>

          {form.publicationPharmaInterventions === "Yes" && (
            <ConditionalCallout className="mt-4">
              <FieldRow>
                <Required label="Drug/Pharmaceutical Details *" className="md:col-span-2">
                  <BaseInput
                    value={form.drugName}
                    onChange={onFieldChange("drugName")}
                    placeholder="Drug/Pharmaceutical Details"
                  />
                </Required>
                <Required label="Dosage and frequency *" className="md:col-span-2">
                  <BaseInput
                    value={form.drugDosageFrequency}
                    onChange={onFieldChange("drugDosageFrequency")}
                    placeholder="Dosage and frequency"
                  />
                </Required>
                <Required label="Known side effects *" className="md:col-span-2">
                  <BaseTextarea
                    value={form.drugKnownSideEffects}
                    onChange={onFieldChange("drugKnownSideEffects")}
                    rows={2}
                    placeholder="Known side effects"
                  />
                </Required>
                <Required
                  label="Has regulatory and ethical approval been obtained for the pharmaceutical substance / investigational product? *"
                  className="md:col-span-2"
                >
                  <BaseSelect
                    value={form.drugRegulatoryApproval}
                    onChange={onFieldChange("drugRegulatoryApproval")}
                  >
                    <option value="">Select</option>
                    <option>Yes</option>
                    <option>No</option>
                    <option>Pending</option>
                    <option>Not Applicable</option>
                  </BaseSelect>
                </Required>
                <Required
                  label="Route of administration *"
                  kind="selection"
                  className="md:col-span-2"
                >
                  <CheckboxGroup
                    options={DRUG_ROUTE_OPTIONS}
                    checkedFn={(item) => hasCsvOption("drugAdministrationRoutes", item)}
                    toggleFn={(item) => toggleCsvOption("drugAdministrationRoutes", item)}
                    columns={2}
                  />
                </Required>
                <Required
                  label="Will participants be monitored after administration? *"
                  className="md:col-span-2"
                >
                  <BaseSelect
                    value={form.monitoredAfterAdministration}
                    onChange={onFieldChange("monitoredAfterAdministration")}
                  >
                    <option value="">Select</option>
                    <option>Yes</option>
                    <option>No</option>
                    <option>Not Applicable</option>
                  </BaseSelect>
                </Required>
                {form.monitoredAfterAdministration === "Yes" && (
                  <Required label="Follow-up duration *" className="md:col-span-2">
                    <BaseInput
                      value={form.followUpDuration}
                      onChange={onFieldChange("followUpDuration")}
                      placeholder="Follow-up duration"
                    />
                  </Required>
                )}
                <Required
                  label="Emergency procedures and adverse-event handling *"
                  className="md:col-span-2"
                >
                  <BaseTextarea
                    value={form.emergencyProcedures}
                    onChange={onFieldChange("emergencyProcedures")}
                    rows={3}
                    placeholder="Describe emergency procedures and how adverse events are handled."
                  />
                </Required>
              </FieldRow>
            </ConditionalCallout>
          )}
        </FormSection>

        <FormSection title="Animal Subjects">
          <Required label="Will animal subjects be used in this research? *">
            <BaseSelect
              value={form.thesisAnimalSubjectsUsed}
              onChange={onFieldChange("thesisAnimalSubjectsUsed")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </BaseSelect>
          </Required>

          {form.thesisAnimalSubjectsUsed === "Yes" && (
            <ConditionalCallout className="mt-4">
              <Required label="Justify animal use and describe welfare measures *">
                <BaseTextarea
                  value={form.thesisAnimalCareWelfareDetails}
                  onChange={onFieldChange("thesisAnimalCareWelfareDetails")}
                  rows={3}
                  placeholder="Justify animal use and describe welfare measures"
                />
              </Required>
              <Required
                label="Ethics committee approval for animal research? *"
                className="mt-3"
              >
                <BaseSelect
                  value={form.thesisAnimalEthicsCommitteeApproval}
                  onChange={onFieldChange("thesisAnimalEthicsCommitteeApproval")}
                >
                  <option value="">Select</option>
                  <option>Yes</option>
                  <option>No</option>
                  <option>Pending</option>
                  <option>Not Applicable</option>
                </BaseSelect>
              </Required>
              <InfoNote className="mt-3">
                Provide approval letters/forms in Attachments where applicable.
              </InfoNote>
            </ConditionalCallout>
          )}
        </FormSection>
      </section>
    );
  }

  /* ---------- STEP 3: Data Management ---------- */
  if (currentStep === 3) {
    return (
      <section className="flex flex-col gap-6">
        <StepHeader index={4} title="Data Management" required />

        <FormSection title="Data Storage & Protection">
          <Required
            label="How will research data be stored, secured, and protected? *"
            kind="selection"
          >
            <CheckboxGroup
              options={DATA_PROTECTION_OPTIONS}
              checkedFn={(item) => hasCsvOption("dataProtectionOptions", item)}
              toggleFn={(item) => toggleCsvOption("dataProtectionOptions", item)}
              columns={2}
            />
            {hasCsvOption("dataProtectionOptions", "Others") && (
              <BaseInput
                value={form.dataProtectionOtherDetails}
                onChange={onFieldChange("dataProtectionOtherDetails")}
                placeholder="Others, please specify *"
                className="mt-3"
              />
            )}
          </Required>
        </FormSection>

        <FormSection title="Data Sharing">
          <Required label="Will data be shared with third parties, collaborators, or external institutions? *">
            <BaseSelect
              value={form.sharedWithThirdParties}
              onChange={onFieldChange("sharedWithThirdParties")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </BaseSelect>
          </Required>
          {form.sharedWithThirdParties === "Yes" && (
            <ConditionalCallout className="mt-3">
              <Required label="Institution(s), purpose, data protection measures *">
                <BaseTextarea
                  value={form.thirdPartySharingDetails}
                  onChange={onFieldChange("thirdPartySharingDetails")}
                  rows={3}
                  placeholder="Institution(s), purpose, data protection measures"
                />
              </Required>
            </ConditionalCallout>
          )}

          <Required
            label="Will cloud-based or online platforms be used for data collection or storage? *"
            className="mt-4"
          >
            <BaseSelect
              value={form.cloudPlatformsUsed}
              onChange={onFieldChange("cloudPlatformsUsed")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </BaseSelect>
          </Required>
          {form.cloudPlatformsUsed === "Yes" && (
            <ConditionalCallout className="mt-3">
              <Required label="Specify platform(s) *">
                <BaseInput
                  value={form.cloudPlatformDetails}
                  onChange={onFieldChange("cloudPlatformDetails")}
                  placeholder="Specify platform(s)"
                />
              </Required>
            </ConditionalCallout>
          )}
        </FormSection>

        <FormSection title="Future Use & Retention">
          <Required label="Will data be used for future research beyond the current study? *">
            <BaseSelect
              value={form.futureResearchDataUse}
              onChange={onFieldChange("futureResearchDataUse")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </BaseSelect>
          </Required>
          {form.futureResearchDataUse === "Yes" && (
            <ConditionalCallout className="mt-3">
              <Required label="Specify conditions *">
                <BaseTextarea
                  value={form.futureResearchDataUseConditions}
                  onChange={onFieldChange("futureResearchDataUseConditions")}
                  rows={2}
                  placeholder="Specify conditions"
                />
              </Required>
            </ConditionalCallout>
          )}

          <Required
            label="How long will personal data be retained, please select the estimated time: *"
            className="mt-4"
          >
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
              <Required label="Explain need for retention beyond 16 years *">
                <BaseTextarea
                  value={form.longRetentionReason}
                  onChange={onFieldChange("longRetentionReason")}
                  rows={2}
                  placeholder="Explain need for retention beyond 16 years"
                />
              </Required>
            </ConditionalCallout>
          )}
        </FormSection>
      </section>
    );
  }

  /* ---------- STEP 4: Institutional Approvals ---------- */
  if (currentStep === 4) {
    return (
      <section className="flex flex-col gap-6">
        <StepHeader
          index={5}
          title="Institutional Approvals & Collaborations"
          required
        />

        <FormSection title="External Institutions & Funding">
          <Required label="Will research be conducted at healthcare facilities or external institutions? *">
            <BaseSelect
              value={form.healthcareExternalInstitutions}
              onChange={onFieldChange("healthcareExternalInstitutions")}
            >
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </BaseSelect>
          </Required>
          {form.healthcareExternalInstitutions === "Yes" && (
            <ConditionalCallout className="mt-3">
              <Required label="Attach institutional approval letters in Attachments *">
                <BaseInput
                  value={form.healthcareExternalInstitutionsDetails}
                  onChange={onFieldChange("healthcareExternalInstitutionsDetails")}
                  placeholder="Institutional approval letters details"
                />
              </Required>
            </ConditionalCallout>
          )}

          <FieldRow className="mt-4">
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
        </FormSection>

        <FormSection title="International Collaboration & Overseas">
          <FieldRow>
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
            <WarnNote className="mt-3">
              Attach the overseas institution&apos;s ethical approval when applicable.
            </WarnNote>
          )}

          {form.internationalCollaboration === "Yes" && (
            <ConditionalCallout className="mt-3">
              <FieldGroup
                label="Collaboration details (if not stated in Step 1)"
                fullWidth
              >
                <BaseTextarea
                  value={form.internationalCollaborationDetails}
                  onChange={onFieldChange("internationalCollaborationDetails")}
                  rows={4}
                  placeholder="Collaboration details (if not stated in Step 1)"
                />
              </FieldGroup>
            </ConditionalCallout>
          )}
        </FormSection>
      </section>
    );
  }

  /* ---------- STEP 5: Required Attachments ---------- */
  if (currentStep === 5) {
    return (
      <section className="flex flex-col gap-6">
        <StepHeader
          index={6}
          title="Required Attachments"
          required
          subtitle="Please attach the following documents (check all that apply)."
        />

        <div className="flex flex-col gap-3">
          {FORM_3_REQUIRED_ATTACHMENTS.map((item) => (
            <AttachmentCard
              key={item}
              label={item}
              isMandatory={FORM_3_MANDATORY_ATTACHMENT_SET.has(item)}
              isChecked={hasCsvOption("requiredAttachments", item)}
              onToggle={() => toggleCsvOption("requiredAttachments", item)}
              fileName={attachmentFiles[item]}
              onUpload={handleRequiredAttachmentUpload(item)}
            />
          ))}
        </div>

        <FormSection
          title="Additional Documents"
          subtitle="Attach any other documents that support your application."
          className="border-dashed"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <SubsectionTitle>Add more files as needed</SubsectionTitle>
            <button
              type="button"
              onClick={() => setExtraUploadFiles((prev) => [...prev, ""])}
              className="inline-flex size-9 items-center justify-center rounded-full border border-primary text-lg font-bold text-primary transition hover:bg-primary hover:text-white"
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
    );
  }

  /* ---------- STEP 6: Declaration and Submission ---------- */
  const declarationName =
    form.scholarName.trim() || form.applicantName.trim() || "_____________________";

  return (
    <section className="flex flex-col gap-6">
      <StepHeader index={7} title="Declaration and Submission" required />

      <DeclarationCheckbox
        checked={form.form3DeclarationAccepted === "yes"}
        onChange={(checked) =>
          setForm((prev) => ({
            ...prev,
            form3DeclarationAccepted: checked ? "yes" : "",
          }))
        }
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
  );
}
