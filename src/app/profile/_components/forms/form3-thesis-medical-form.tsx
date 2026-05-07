"use client";

import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { CommonFormProps } from "./form-stepper-types";
import {
  allInlineRequiredProps,
  ignoreRequiredValidationProps,
  requiredMarkField,
  requiredRadioGroupProps,
  requiredSelectionGroupProps,
} from "./form-validation-mark";
import { Required } from "./required";

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

const PARTICIPANT_BANDS = ["1-20", "21-50", "51-100", "101-150", "151-200", "201-300", "301-400", "401-500", "501+"] as const;

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
  const RequiredMark = () => (
    <span className="ml-1 font-extrabold text-red-600 dark:text-red-400">*</span>
  );

  if (currentStep === 0) {
    return (
      <section className="grid gap-6" {...allInlineRequiredProps()}>
        <div>
        <h3 className="text-xl font-bold text-dark dark:text-white">
            Step 1: Researcher (s) and Thesis/Project Information
        </h3>
          <p className="mt-1 text-sm text-body">
            Students&apos; Thesis/Projects (for Medical Sciences)
          </p>
        </div>

        <div className="grid gap-4 rounded-lg border border-stroke p-4 dark:border-dark-3">
          <h4 className="font-semibold text-dark dark:text-white">1.1 Scholar&apos;s Information</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.scholarName}
              readOnly
              className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2"
              placeholder="Scholar's Name"
            />
            <input
              value={form.scholarSapId}
              readOnly
              className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2"
              placeholder="SAP ID / Reg. No."
            />
            <input
              value={form.scholarEmail}
              readOnly
              className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2"
              placeholder="Email"
            />
            <input
              value={form.scholarFaculty}
              readOnly
              className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2"
              placeholder="Faculty"
            />
            <input
              value={form.scholarDepartment}
              readOnly
              className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2"
              placeholder="Department"
            />
            <input
              value={form.scholarProgram}
              readOnly
              className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2"
              placeholder="Program"
            />
          </div>
        </div>

        <div className="grid gap-4 rounded-lg border border-stroke p-4 dark:border-dark-3 md:grid-cols-2">
          <h4 className="font-semibold text-dark dark:text-white md:col-span-2">
            1.2 Supervisor(s)&apos;s Information
          </h4>
          <Required label="Supervisor's SAP ID *">
            <input
              placeholder="Enter Sap ID"
              value={form.supervisorSapId}
              onChange={onFieldChange("supervisorSapId")}
              className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full"
            />
          </Required>
          <Required label="Supervisor's Name *">
          <input
            placeholder="Enter Supervisor's Name"
            value={form.supervisorName}
            onChange={onFieldChange("supervisorName")}
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full"
          />
          </Required>
          <Required label="Supervisor's	Email *">
          <input
            placeholder="Enter Supervisor's Email"
            value={form.supervisorEmail}
            onChange={onFieldChange("supervisorEmail")}
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full"
            />
          </Required>
          <Required label="Faculty">
          <select value={form.supervisorFaculty} onChange={onFieldChange("supervisorFaculty")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full">
            <option value="">Select Faculty</option>
              {facultyOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </Required>
          <Required label="Department">
          <select value={form.supervisorDepartment} onChange={onFieldChange("supervisorDepartment")} disabled={!form.supervisorFaculty} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-70 dark:border-dark-3 md:col-span-2 w-full">
            <option value="">Select Department</option>
            {getDepartmentsForFaculty(form.supervisorFaculty).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          </Required>
        </div>

        <div className="grid gap-4 rounded-lg border border-stroke p-4 dark:border-dark-3">
          <h4 className="font-semibold text-dark dark:text-white">
            1.3 Co-supervisor (please select:)
          </h4>
          
          <select
            value={form.coSupervisorType}
            onChange={onFieldChange("coSupervisorType")}
            className="max-w-xs rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full"
          >
            <option value="">Select Option</option>
            <option value="UOL">Option 1: UOL</option>
            <option value="External">Option 2: External</option>
          </select>

          <div className="grid gap-4 md:grid-cols-2">
            {form.coSupervisorType === "UOL" ? (
              <>
                <Required label="Co-supervisor SAP ID *">
                  <input
                    value={form.uolCoSupervisorSapId}
                    onChange={onFieldChange("uolCoSupervisorSapId")}
                    placeholder="SAP ID"
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full"
                  />
                  </Required>
                  <Required label="Co-supervisor's Name *">
                    <input
                    value={form.uolCoSupervisorName}
                    onChange={onFieldChange("uolCoSupervisorName")}
                    placeholder="Supervisor's Name"
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full"
                    />
                  </Required>
                  <Required label="Co-supervisor's Email *">
                      <input
                      value={form.uolCoSupervisorEmail}
                      onChange={onFieldChange("uolCoSupervisorEmail")}
                      placeholder="Email"
                      className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full"
                    />
                  </Required>
                  <Required label="Co-supervisor's Faculty *">
                    <select value={form.uolCoSupervisorFaculty} onChange={onFieldChange("uolCoSupervisorFaculty")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full">
                      <option value="">Select Faculty</option>
                      {facultyOptions.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </Required>
                  <Required label="Co-supervisor's Department *">
                    <select value={form.uolCoSupervisorDepartment} onChange={onFieldChange("uolCoSupervisorDepartment")} disabled={!form.uolCoSupervisorFaculty} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-70 dark:border-dark-3 md:col-span-2">
                      <option value="">Select Department</option>
                      {getDepartmentsForFaculty(form.uolCoSupervisorFaculty).map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </Required>
              </>
            ) : (
              <>
                <Required label="Co-supervisor's Name">
                <input

                  value={form.externalCoSupervisorName}
                  onChange={onFieldChange("externalCoSupervisorName")}
                  placeholder="Co-supervisor's Name"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full"
                />
                </Required>
                <Required label="Co-supervisor's Reg. No.">
                <input

                  value={form.externalCoSupervisorRegNo}
                  onChange={onFieldChange("externalCoSupervisorRegNo")}
                  placeholder="Reg. No."
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full"
                />
                </Required>
                <Required label="Co-supervisor's Email">
                <input

                  value={form.externalCoSupervisorEmail}
                  onChange={onFieldChange("externalCoSupervisorEmail")}
                  placeholder="Email"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full"
                />
                </Required>
                <Required label="Co-supervisor's University">
                <input
                  value={form.externalCoSupervisorUniversity}
                  onChange={onFieldChange("externalCoSupervisorUniversity")}
                  placeholder="University"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full"
                />
                </Required>
                <Required label="Co-supervisor's Faculty">
                <select value={form.externalCoSupervisorFaculty} onChange={onFieldChange("externalCoSupervisorFaculty")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full">
                  <option value="">Faculty</option>
                  {facultyOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                </Required>
                <Required label="Co-supervisor's Department">
                <select value={form.externalCoSupervisorDepartment} onChange={onFieldChange("externalCoSupervisorDepartment")} disabled={!form.externalCoSupervisorFaculty} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-70 dark:border-dark-3 md:col-span-2 w-full">
                  <option value="">Department</option>
                  {getDepartmentsForFaculty(form.externalCoSupervisorFaculty).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                </Required>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 rounded-lg border border-stroke p-4 dark:border-dark-3 md:grid-cols-2">
          <h4 className="font-semibold text-dark dark:text-white md:col-span-2">
            1.4 Thesis/Project Details 
          </h4>
          <Required label="Thesis/Project Title *">
          <input

            value={form.thesisTitle}
            onChange={onFieldChange("thesisTitle")}
            placeholder="a) Thesis/Project Title"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          />
          </Required>
          <Required label="Research Discipline *">  
            <input

            value={form.researchDiscipline}
            onChange={onFieldChange("researchDiscipline")}
            placeholder="b) Research Discipline"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          />
          </Required>
          <Required label="Expected Start Date *">  
          <input
            type="date"
            value={form.expectedStartDate}
            onChange={onFieldChange("expectedStartDate")}
            placeholder="c) Expected Start Date"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          />
          </Required>
          <Required label="Expected End Date *">
          <input
            type="date"
            value={form.expectedEndDate}
            onChange={onFieldChange("expectedEndDate")}
            placeholder="d) Expected End Date"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          />
          </Required>
          <Required label="Research Location(s) *">
            <input
            value={form.researchLocations}
            onChange={onFieldChange("researchLocations")}
            placeholder="e) Research Location(s)"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          />
          </Required>

          <input
              value={form.fundingSource}
              onChange={onFieldChange("fundingSource")}
              placeholder="f) Funding Source (if applicable)"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          />


          <Required label="Research Objectives *">
            
            <textarea
              value={form.researchObjective1}
              onChange={onFieldChange("researchObjective1")}
              placeholder="Objective 1"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          />
          </Required>
          <Required label="Research Objective 2 *">
            <textarea
                value={form.researchObjective2}
              onChange={onFieldChange("researchObjective2")}
              placeholder="Objective 2"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          />
          </Required>
            <textarea
                value={form.researchObjective3}
              onChange={onFieldChange("researchObjective3")}
              placeholder="Objective 3"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          />
            <textarea
                value={form.researchObjective4}
              onChange={onFieldChange("researchObjective4")}
              placeholder="Objective 4"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          />


          <Required
            label="Please select relevant Sustainable Development Goals (multiple options can also be
                selected) as per your research *"
            kind="selection"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {SDG_OPTIONS.map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hasCsvOption("sdgs", item)}
                    onChange={() => toggleCsvOption("sdgs", item)}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </Required>

          <Required label="Purpose of research (multiple) *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
            <div className="grid gap-2 sm:grid-cols-2">
              {RESEARCH_PURPOSE_OPTIONS.map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hasCsvOption("researchPurpose", item)}
                    onChange={() => toggleCsvOption("researchPurpose", item)}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            </Required>

          <Required label="Research Classification (multiple) *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
            <div className="grid gap-2 sm:grid-cols-2">
              {RESEARCH_CLASSIFICATION_OPTIONS.map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hasCsvOption("researchClassification", item)}
                    onChange={() => toggleCsvOption("researchClassification", item)}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            </Required>

          <Required label="Select the chosen method of data collection: (single-select) *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
            <div className="grid gap-2">
              {DATA_COLLECTION_OPTIONS.map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="dataCollectionMethodForm3"
                    checked={form.dataCollectionMethod === item}
                    onChange={() => setForm((prev) => ({ ...prev, dataCollectionMethod: item }))}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            </Required>

          <Required label="Select Research Population (type) *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
            <div className="grid gap-2 sm:grid-cols-2">
              {RESEARCH_POPULATION_OPTIONS.map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hasCsvOption("researchPopulation", item)}
                    onChange={() => toggleCsvOption("researchPopulation", item)}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            </Required>

          
            <Required label="Describe methods and materials *">
            <textarea

              value={form.methodology}
              onChange={onFieldChange("methodology")}
              rows={5}
              placeholder="Describe methods and materials"
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
            />
            </Required>


          <Required label="How many participants will you be recruiting? (estimated number) *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
            <select

              value={form.participantsEstimate}
              onChange={onFieldChange("participantsEstimate")}
              className="w-full max-w-md rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
            >
              <option value="">Select range</option>
              {PARTICIPANT_BANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            </Required>
        </div>
      </section>
    );
  }

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
      <section className="grid gap-4 md:grid-cols-2" {...allInlineRequiredProps()}>
        <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">
          Step 2: Ethical Considerations 
        </h3>

        <Required label="Does this research involve human subjects or patients? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <select
          value={form.involveHumanParticipants}
          onChange={onFieldChange("involveHumanParticipants")}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
        >
          <option value="">2.1 Does this research involve human subjects or patients?</option>
          <option>Yes</option>
          <option>No</option>
        </select>
        </Required>
        <Required label="Will personally identifiable information be collected? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <select

          value={form.collectPii}
          onChange={onFieldChange("collectPii")}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
        >
          <option value="">2.2 Will personally identifiable information be collected?</option>
          <option>Yes</option>
          <option>No</option>
        </select>
        </Required>
        {form.collectPii === "Yes" && (
          <Required label="If Yes, specify the type(s) *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
            <div className="flex flex-wrap gap-x-6 gap-y-2 w-full">
              {(
                [
                  ["piiName", "Name"],
                  ["piiEmailPhone", "Email/phone"],
                  ["piiStudentEmployeeId", "Student/employee ID"],
                  ["piiMedicalRecordNumber", "Medical record number"],
                  ["piiAudioVideoRecordings", "Audio/video recordings"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form[key] === "yes"} onChange={() => togglePii(key)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <br />
            <Required label="Other: *" className="w-full">
            <input
              value={form.piiOther}
              onChange={onFieldChange("piiOther")}
              placeholder="Other:"
              className="mt-3 w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full"
            />
            </Required>
            </Required>
        )}

        <Required label="How will participants be recruited? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              "Emails",
              "Google Forms/ Online Surveys",
              "Social Media (Facebook, Instagram, etc.)",
              "LinkedIn (professional networking platforms)",
              "Institutional Mailing Lists",
              "Online forms",
              "Academic Networks",
              "In-person",
              "Other",
            ].map((item) => (
              <label key={item} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hasCsvOption("recruitmentChannels", item)}
                  onChange={() => toggleCsvOption("recruitmentChannels", item)}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </Required>

        <Required label="Select the type of informed consent *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">	
          <select

            value={form.informedConsentType}
            onChange={onFieldChange("informedConsentType")}
            className="w-full max-w-xl rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
          >
            <option value="">Select</option>
            <option>Written informed consent</option>
            <option>Oral informed consent (with witness)</option>
            <option>Waiver of consent</option>
            <option>Not applicable</option>
          </select>
          <p className="mt-2 text-xs text-body">
            Note: Attach the consent form (UOL format) in the Attachments section.
          </p>
        </Required>


        <Required label="Have any research data been collected prior to ethical approval? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <select

          value={form.preApprovalDataCollected}
          onChange={onFieldChange("preApprovalDataCollected")}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
        >
          <option value="">2.5 Have any research data been collected prior to ethical approval?</option>
          <option>Yes</option>
          <option>No</option>
        </select>
        {form.preApprovalDataCollected === "Yes" && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200 md:col-span-2">
            Attach the participant information letter and consent form where applicable.
          </p>
        )}
        </Required>

        <Required label="Does the research involve vulnerable populations? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <div className="grid gap-2 sm:grid-cols-2">
            {VULNERABLE_GROUP_OPTIONS.map((item) => (
              <label key={item} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hasCsvOption("vulnerableGroups", item)}
                  onChange={() => toggleCsvOption("vulnerableGroups", item)}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </Required>

        <Required label="Can participants withdraw from the study at any time? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <select

          value={form.canWithdraw}
          onChange={onFieldChange("canWithdraw")}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
        >
          <option value="">2.7 Can participants withdraw from the study at any time?</option>
          <option>Yes</option>
          <option>No</option>
        </select>
        </Required>

        <Required label="Will participants receive any compensation? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
        <select

          value={form.compensation}
          onChange={onFieldChange("compensation")}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
        >
          <option value="">2.8 Will participants receive any compensation?</option>
          <option>Yes</option>
          <option>No</option>
        </select>
        </Required>
        
        <Required label="Describe how you will manage adverse events or participant complaints: *" className="w-full">
          <textarea

            value={form.adverseEventsManagement}
            onChange={onFieldChange("adverseEventsManagement")}
            rows={3}
            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
            placeholder=""
          />
        </Required>


        <Required label="Will this involve biological specimens (blood, tissue, genetic material)? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <select

          value={form.thesisBiologicalSpecimensInvolved}
          onChange={onFieldChange("thesisBiologicalSpecimensInvolved")}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2"
        >
          <option value="">2.10 Will this involve biological specimens (blood, tissue, genetic material)?</option>
          <option>Yes</option>
          <option>No</option>
        </select>
        </Required>
        {form.thesisBiologicalSpecimensInvolved === "Yes" && (
          <Required label="Describe collection, storage, handling and biosafety *" className="w-full">
          <textarea

            value={form.thesisBiologicalSpecimensDetails}
            onChange={onFieldChange("thesisBiologicalSpecimensDetails")}
            rows={3}
            placeholder="Describe collection, storage, handling and biosafety *"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          />
          </Required>
        )}

        <Required label="Risk Level of Research: *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <select

            value={form.researchRiskLevel}
            onChange={onFieldChange("researchRiskLevel")}
            className="w-full max-w-xl rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
          >
            <option value="">Select</option>
            <option value="Minimal risk">Minimal risk (ordinary daily activities)</option>
            <option value="Low risk">Low risk (minimal discomfort or inconvenience)</option>
            <option value="Moderate risk">Moderate risk (some potential harm or discomfort)</option>
            <option value="High risk">High risk (significant potential for harm)</option>
          </select>
          {(form.researchRiskLevel === "Moderate risk" || form.researchRiskLevel === "High risk") && (
            <textarea

              value={form.researchRiskJustification}
              onChange={onFieldChange("researchRiskJustification")}
              rows={2}
              placeholder="Justification for moderate/high risk *"
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
            />
          )}
        </Required>

        <Required label="If applicable, identify all potential risks and adverse effects (physical, psychological, social, legal): *" className="w-full">
          <textarea

            value={form.potentialRiskDetails}
            onChange={onFieldChange("potentialRiskDetails")}
            rows={4}
            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
            placeholder=""
          />
        </Required>

        <Required label="Do you have any real or perceived conflict of interest that could bias the research? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <select

          value={form.conflictOfInterest}
          onChange={onFieldChange("conflictOfInterest")}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full"
        >
          <option value="">2.13 Do you have any real or perceived conflict of interest that could bias the research?</option>
          <option>Yes</option>
          <option>No</option>
          <option>Undecided</option>
        </select>
        </Required>
        {form.conflictOfInterest === "Yes" && (
          <Required label="Provide full disclosure *" className="w-full">
          <textarea
            value={form.conflictManagement}
            onChange={onFieldChange("conflictManagement")}
            rows={3}
            placeholder="Provide full disclosure *"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          />
          </Required>
        )}
      </section>
    );
  }

  if (currentStep === 2) {
    return (
      <section className="grid gap-4 md:grid-cols-2" {...allInlineRequiredProps()}>
        <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">
          Step 3: Biomedical &amp; Pharmaceutical Aspects (If Applicable) <RequiredMark />
        </h3>

        <Required label="Will this research involve pharmaceutical substances or drug administration? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <select

          value={form.publicationPharmaInterventions}
          onChange={onFieldChange("publicationPharmaInterventions")}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2"
        >
          <option value="">3.1 Will this research involve pharmaceutical substances or drug administration?</option>
          <option>Yes</option>
          <option>No</option>
        </select>
        </Required>
        {form.publicationPharmaInterventions === "Yes" && (
          <>
            <Required label="Drug/Pharmaceutical Details  *" className="w-full">
            <input

              value={form.drugName}
              onChange={onFieldChange("drugName")}
              placeholder="Drug/Pharmaceutical Details  *"
              className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
            />
            </Required>
            <Required label="Dosage and frequency *" className="w-full">
            <input

              value={form.drugDosageFrequency}
              onChange={onFieldChange("drugDosageFrequency")}
              placeholder="Dosage and frequency *"
              className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
            />
            </Required>
            <Required label="Known side effects *" className="w-full">
            <textarea

              value={form.drugKnownSideEffects}
              onChange={onFieldChange("drugKnownSideEffects")}
              rows={2}
              placeholder="Known side effects *"
              className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
            />
            </Required>
            <Required label="Has regulatory and ethical approval been obtained for the pharmaceutical substance / investigational product? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
            <select

              value={form.drugRegulatoryApproval}
              onChange={onFieldChange("drugRegulatoryApproval")}
              className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2"
            >
              <option value="">2.13 Has regulatory and ethical approval been obtained for the pharmaceutical substance / investigational product?
              </option>
              <option>Yes</option>
              <option>No</option>
              <option>Pending</option>
              <option>Not Applicable</option>
            </select>
            </Required>
            <Required label="Route of administration *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
              <div className="flex flex-wrap gap-x-6 gap-y-2 w-full">
                {DRUG_ROUTE_OPTIONS.map((route) => (
                  <label key={route} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={hasCsvOption("drugAdministrationRoutes", route)}
                      onChange={() => toggleCsvOption("drugAdministrationRoutes", route)}
                    />
                    <span>{route}</span>
                  </label>
                ))}
              </div>
            </Required>
            <Required label="Has regulatory and ethical approval been obtained for the pharmaceutical substance / investigational product? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
            <select

              value={form.monitoredAfterAdministration}
              onChange={onFieldChange("monitoredAfterAdministration")}
              className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
            >
              <option value="">3.5 Has regulatory and ethical approval been obtained for the pharmaceutical substance / investigational product?</option>
              <option>Yes</option>
              <option>No</option>
              <option>Not Applicable</option>
            </select>
            </Required>
            {form.monitoredAfterAdministration === "Yes" && (
              <Required label="Follow-up duration *" className="w-full">
              <input

                value={form.followUpDuration}
                onChange={onFieldChange("followUpDuration")}
                placeholder="Follow-up duration *"
                className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
              />
              </Required>
            )}
            <Required label="Has regulatory and ethical approval been obtained for the pharmaceutical substance / investigational product? *" className="w-full">
            <textarea

              value={form.emergencyProcedures}
              onChange={onFieldChange("emergencyProcedures")}
              rows={3}
              placeholder="3.6 Has regulatory and ethical approval been obtained for the pharmaceutical substance / investigational product? *"
              className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
            />
            </Required>
          </>
        )}

        <Required label="Will animal subjects be used in this research? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <select

          value={form.thesisAnimalSubjectsUsed}
          onChange={onFieldChange("thesisAnimalSubjectsUsed")}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
        >
          <option value="">3.7 Will animal subjects be used in this research?</option>
          <option>Yes</option>
          <option>No</option>
        </select>
        </Required>
        {form.thesisAnimalSubjectsUsed === "Yes" && (
          <>
            <Required label="Justify animal use and describe welfare measures *" className="w-full">
            <textarea

              value={form.thesisAnimalCareWelfareDetails}
              onChange={onFieldChange("thesisAnimalCareWelfareDetails")}
              rows={3}
              placeholder="Justify animal use and describe welfare measures *"
              className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
            />
            </Required>
            <Required label="Ethics committee approval for animal research? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
            <select

              value={form.thesisAnimalEthicsCommitteeApproval}
              onChange={onFieldChange("thesisAnimalEthicsCommitteeApproval")}
              className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
            >
              <option value="">3.8 Ethics committee approval for animal research?</option>
              <option>Yes</option>
              <option>No</option>
              <option>Pending</option>
              <option>Not Applicable</option>
            </select>
            </Required>
            <p className="text-xs text-body md:col-span-2">
              Provide approval letters/forms in Attachments where applicable.
            </p>
          </>
        )}
      </section>
    );
  }

  if (currentStep === 3) {
    return (
      <section className="grid gap-4 md:grid-cols-2" {...allInlineRequiredProps()}>
        <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">
          Step 4: Data Management <RequiredMark />
        </h3>
        <Required label="How will research data be stored, secured, and protected? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <div className="grid gap-2 sm:grid-cols-2">
            {DATA_PROTECTION_OPTIONS.map((item) => (
              <label key={item} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hasCsvOption("dataProtectionOptions", item)}
                  onChange={() => toggleCsvOption("dataProtectionOptions", item)}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
          {hasCsvOption("dataProtectionOptions", "Others") && (
            <input

              value={form.dataProtectionOtherDetails}
              onChange={onFieldChange("dataProtectionOtherDetails")}
              placeholder="Others, please specify *"
              className="mt-3 w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
            />
          )}
        </Required>

        <Required label="Will data be shared with third parties, collaborators, or external institutions? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <select

          value={form.sharedWithThirdParties}
          onChange={onFieldChange("sharedWithThirdParties")}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
        >
          <option value="">4.2 Will data be shared with third parties, collaborators, or external institutions?</option>
          <option>Yes</option>
          <option>No</option>
        </select>
        </Required>
        {form.sharedWithThirdParties === "Yes" && (
          <Required label="Institution(s), purpose, data protection measures *" className="w-full">
          <textarea

            value={form.thirdPartySharingDetails}
            onChange={onFieldChange("thirdPartySharingDetails")}
            rows={3}
            placeholder="Institution(s), purpose, data protection measures *"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          />
          </Required>
        )}

        <Required label="Will cloud-based or online platforms be used for data collection or storage? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <select

          value={form.cloudPlatformsUsed}
          onChange={onFieldChange("cloudPlatformsUsed")}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
        >
          <option value="">4.3 Will cloud-based or online platforms be used for data collection or storage?</option>
          <option>Yes</option>
          <option>No</option>
        </select>
        </Required>
        {form.cloudPlatformsUsed === "Yes" && (
          <Required label="Specify platform(s) *" className="w-full">
          <input

            value={form.cloudPlatformDetails}
            onChange={onFieldChange("cloudPlatformDetails")}
            placeholder="Specify platform(s) *"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          />
          </Required>
        )}

        <Required label="Will data be used for future research beyond the current study? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <select

          value={form.futureResearchDataUse}
          onChange={onFieldChange("futureResearchDataUse")}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
        >
          <option value="">4.4 Will data be used for future research beyond the current study?</option>
          <option>Yes</option>
          <option>No</option>
        </select>
        </Required>
        {form.futureResearchDataUse === "Yes" && (
          <Required label="Specify conditions *" className="w-full">
          <textarea

            value={form.futureResearchDataUseConditions}
            onChange={onFieldChange("futureResearchDataUseConditions")}
            rows={2}
            placeholder="Specify conditions *"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          />
          </Required>
        )}

        <Required label="How long will personal data be retained, please select the estimated time: *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <select

          value={form.dataRetentionYears}
          onChange={onFieldChange("dataRetentionYears")}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
        >
          <option value="">4.5 How long will personal data be retained, please select the estimated time:  *</option>
          <option>1-5 years</option>
          <option>6-10 years</option>
          <option>11-15 years</option>
          <option>More than 16 years</option>
        </select>
        </Required>
        {form.dataRetentionYears === "More than 16 years" && (
          <Required label="Explain need for retention beyond 16 years *" className="w-full">
          <textarea

            value={form.longRetentionReason}
            onChange={onFieldChange("longRetentionReason")}
            rows={2}
            placeholder="Explain need for retention beyond 16 years *"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          />
          </Required>
        )}
      </section>
    );
  }

  if (currentStep === 4) {
    return (
      <section className="grid gap-4 md:grid-cols-2" {...allInlineRequiredProps()}>
        <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">
          Step 5: Institutional Approvals &amp; Collaborations <RequiredMark />
        </h3>

        <Required label="Will research be conducted at healthcare facilities or external institutions? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <select

          value={form.healthcareExternalInstitutions}
          onChange={onFieldChange("healthcareExternalInstitutions")}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
        >
          <option value="">5.1 Will research be conducted at healthcare facilities or external institutions?</option>
          <option>Yes</option>
          <option>No</option>
        </select>
        </Required>
        {form.healthcareExternalInstitutions === "Yes" && (
          <Required label="Attach institutional approval letters in Attachments *" className="w-full">
          <input

            value={form.healthcareExternalInstitutionsDetails}
            onChange={onFieldChange("healthcareExternalInstitutionsDetails")}
            placeholder="Attach institutional approval letters in Attachments *"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          />
          </Required>
        )}
        <Required label="Has your research received institutional funding? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <select

          value={form.institutionalFunding}
          onChange={onFieldChange("institutionalFunding")}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
        >
          <option value="">5.2 Has your research received institutional funding? </option>
          <option>Yes</option>
          <option>No</option>
        </select>
        </Required>
        <Required label="Has your research received external funding? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
        <select

          value={form.externalFunding}
          onChange={onFieldChange("externalFunding")}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
        >
          <option value="">5.3 Has your research received external funding? ?</option>
          <option>Yes</option>
          <option>No</option>
        </select>
        </Required>
        <Required label="Does your research involve an international collaboration? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <select

            value={form.internationalCollaboration}
            onChange={onFieldChange("internationalCollaboration")}
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
          >
            <option value="">Does your research involve an international collaboration? </option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
        
      
        <Required label="Will your research, or a part of it, be conducted overseas/abroad? *" kind="selection" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full">
          <select

          value={form.conductedAbroad}
          onChange={onFieldChange("conductedAbroad")}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full"
        >
          <option value="">5.5 Will your research, or a part of it, be conducted overseas/abroad? </option>
          <option>Yes</option>
          <option>No</option>
        </select>
        </Required>
        {form.conductedAbroad === "Yes" && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200 md:col-span-2">
            Attach the overseas institution&apos;s ethical approval when applicable.
          </p>
        )}

        {form.internationalCollaboration === "Yes" && (
          <textarea

            value={form.internationalCollaborationDetails}
            onChange={onFieldChange("internationalCollaborationDetails")}
            rows={4}
            placeholder="Collaboration details (if not stated in Step 1) *"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2"
          />
        )}
      </section>
    );
  }

  if (currentStep === 5) {
    return (
      <section className="grid gap-4">
        <h3 className="text-xl font-bold text-dark dark:text-white">
          Step 6: Required Attachments <RequiredMark />
        </h3>
        <p className="text-sm">Please attach the following documents (check all that apply):</p>
        <div className="grid gap-2">
          {FORM_3_REQUIRED_ATTACHMENTS.map((item) => (
            <div key={item} className="rounded border border-stroke px-3 py-2 dark:border-dark-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasCsvOption("requiredAttachments", item)}
                    onChange={() => toggleCsvOption("requiredAttachments", item)}
                  />
                  <span className="text-sm">
                    {item}
                    {FORM_3_MANDATORY_ATTACHMENT_SET.has(item) ? <RequiredMark /> : null}
                  </span>
                </label>
                <label className="cursor-pointer rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10">
                  Upload document
                  <input type="file" className="hidden" onChange={handleRequiredAttachmentUpload(item)} />
                </label>
              </div>
              {attachmentFiles[item] && (
                <p className="mt-2 text-xs text-body">Selected: {attachmentFiles[item]}</p>
              )}
            </div>
          ))}
        </div>
        <div className="rounded border border-dashed border-stroke p-3 dark:border-dark-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-dark dark:text-white">Additional Documents</p>
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
              <div key={`${index}-extra-upload`} className="rounded border border-stroke px-3 py-2 dark:border-dark-3">
                <label className="inline-block cursor-pointer rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10">
                  Upload document
                  <input type="file" className="hidden" onChange={handleExtraUploadChange(index)} />
                </label>
                {fileName && <p className="mt-2 text-xs text-body">Selected: {fileName}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* Step 7 */
  const medicalDeclarationSnippet =
    "I hereby certify that I have read and understood the ethical guidelines for medical and health sciences research.";
  const declarationName = form.scholarName.trim() || form.applicantName.trim() || "_____________________";

  return (
    <section className="grid gap-4">
      <h3 className="text-xl font-bold text-dark dark:text-white">
        Step 7: Declaration and Submission <RequiredMark />
      </h3>
      

      <label className="flex items-center gap-2 rounded-lg border border-stroke px-3 py-2 dark:border-dark-3">
        <input
          type="checkbox"
          {...requiredMarkField("Declaration and submission")}
          checked={form.form3DeclarationAccepted === "yes"}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, form3DeclarationAccepted: e.target.checked ? "yes" : "" }))
          }
        />
        <span className="text-sm">
        I {declarationName} hereby certify that: I have read and understood the ethical guidelines for medical and health sciences research. The information provided in this application is accurate and complete to the best of my knowledge. I will conduct this research strictly according to the approved protocol. I will report all adverse events and protocol deviations to my supervisor and the IREB immediately. I will obtain updated approvals if any significant changes to the protocol are necessary. I will not proceed with data collection without formal ethical approval.<RequiredMark />
        </span>
      </label>

     
    </section>
  );
}
