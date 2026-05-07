"use client";

import type { CommonFormProps } from "./form-stepper-types";
import {
  allInlineRequiredProps,
  ignoreRequiredValidationProps,
  requiredMarkField,
  requiredSelectionGroupProps,
} from "./form-validation-mark";
import { Required } from "./required";

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
  const RequiredMark = () => (
    <span className="ml-1 font-extrabold text-red-600 dark:text-red-400">*</span>
  );

  if (currentStep === 0) {
    return (
      <section className="grid gap-6" >
        <h3 className="text-xl font-bold text-dark dark:text-white">
          Step 1: Scholar&apos;s Information
        </h3>

        <div className="grid gap-4 rounded-lg border border-stroke p-4 dark:border-dark-3">
          <h4 className="font-semibold text-dark dark:text-white">
            1.1 Scholar&apos;s Information
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            <input value={form.scholarName} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Scholar's Name (Auto fetch)" />
            <input value={form.scholarSapId} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="SAP ID (Auto fetch)" />
            <input value={form.scholarEmail} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Email (Auto fetch)" />
            <input value={form.scholarFaculty} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Faculty (Dropdown window) Auto fetch" />
            <input value={form.scholarDepartment} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Department (Dropdown window) Auto fetch" />
            <input value={form.scholarProgram} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Program (Dropdown window) Auto fetch" />
          </div>
        </div>

          <h4 className="font-semibold text-dark dark:text-white">1.2 Co-Authors&apos; Information (optional)</h4>

          <div className="grid gap-4">
            <Required label="Please select:">
              <select value={form.publicationCoAuthor1Type} onChange={onFieldChange("publicationCoAuthor1Type")} className="max-w-xs rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
                <option value="UOL">Option 1: UOL</option>
                <option value="External">Option 2: External</option>
              </select>
            </Required>
           
            <div className="grid gap-4 md:grid-cols-2">
              {form.publicationCoAuthor1Type === "UOL" ? (
                <>
                  <Required label="Co-Author SAP ID">
                  <input value={form.publicationAuthor1UolSapId} onChange={onFieldChange("publicationAuthor1UolSapId")} placeholder="Co-Author SAP ID" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full" />
                  </Required>
                  <Required label="Co-Author’s Name">
                  <input value={form.publicationAuthor1UolName} onChange={onFieldChange("publicationAuthor1UolName")} placeholder="Co-Author’s Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full" />
                  </Required>
                  <Required label="Email">
                  <input value={form.publicationAuthor1UolEmail} onChange={onFieldChange("publicationAuthor1UolEmail")} placeholder="Email" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full" />
                  </Required>
                  <Required label="Faculty (Dropdown window)">
                  <select value={form.publicationAuthor1UolFaculty} onChange={onFieldChange("publicationAuthor1UolFaculty")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full"><option value="">Faculty (Dropdown window)</option>{facultyOptions.map((item) => (<option key={item} value={item}>{item}</option>))}</select>
                  </Required>
                  <Required label="Department (Dropdown window)">
                  <select value={form.publicationAuthor1UolDepartment} onChange={onFieldChange("publicationAuthor1UolDepartment")} disabled={!form.publicationAuthor1UolFaculty} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-70 dark:border-dark-3"><option value="">Department (Dropdown window)</option>{getDepartmentsForFaculty(form.publicationAuthor1UolFaculty).map((item) => (<option key={item} value={item}>{item}</option>))}</select>
                  </Required>
                </>
              ) : (
                <>
                  <Required label="Co-Author’s Name">
                  <input value={form.publicationAuthor1ExternalName} onChange={onFieldChange("publicationAuthor1ExternalName")} placeholder="Co-Author’s Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full" />
                  </Required>
                  <Required label="Email">
                  <input value={form.publicationAuthor1ExternalEmail} onChange={onFieldChange("publicationAuthor1ExternalEmail")} placeholder="Email" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full" />
                  </Required>
                  <Required label="University">
                  <input value={form.publicationAuthor1ExternalUniversity} onChange={onFieldChange("publicationAuthor1ExternalUniversity")} placeholder="University" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full" />
                  </Required>
                  <Required label="Faculty">
                  <input value={form.publicationAuthor1ExternalFaculty} onChange={onFieldChange("publicationAuthor1ExternalFaculty")} placeholder="Faculty" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full" />
                  </Required>
                  <Required label="Department">
                  <input value={form.publicationAuthor1ExternalDepartment} onChange={onFieldChange("publicationAuthor1ExternalDepartment")} placeholder="Department" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full" />
                  </Required>
                  


                </>
              )}
          </div>

          <div className="grid gap-4">
            <p className="font-semibold text-dark dark:text-white">Add Another</p>
            <select value={form.publicationCoAuthor2Type} onChange={onFieldChange("publicationCoAuthor2Type")} className="max-w-xs rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
              <option value="UOL">Option 1: UOL</option>
              <option value="External">Option 2: External</option>
            </select>
            <div className="grid gap-4 md:grid-cols-2">
              {form.publicationCoAuthor2Type === "UOL" ? (
                <>
                  <input value={form.publicationAuthor2UolSapId} onChange={onFieldChange("publicationAuthor2UolSapId")} placeholder="SAP ID Auto fetch from SAP database" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.publicationAuthor2UolName} onChange={onFieldChange("publicationAuthor2UolName")} placeholder="Co-Author’s Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.publicationAuthor2UolEmail} onChange={onFieldChange("publicationAuthor2UolEmail")} placeholder="Email Auto fetch from SAP database" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.publicationAuthor2UolFaculty} onChange={onFieldChange("publicationAuthor2UolFaculty")} placeholder="Faculty Auto fetch from SAP database" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.publicationAuthor2UolDepartment} onChange={onFieldChange("publicationAuthor2UolDepartment")} placeholder="Department Auto fetch from SAP database" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                </>
              ) : (
                <>
                  <input value={form.publicationAuthor2ExternalName} onChange={onFieldChange("publicationAuthor2ExternalName")} placeholder="Co-Author’s Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.publicationAuthor2ExternalEmail} onChange={onFieldChange("publicationAuthor2ExternalEmail")} placeholder="Email" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.publicationAuthor2ExternalUniversity} onChange={onFieldChange("publicationAuthor2ExternalUniversity")} placeholder="University" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.publicationAuthor2ExternalFaculty} onChange={onFieldChange("publicationAuthor2ExternalFaculty")} placeholder="Faculty" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.publicationAuthor2ExternalDepartment} onChange={onFieldChange("publicationAuthor2ExternalDepartment")} placeholder="Department" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                </>
              )}
            </div>
          </div>

          <div className="grid gap-4">
            <p className="font-semibold text-dark dark:text-white">Add Another</p>
            <select value={form.publicationCoAuthor3Type} onChange={onFieldChange("publicationCoAuthor3Type")} className="max-w-xs rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
              <option value="UOL">Option 1: UOL</option>
              <option value="External">Option 2: External</option>
            </select>
            <div className="grid gap-4 md:grid-cols-2">
              {form.publicationCoAuthor3Type === "UOL" ? (
                <>
                  <input value={form.publicationAuthor3UolSapId} onChange={onFieldChange("publicationAuthor3UolSapId")} placeholder="SAP ID" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.publicationAuthor3UolName} onChange={onFieldChange("publicationAuthor3UolName")} placeholder="Co-Author’s Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.publicationAuthor3UolEmail} onChange={onFieldChange("publicationAuthor3UolEmail")} placeholder="Email" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <select value={form.publicationAuthor3UolFaculty} onChange={onFieldChange("publicationAuthor3UolFaculty")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Faculty (Dropdown window)</option>{facultyOptions.map((item) => (<option key={item} value={item}>{item}</option>))}</select>
                  <select value={form.publicationAuthor3UolDepartment} onChange={onFieldChange("publicationAuthor3UolDepartment")} disabled={!form.publicationAuthor3UolFaculty} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-70 dark:border-dark-3"><option value="">Department (Dropdown window)</option>{getDepartmentsForFaculty(form.publicationAuthor3UolFaculty).map((item) => (<option key={item} value={item}>{item}</option>))}</select>
                </>
              ) : (
                <>
                  <input value={form.publicationAuthor3ExternalName} onChange={onFieldChange("publicationAuthor3ExternalName")} placeholder="Co-Author’s Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.publicationAuthor3ExternalEmail} onChange={onFieldChange("publicationAuthor3ExternalEmail")} placeholder="Email" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.publicationAuthor3ExternalUniversity} onChange={onFieldChange("publicationAuthor3ExternalUniversity")} placeholder="University" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.publicationAuthor3ExternalFaculty} onChange={onFieldChange("publicationAuthor3ExternalFaculty")} placeholder="Faculty" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                  <input value={form.publicationAuthor3ExternalDepartment} onChange={onFieldChange("publicationAuthor3ExternalDepartment")} placeholder="Department" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 rounded-lg border border-stroke p-4 dark:border-dark-3 md:grid-cols-2">
          <h4 className="font-semibold text-dark dark:text-white md:col-span-2">
            1.3 Research Details
          </h4>
          <Required label="Research Title *">
            <input value={form.publicationTitle} onChange={onFieldChange("publicationTitle")} placeholder="a) Research Title (required)" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full" />
          </Required>
          <Required label="Research Objective 1 *">
            <textarea value={form.publicationObjective1} onChange={onFieldChange("publicationObjective1")} rows={2} placeholder="b) Research Objectives (required): 1." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full" />
          </Required>
          <Required label="Research Objective 2 *">
            <textarea value={form.publicationObjective2} onChange={onFieldChange("publicationObjective2")} rows={2} placeholder="2." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full" />
          </Required>
          <Required label="Research Objective 3 *">
            <textarea value={form.publicationObjective3} onChange={onFieldChange("publicationObjective3")} rows={2} placeholder="3." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full" />
          </Required>

          <Required label="c) Please select relevant Sustainable Development Goals (multiple options can also be selected) as per your research: (required)">
            <div className="grid gap-2 sm:grid-cols-2">
              {SDGS.map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hasCsvOption("sdgs", item)} onChange={() => toggleCsvOption("sdgs", item)} />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </Required>

          <Required label="Research Methodology *">
            <textarea value={form.publicationMethodology} onChange={onFieldChange("publicationMethodology")} rows={4} placeholder="d) Research Methodology (Methods and Materials) (required)" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
          </Required>
          <Required label="Participants estimate *">
            <select value={form.publicationParticipantsEstimate} onChange={onFieldChange("publicationParticipantsEstimate")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
              <option value="">e) How many participants will you be recruiting? (required)</option>
              <option>1-20</option><option>21-50</option><option>51-100</option><option>101-150</option><option>151-200</option><option>201-300</option><option>301-400</option><option>401-500</option><option>501+</option>
            </select>
          </Required>

          <div
            className="rounded-lg border border-stroke p-3 dark:border-dark-3 md:col-span-2"
            {...requiredSelectionGroupProps("Research population (multiple select)")}
          >
            <p className="mb-2 text-sm font-semibold text-dark dark:text-white">
              f) Select Research Population (type): (required) (dropdown window, Multiple select)
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                "University students",
                "Faculty members",
                "Librarians",
                "Patients/healthcare workers",
                "Children/minors",
                "General adults",
                "Employees/staff members",
                "Other (specify in methodology)",
              ].map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hasCsvOption("publicationPopulationType", item)} onChange={() => toggleCsvOption("publicationPopulationType", item)} />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (currentStep === 1) {
    return (
      <section className="grid gap-4 md:grid-cols-2" {...allInlineRequiredProps()}>
        <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">
          Step 2: Ethical Considerations
        </h3>
        <Required
          label="2.1 Does the article report findings from research involving human participants? *"
          className="md:col-span-2"
        >
          <select value={form.publicationHumanSubjects} onChange={onFieldChange("publicationHumanSubjects")} className="mt-2 rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full"><option value="">Select</option><option>Yes</option><option>No</option></select>
        </Required>
        <Required label="2.2 How participants will be recruited? (Select) (Multiple Select)?">
          <div className="grid gap-2 sm:grid-cols-2">
            {["Emails","Google Forms/ Online Surveys","Social Media (Facebook, Instagram, etc.)","LinkedIn (professional networking platforms)","Institutional Mailing Lists","Online forms","Academic Networks","In-person","Other"].map((item) => (
              <label key={item} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasCsvOption("publicationRecruitmentChannels", item)} onChange={() => toggleCsvOption("publicationRecruitmentChannels", item)} /><span>{item}</span></label>
            ))}
          </div>
          </Required>
        <Required label="2.3 Will participants provide informed consent? *" className="grid gap-2">
          <select value={form.publicationInformedConsent} onChange={onFieldChange("publicationInformedConsent")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full">
            <option value="">Select</option>
            <option>Written Consent</option>
            <option>Oral Consent</option>
            <option>Waived</option>
            <option>N/A</option>
          </select>
        </Required>
        <Required label="2.4 Have any research data been collected prior to receiving ethical approval? *" className="grid gap-2">
          <select value={form.preApprovalDataCollected} onChange={onFieldChange("preApprovalDataCollected")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
        <Required label="2.5 Can participants withdraw from the study at any time? *" className="grid gap-2">
          <select value={form.canWithdraw} onChange={onFieldChange("canWithdraw")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
        <Required label="2.6 Will participants receive any compensation? *" className="grid gap-2">
          <select value={form.compensation} onChange={onFieldChange("compensation")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
        <Required label="2.7 How are participants&apos; confidentiality and data privacy protected in the research? (required)">
          <div className="grid gap-2 sm:grid-cols-2">
            {["Anonymization/Pseudonymization","Secure Storage (Electronic/Physical)","Access Restrictions and Confidentiality Agreements","No Disclosure of Identity","Others"].map((item) => (
              <label key={item} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasCsvOption("confidentialityOptions", item)} onChange={() => toggleCsvOption("confidentialityOptions", item)} /><span>{item}</span></label>
            ))}
          </div>
          {hasCsvOption("confidentialityOptions", "Others") && (
            <input value={form.confidentialityOptionsOther ?? ""} onChange={onFieldChange("confidentialityOptionsOther")} placeholder="Others, please specific" className="mt-3 w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          )}
        </Required>
        <Required label="2.8 Does your research involve any vulnerable populations? *" className="grid gap-2 md:col-span-2">
          <select value={form.vulnerablePopulation} onChange={onFieldChange("vulnerablePopulation")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
            <option>N/A</option>
          </select>
        </Required>
        <Required label="2.9 Does the manuscript address sensitive topics or potentially stigmatizing information? *" className="grid gap-2">
          <select value={form.publicationSensitiveHealthTopics} onChange={onFieldChange("publicationSensitiveHealthTopics")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
        {form.publicationSensitiveHealthTopics === "Yes" && (
          <Required label="2.9 Details for sensitive topics *" className="md:col-span-2">
            <textarea value={form.publicationSensitiveTopicsDetails ?? ""} onChange={onFieldChange("publicationSensitiveTopicsDetails")} rows={3} placeholder="If 'Yes', explain how such information is presented responsibly." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full" />
          </Required>
        )}
        <Required label="2.10 How long will the collected data be retained? *" className="grid gap-2">
          <select value={form.dataRetentionYears} onChange={onFieldChange("dataRetentionYears")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full">
            <option value="">Select</option>
            <option>1-5 years</option>
            <option>6-10 years</option>
            <option>11-15 years</option>
            <option>More than 16 years</option>
          </select>
        </Required>
        {form.dataRetentionYears === "More than 16 years" && (
          <Required label="2.10 Longer retention reason *" className="md:col-span-2">
            <textarea value={form.longRetentionReason} onChange={onFieldChange("longRetentionReason")} rows={3} placeholder="If you have selected “More than 16 years,” please further explain the need for keeping data for a longer time." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
          </Required>
        )}
        <Required label="2.11 Is this manuscript being submitted simultaneously to multiple journals? *" className="grid gap-2">
          <select value={form.publicationSimultaneousJournals} onChange={onFieldChange("publicationSimultaneousJournals")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
        <Required label="2.12 Are there any undisclosed conflicts of interest? *" className="grid gap-2">
          <select value={form.publicationConflictsUndisclosed} onChange={onFieldChange("publicationConflictsUndisclosed")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
            <option>Undecided</option>
          </select>
        </Required>
        {form.publicationConflictsUndisclosed === "Yes" && (
          <Required label="2.12 Conflict disclosure details *" className="md:col-span-2">
            <textarea value={form.publicationConflictDisclosureDetails} onChange={onFieldChange("publicationConflictDisclosureDetails")} rows={3} placeholder="If 'Yes', provide full disclosure below." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full" />
          </Required>
        )}
        <Required label="2.13 Does your research have any potential adverse effects or risks? *" className="grid gap-2">
          <select value={form.publicationHasRisks ?? ""} onChange={onFieldChange("publicationHasRisks")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
        {form.publicationHasRisks === "Yes" && (
          <Required label="2.13 Risk details *" className="md:col-span-2">
            <textarea value={form.publicationPotentialRisks} onChange={onFieldChange("publicationPotentialRisks")} rows={3} placeholder="If yes, further elaborate." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full" />
          </Required>
        )}
        <Required label="2.14 Are third-party copyrights or permissions required? *" className="grid gap-2">
          <select value={form.publicationThirdPartyPermissions} onChange={onFieldChange("publicationThirdPartyPermissions")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
        {form.publicationThirdPartyPermissions === "Yes" && (
          <Required label="2.14 Third-party permission details *" className="md:col-span-2">
            <textarea value={form.publicationThirdPartyPermissionDetails} onChange={onFieldChange("publicationThirdPartyPermissionDetails")} rows={3} placeholder="If 'Yes', confirm all permissions have been obtained." className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full" />
          </Required>
        )}
      </section>
    );
  }

  if (currentStep === 2) {
    return (
      <section className="grid gap-4 md:grid-cols-2" {...allInlineRequiredProps()}>
        <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">
          Step 3: Institutional Approvals & Collaboration
        </h3>
        <Required label="3.1 Has your research received institutional funding? *" className="grid gap-2">
          <select value={form.institutionalFunding} onChange={onFieldChange("institutionalFunding")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
        <Required label="3.2 Has your research received external funding? *" className="grid gap-2">
          <select value={form.externalFunding} onChange={onFieldChange("externalFunding")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
        <Required label="3.3 Does your research involve an international collaboration? *" className="grid gap-2">
          <select value={form.internationalCollaboration} onChange={onFieldChange("internationalCollaboration")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
        {form.internationalCollaboration === "Yes" && (
          <Required label="3.3 International collaboration details *" className="md:col-span-2">
            <textarea value={form.internationalCollaborationDetails} onChange={onFieldChange("internationalCollaborationDetails")} rows={3} placeholder="If yes, give details (if not provided during step 1)" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2 w-full" />
          </Required>
        )}
        <Required label="3.4 Will your research be conducted overseas/abroad? *" className="grid gap-2">
          <select value={form.conductedAbroad} onChange={onFieldChange("conductedAbroad")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 w-full">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
        <p className="text-xs text-amber-700 dark:text-amber-300 md:col-span-2">Note: If yes, the concerned institute&apos;s ethical approval form must be attached in the concerned section.</p>
      </section>
    );
  }

  if (currentStep === 3) {
    return (
      <section className="grid gap-4">
        <h3 className="text-xl font-bold text-dark dark:text-white">
          Step 4: Required Attachments
        </h3>
        <div className="grid gap-2">
          {FORM_6_REQUIRED_ATTACHMENTS.map((item) => (
            <div key={item} className="rounded border border-stroke px-3 py-2 dark:border-dark-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={hasCsvOption("requiredAttachments", item)} onChange={() => toggleCsvOption("requiredAttachments", item)} />
                  <span className="text-sm">
                    {item}
                    {FORM_6_MANDATORY_ATTACHMENT_SET.has(item) ? (
                      <RequiredMark />
                    ) : (
                      <span className="ml-1.5 text-xs font-normal text-body dark:text-dark-6">
                        (if applicable)
                      </span>
                    )}
                  </span>
                </label>
                <label className="cursor-pointer rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10">Upload document<input type="file" className="hidden" onChange={handleRequiredAttachmentUpload(item)} /></label>
              </div>
              {attachmentFiles[item] && <p className="mt-2 text-xs text-body">Selected: {attachmentFiles[item]}</p>}
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      <h3 className="text-xl font-bold text-dark dark:text-white">
        Step 5: Declaration and Submission <RequiredMark />
      </h3>
      <label className="flex items-start gap-2 rounded-lg border border-stroke px-3 py-2 dark:border-dark-3">
        <input
          type="checkbox"
          {...requiredMarkField("Declaration and submission")}
          className="mt-1 shrink-0"
          checked={form.form3DeclarationAccepted === "yes"}
          onChange={(e) => {
            const checked = e.target.checked;
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
        />
        <span className="text-sm">
          I/We {form.scholarName.trim() || form.applicantName.trim() || "______________"} hereby
          certify that: this manuscript is original, not previously published. All research involving
          human subjects was conducted with appropriate ethical approval. All participant identities
          are adequately protected and anonymized where required. All funding sources and conflicts
          of interest have been disclosed. The manuscript adheres to ethical guidelines for
          responsible reporting and representation. All authors have consented to this submission and
          agree with the content.
        </span>
      </label>
    </section>
  );
}
