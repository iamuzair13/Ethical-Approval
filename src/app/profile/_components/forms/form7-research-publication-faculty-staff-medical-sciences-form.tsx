"use client";

import type { CommonFormProps } from "./form-stepper-types";
import { Required } from "./required";
import { requiredMarkField } from "./form-validation-mark";

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

const REQUIRED_ATTACHMENTS = [
  "Questionnaire/Interview Guide",
  "Participant Consent Form",
  "Participant Information Letter Only",
  "Other Institutional Approval Letter(s) (If applicable)",
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
}: CommonFormProps) {
  const RequiredMark = () => (
    <span className="ml-1 font-extrabold text-red-600 dark:text-red-400">*</span>
  );

  if (currentStep === 0) {
    return (
      <section className="flex flex-col gap-6">
        <div>
          <h3 className="text-xl font-bold text-dark dark:text-white">
            ETHICAL REVIEW FORM
          </h3>
          <p className="mt-1 text-sm text-body">
            Research Publication (for Faculty/Staff of Medical Sciences)
          </p>
        </div>

        <h3 className="text-xl font-bold text-dark dark:text-white">
          Step 1: Scholar&apos;s Information <RequiredMark />
        </h3>

        <div className="grid gap-4 rounded-xl border border-stroke p-5 dark:border-dark-3">
          <div className="grid gap-4 md:grid-cols-2">
            <input value={form.scholarName} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Scholar’s Name (Auto fetch)" />
            <input value={form.scholarSapId} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="SAP ID/Reg. No (Auto fetch)" />
            <input value={form.scholarEmail} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Email (Auto fetch)" />
            <input value={form.scholarFaculty} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Faculty (Auto fetch)" />
            <input value={form.scholarDepartment} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Department (Auto fetch)" />
            <input value={form.scholarProgram} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Program (Auto fetch)" />
          </div>
        </div>

        <div className="grid gap-4 rounded-xl border border-stroke p-5 dark:border-dark-3">
          <h4 className="font-semibold text-dark dark:text-white">
            1.2 Co-Authors&apos; Information
          </h4>

          <p className="text-sm font-medium text-dark dark:text-white">(Please select):</p>
          <select value={form.publicationCoAuthor1Type} onChange={onFieldChange("publicationCoAuthor1Type")} className="max-w-xs rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="UOL">Option 1: UOL</option>
            <option value="External">Option 2: External</option>
          </select>

          <div className="grid gap-4 md:grid-cols-2">
            {form.publicationCoAuthor1Type === "UOL" ? (
              <>
                <input value={form.publicationAuthor1UolSapId} onChange={onFieldChange("publicationAuthor1UolSapId")} placeholder="SAP ID" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <input value={form.publicationAuthor1UolName} onChange={onFieldChange("publicationAuthor1UolName")} placeholder="Co-Author’s Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <input value={form.publicationAuthor1UolEmail} onChange={onFieldChange("publicationAuthor1UolEmail")} placeholder="Email" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <input value={form.publicationAuthor1UolFaculty} onChange={onFieldChange("publicationAuthor1UolFaculty")} placeholder="Faculty (Dropdown window)" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <input value={form.publicationAuthor1UolDepartment} onChange={onFieldChange("publicationAuthor1UolDepartment")} placeholder="Department (Dropdown window)" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
              </>
            ) : (
              <>
                <input value={form.publicationAuthor1ExternalName} onChange={onFieldChange("publicationAuthor1ExternalName")} placeholder="Co-Author’s Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <input value={form.publicationAuthor1ExternalEmail} onChange={onFieldChange("publicationAuthor1ExternalEmail")} placeholder="Email" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <input value={form.publicationAuthor1ExternalUniversity} onChange={onFieldChange("publicationAuthor1ExternalUniversity")} placeholder="University" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <input value={form.publicationAuthor1ExternalFaculty} onChange={onFieldChange("publicationAuthor1ExternalFaculty")} placeholder="Faculty" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <input value={form.publicationAuthor1ExternalDepartment} onChange={onFieldChange("publicationAuthor1ExternalDepartment")} placeholder="Department" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
              </>
            )}
          </div>

          <p className="font-semibold text-dark dark:text-white">Add another</p>
          <select value={form.publicationCoAuthor2Type} onChange={onFieldChange("publicationCoAuthor2Type")} className="max-w-xs rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="UOL">Option 1: UOL</option>
            <option value="External">Option 2: External</option>
          </select>
          <div className="grid gap-4 md:grid-cols-2">
            {form.publicationCoAuthor2Type === "UOL" ? (
              <>
                <input value={form.publicationAuthor2UolSapId} onChange={onFieldChange("publicationAuthor2UolSapId")} placeholder="SAP ID (Auto fetch from SAP database)" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <input value={form.publicationAuthor2UolName} onChange={onFieldChange("publicationAuthor2UolName")} placeholder="Co-Author’s Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <input value={form.publicationAuthor2UolEmail} onChange={onFieldChange("publicationAuthor2UolEmail")} placeholder="Email (Auto fetch from SAP database)" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <input value={form.publicationAuthor2UolFaculty} onChange={onFieldChange("publicationAuthor2UolFaculty")} placeholder="Faculty (Auto fetch from SAP database)" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <input value={form.publicationAuthor2UolDepartment} onChange={onFieldChange("publicationAuthor2UolDepartment")} placeholder="Department (Auto fetch from SAP database)" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
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

          <p className="font-semibold text-dark dark:text-white">Add another</p>
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
                <input value={form.publicationAuthor3UolFaculty} onChange={onFieldChange("publicationAuthor3UolFaculty")} placeholder="Faculty (Dropdown window)" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
                <input value={form.publicationAuthor3UolDepartment} onChange={onFieldChange("publicationAuthor3UolDepartment")} placeholder="Department (Dropdown window)" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
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

        <div className="grid gap-4 rounded-xl border border-stroke p-5 dark:border-dark-3 md:grid-cols-2">
          <h4 className="font-semibold text-dark dark:text-white md:col-span-2">
            1.3 Research Details <RequiredMark />
          </h4>

          <Required label="a) Research Title *" className="md:col-span-2">
            <input value={form.publicationTitle} onChange={onFieldChange("publicationTitle")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          </Required>

          <Required label="b) Research Objectives 1 *" className="md:col-span-2">
            <textarea value={form.publicationObjective1} onChange={onFieldChange("publicationObjective1")} rows={2} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          </Required>
          <Required label="b) Research Objectives 2 *" className="md:col-span-2">
            <textarea value={form.publicationObjective2} onChange={onFieldChange("publicationObjective2")} rows={2} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          </Required>
          <Required label="b) Research Objectives 3 *" className="md:col-span-2">
            <textarea value={form.publicationObjective3} onChange={onFieldChange("publicationObjective3")} rows={2} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          </Required>

          <Required
            label="c) Sustainable Development Goals (multiple options) *"
            kind="selection"
            className="rounded-lg border border-stroke p-3 dark:border-dark-3 md:col-span-2"
          >
            <p className="mb-2 text-sm font-semibold text-dark dark:text-white">
              c) Please select relevant Sustainable Development Goals (multiple options can also be selected) as per your research:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SDGS.map((item) => (
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

          <Required label="d) How many participants will you be recruiting? *">
            <select value={form.publicationParticipantsEstimate} onChange={onFieldChange("publicationParticipantsEstimate")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
              <option value="">Select an Estimated Number</option>
              <option>1-20</option><option>21-50</option><option>51-100</option><option>101-150</option><option>151-200</option><option>201-300</option><option>301-400</option><option>401-500</option><option>501+</option>
            </select>
          </Required>

          <Required label="e) Select Research Population (type) *" className="md:col-span-2">
            <select value={form.publicationPopulationType} onChange={onFieldChange("publicationPopulationType")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
              <option value="">Select Research Population (type)</option>
              <option>University students</option>
              <option>Faculty members</option>
              <option>Researchers/Laboratory staff</option>
              <option>Patients/clinical participants</option>
              <option>Specific disease groups/diagnosed patients</option>
              <option>Patients/healthcare workers</option>
              <option>Children/minors</option>
              <option>General adults</option>
              <option>Employees/staff members</option>
              <option>Other (specify in methodology)</option>
            </select>
          </Required>

          <Required label="f) Study Design and Methodology *" className="md:col-span-2">
            <textarea value={form.publicationMethodology} onChange={onFieldChange("publicationMethodology")} rows={5} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          </Required>
        </div>
      </section>
    );
  }

  if (currentStep === 1) {
    return (
      <section className="flex flex-col gap-6">
        <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">
          Step 2: Ethical Considerations <RequiredMark />
        </h3>

        <Required label="2.1 Does the article report findings from research involving human subjects? *" kind="radio" className="md:col-span-2 rounded-lg border border-stroke p-3 dark:border-dark-3">
          <div className="flex flex-wrap gap-6">
            {["Yes", "No"].map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="pubMedicalHumanSubjects" checked={form.publicationHumanSubjects === v} onChange={() => setForm((p) => ({ ...p, publicationHumanSubjects: v }))} />
                <span>{v}</span>
              </label>
            ))}
          </div>
        </Required>

        <Required label="2.2 How will participants be recruited? (Multiple Select) *" kind="selection" className="md:col-span-2 rounded-lg border border-stroke p-3 dark:border-dark-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {RECRUITMENT_CHANNELS.map((item) => (
              <label key={item} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={hasCsvOption("publicationRecruitmentChannels", item)} onChange={() => toggleCsvOption("publicationRecruitmentChannels", item)} />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </Required>

        <Required label="2.3 Did the research obtain informed consent from participants/patients? *" className="md:col-span-2">
          <select value={form.publicationInformedConsent} onChange={onFieldChange("publicationInformedConsent")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Written informed consent</option>
            <option>Oral informed consent</option>
            <option>Waived consent</option>
            <option>Not applicable</option>
          </select>
          <p className="mt-2 text-xs text-body">
            Note: Provide attach the consent form (as per UOL format) in the concerned section [Link of the Form].
          </p>
        </Required>

        <Required label="2.4 Have any research data been collected prior to receiving ethical approval? *" className="md:col-span-2">
          <select value={form.publicationPreApprovalDataCollected} onChange={onFieldChange("publicationPreApprovalDataCollected")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
            <option>Not applicable</option>
          </select>
          <p className="mt-2 text-xs text-body">
            Note: If ‘yes’ is selected, please attach the participant information letter (cover letter) and participant consent form.
          </p>
        </Required>

        <Required label="2.5 Can participants withdraw from the study at any time? *" kind="radio" className="rounded-lg border border-stroke p-3 dark:border-dark-3">
          <div className="flex flex-wrap gap-6">
            {["Yes", "No"].map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="pubMedicalWithdraw" checked={form.publicationCanWithdraw === v} onChange={() => setForm((p) => ({ ...p, publicationCanWithdraw: v }))} />
                <span>{v}</span>
              </label>
            ))}
          </div>
        </Required>

        <Required label="2.6 Will participants receive any compensation? *" kind="radio" className="rounded-lg border border-stroke p-3 dark:border-dark-3">
          <div className="flex flex-wrap gap-6">
            {["Yes", "No"].map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="pubMedicalComp" checked={form.publicationCompensation === v} onChange={() => setForm((p) => ({ ...p, publicationCompensation: v }))} />
                <span>{v}</span>
              </label>
            ))}
          </div>
        </Required>

        <Required label="2.7 Are all patient/participant identities adequately anonymized or de-identified in the manuscript? *" className="md:col-span-2">
          <select value={form.publicationAnonymized} onChange={onFieldChange("publicationAnonymized")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
            <option>Partially</option>
            <option>N/A</option>
          </select>
        </Required>

        <Required label="2.8 Does the manuscript address sensitive health topics? *" kind="radio" className="rounded-lg border border-stroke p-3 dark:border-dark-3">
          <div className="flex flex-wrap gap-6">
            {["Yes", "No"].map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="pubMedicalSensitive" checked={form.publicationSensitiveHealthTopics === v} onChange={() => setForm((p) => ({ ...p, publicationSensitiveHealthTopics: v }))} />
                <span>{v}</span>
              </label>
            ))}
          </div>
        </Required>

        <Required label="2.9 Does the article involve vulnerable patient populations? *" className="md:col-span-2">
          <select value={form.publicationVulnerablePopulation} onChange={onFieldChange("publicationVulnerablePopulation")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
            <option>N/A</option>
          </select>
        </Required>

        <Required label="2.10 Will this research involve biological specimens? *" className="md:col-span-2">
          <select value={form.publicationBiologicalSpecimens} onChange={onFieldChange("publicationBiologicalSpecimens")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
        {form.publicationBiologicalSpecimens === "Yes" && (
          <Required label="If 'Yes', describe collection, storage, handling and biosafety measures. *" className="md:col-span-2">
            <textarea value={form.publicationBiologicalSpecimenDetails} onChange={onFieldChange("publicationBiologicalSpecimenDetails")} rows={3} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          </Required>
        )}

        <Required label="2.11 Does the manuscript involve pharmacological or therapeutic interventions? *" className="md:col-span-2">
          <select value={form.publicationPharmaInterventions} onChange={onFieldChange("publicationPharmaInterventions")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
          <p className="mt-2 text-xs text-body">
            If &apos;Yes&apos;, verify drug names, dosages, and adverse effects are accurately reported. Also attach the approval for pharmaceutical substance use.
          </p>
        </Required>
        {form.publicationPharmaInterventions === "Yes" && (
          <Required label="2.11 Intervention details *" className="md:col-span-2">
            <textarea value={form.publicationPharmaInterventionDetails} onChange={onFieldChange("publicationPharmaInterventionDetails")} rows={3} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          </Required>
        )}

        <Required label="2.12 Will animal subjects be used in this research? *" className="md:col-span-2">
          <select value={form.publicationAnimalSubjects} onChange={onFieldChange("publicationAnimalSubjects")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
        {form.publicationAnimalSubjects === "Yes" && (
          <Required label="If 'Yes', justify use and describe animal care/welfare measures. *" className="md:col-span-2">
            <textarea value={form.publicationAnimalWelfareDetails} onChange={onFieldChange("publicationAnimalWelfareDetails")} rows={3} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          </Required>
        )}

        <Required label="2.13 If yes to 2.12, has approval from the concerned ethics committee been obtained? *" className="md:col-span-2">
          <select value={form.publicationAnimalEthicsApproval} onChange={onFieldChange("publicationAnimalEthicsApproval")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
            <option>Pending</option>
            <option>Not Applicable</option>
          </select>
          <p className="mt-2 text-xs text-body">
            Note: Please attach the approval letter in the required attachments section.
          </p>
        </Required>

        <Required label="2.14 Are there any undisclosed conflicts of interest or funding sources? *" className="md:col-span-2">
          <select value={form.publicationConflictsUndisclosed} onChange={onFieldChange("publicationConflictsUndisclosed")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
            <option>Undecided</option>
          </select>
        </Required>
        {form.publicationConflictsUndisclosed === "Yes" && (
          <Required label="If 'Yes', provide complete disclosure. *" className="md:col-span-2">
            <textarea value={form.publicationConflictDisclosureDetails} onChange={onFieldChange("publicationConflictDisclosureDetails")} rows={3} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          </Required>
        )}

        <Required label="2.15 If applicable, identify all potential risks and adverse effects (physical, psychological, social, legal): *" className="md:col-span-2">
          <textarea value={form.publicationPotentialRisks} onChange={onFieldChange("publicationPotentialRisks")} rows={3} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
        </Required>

        <Required label="2.16 Is this manuscript being submitted simultaneously to multiple journals? *" className="md:col-span-2">
          <select value={form.publicationSimultaneousJournals} onChange={onFieldChange("publicationSimultaneousJournals")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>

        <Required label="2.17 Has this research (or substantially similar research) been previously published? *" className="md:col-span-2">
          <select value={form.publicationPreviouslyPublished} onChange={onFieldChange("publicationPreviouslyPublished")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
      </section>
    );
  }

  if (currentStep === 2) {
    return (
      <section className="flex flex-col gap-6">
        <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">
          Step 3: Data Integrity and Permissions <RequiredMark />
        </h3>

        <Required label="3.1 Will the data be presented accurately and completely in the manuscript? *" className="md:col-span-2">
          <select value={form.publicationDataAccurate} onChange={onFieldChange("publicationDataAccurate")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
            <option>Partial disclosure</option>
          </select>
        </Required>

        <Required label="3.2 Does the article follow relevant reporting guidelines (CONSORT, STROBE, PRISMA, etc.)? *" className="md:col-span-2">
          <select value={form.publicationReportingGuidelines} onChange={onFieldChange("publicationReportingGuidelines")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
            <option>Not applicable</option>
          </select>
        </Required>

        <Required label="3.3 Have all adverse events and safety data been accurately reported? *" className="md:col-span-2">
          <select value={form.publicationAdverseEventsReported} onChange={onFieldChange("publicationAdverseEventsReported")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
            <option>Not applicable</option>
          </select>
        </Required>

        <Required label="3.4 Are there any third-party copyrights or permissions required? *" className="md:col-span-2">
          <select value={form.publicationThirdPartyPermissions} onChange={onFieldChange("publicationThirdPartyPermissions")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
        {form.publicationThirdPartyPermissions === "Yes" && (
          <Required label="If 'Yes', confirm permissions have been obtained and documented. *" className="md:col-span-2">
            <textarea value={form.publicationThirdPartyPermissionDetails} onChange={onFieldChange("publicationThirdPartyPermissionDetails")} rows={3} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          </Required>
        )}
      </section>
    );
  }

  if (currentStep === 3) {
    return (
      <section className="flex flex-col gap-6">
        <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">
          Step 4: Institutional Approvals & Collaboration <RequiredMark />
        </h3>

        <Required label="4.1 Has your research received institutional funding? *" className="w-full">
          <select value={form.institutionalFunding} onChange={onFieldChange("institutionalFunding")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>

        <Required label="4.2 Has your research received external funding? *" className="w-full">
          <select value={form.externalFunding} onChange={onFieldChange("externalFunding")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>

        <Required label="4.3 Does your research involve an international collaboration? *" className="md:col-span-2">
          <select value={form.internationalCollaboration} onChange={onFieldChange("internationalCollaboration")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
        {form.internationalCollaboration === "Yes" && (
          <Required label="If yes, give details (if not provided during step 1) *" className="md:col-span-2">
            <textarea value={form.internationalCollaborationDetails} onChange={onFieldChange("internationalCollaborationDetails")} rows={3} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          </Required>
        )}

        <Required label="4.4 Will your research, or a part of it, be conducted overseas/abroad? *" className="md:col-span-2">
          <select value={form.conductedAbroad} onChange={onFieldChange("conductedAbroad")} className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Select</option>
            <option>Yes</option>
            <option>No</option>
          </select>
          <p className="mt-2 text-xs text-body">
            Note: If yes, the concerned institute&apos;s ethical approval form must be attached in the concerned section.
          </p>
        </Required>
      </section>
    );
  }

  if (currentStep === 4) {
    return (
      <section className="flex flex-col gap-6">
        <h3 className="text-xl font-bold text-dark dark:text-white">
          Step 5: Required Attachments <RequiredMark />
        </h3>
        <div className="grid gap-2">
          {REQUIRED_ATTACHMENTS.map((item) => (
            <div key={item} className="rounded border border-stroke px-3 py-2 dark:border-dark-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasCsvOption("requiredAttachments", item)}
                    onChange={() => toggleCsvOption("requiredAttachments", item)}
                  />
                  <span className="text-sm">{item}</span>
                </label>
                <label className="cursor-pointer rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10">
                  Upload document
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleRequiredAttachmentUpload(item)}
                  />
                </label>
              </div>
              {attachmentFiles[item] && (
                <p className="mt-2 text-xs text-body">Selected: {attachmentFiles[item]}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <h3 className="text-xl font-bold text-dark dark:text-white">
        Step 6: Declaration and Submission <RequiredMark />
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
                prev.scholarName.trim() || prev.applicantName.trim() || "_____________________";
              return {
                ...prev,
                form3DeclarationAccepted: checked ? "yes" : "",
                declaration: checked ? buildMedicalFacultyPublicationDeclaration(declarationName) : "",
              };
            });
          }}
        />
        <span className="text-sm">
          {buildMedicalFacultyPublicationDeclaration(
            form.scholarName.trim() || form.applicantName.trim() || "_____________________",
          )}
        </span>
      </label>
    </section>
  );
}

