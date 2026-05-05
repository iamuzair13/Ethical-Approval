"use client";

import type { CommonFormProps } from "./form-stepper-types";

const FORM_2_REQUIRED_ATTACHMENTS = [
  "Questionnaire/Interview Guide",
  "Participant Consent Form (Qualitative and mix-methods research with selective participations)",
  "Participant Information Letter Only (Quantitative research)",
  "Other Instituittional Approval Letter(s) (if applicable)",
];

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
  const RequiredMark = () => <span className="ml-1 font-extrabold text-red-600 dark:text-red-400">*</span>;
  if (currentStep === 0) {
    return (
      <section className="grid gap-6">
        <h3 className="text-xl font-bold text-dark dark:text-white">Step 1: Scholar&apos;s Information <RequiredMark /></h3>
        <div className="grid gap-4 rounded-lg border border-stroke p-4 dark:border-dark-3">
          <h4 className="font-semibold text-dark dark:text-white">1.1 Scholar&apos;s Information</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <input value={form.scholarName} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Scholar's Name" />
            <input value={form.scholarSapId} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="SAP ID / Reg. No" />
            <input value={form.scholarEmail} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Email" />
            <input value={form.scholarFaculty} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Faculty" />
            <input value={form.scholarDepartment} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Department" />
            <input value={form.scholarProgram} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Program" />
          </div>
        </div>
        <div className="grid gap-4 rounded-lg border border-stroke p-4 dark:border-dark-3 md:grid-cols-2">
          <h4 className="font-semibold text-dark dark:text-white md:col-span-2">1.2 Coauthor&apos;s Information <RequiredMark /></h4>
          <input required value={form.coauthorSapId} onChange={onFieldChange("coauthorSapId")} placeholder="SAP ID *" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          <input required value={form.coauthorName} onChange={onFieldChange("coauthorName")} placeholder="Coauthor's Name *" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          <input required value={form.coauthorEmail} onChange={onFieldChange("coauthorEmail")} placeholder="Email *" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          <select required value={form.coauthorFaculty} onChange={onFieldChange("coauthorFaculty")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3">
            <option value="">Faculty *</option>
            {facultyOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select required value={form.coauthorDepartment} onChange={onFieldChange("coauthorDepartment")} disabled={!form.coauthorFaculty} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-70 dark:border-dark-3">
            <option value="">Department *</option>
            {getDepartmentsForFaculty(form.coauthorFaculty).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 rounded-lg border border-stroke p-4 dark:border-dark-3 md:grid-cols-2">
          <h4 className="font-semibold text-dark dark:text-white md:col-span-2">1.4 Research Details <RequiredMark /></h4>
          <input required value={form.publicationTitle} onChange={onFieldChange("publicationTitle")} placeholder="Research Title *" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
          <textarea required value={form.publicationObjective1} onChange={onFieldChange("publicationObjective1")} rows={2} placeholder="Research Objective 1 *" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
          <textarea required value={form.publicationObjective2} onChange={onFieldChange("publicationObjective2")} rows={2} placeholder="Research Objective 2 *" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
          <textarea required value={form.publicationObjective3} onChange={onFieldChange("publicationObjective3")} rows={2} placeholder="Research Objective 3 *" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
          <textarea required value={form.publicationMethodology} onChange={onFieldChange("publicationMethodology")} rows={4} placeholder="Research Methodology (Methods and Materials) *" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3 md:col-span-2" />
        </div>
      </section>
    );
  }

  if (currentStep === 1) {
    return (
      <section className="grid gap-4 md:grid-cols-2">
        <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">Step 2: Ethical Considerations <RequiredMark /></h3>
        <select required value={form.publicationHumanSubjects} onChange={onFieldChange("publicationHumanSubjects")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.1 Human participants involved?</option><option>Yes</option><option>No</option></select>
        <div className="rounded-lg border border-stroke p-3 dark:border-dark-3 md:col-span-2"><p className="mb-2 text-sm font-semibold text-dark dark:text-white">2.2 Recruitment channels (multi-select)</p><div className="grid gap-2 sm:grid-cols-2">{["Emails","Google Forms/ Online Surveys","Social Media (Facebook, Instagram, etc.)","LinkedIn (professional networking platforms)","Institutional Mailing Lists","Online forms","Academic Networks","In-person","Other"].map((item) => (<label key={item} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasCsvOption("publicationRecruitmentChannels", item)} onChange={() => toggleCsvOption("publicationRecruitmentChannels", item)} /><span>{item}</span></label>))}</div></div>
        <select required value={form.publicationInformedConsent} onChange={onFieldChange("publicationInformedConsent")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.3 Informed consent</option><option>Written Consent</option><option>Oral Consent</option><option>Waived</option><option>N/A</option></select>
        <select required value={form.preApprovalDataCollected} onChange={onFieldChange("preApprovalDataCollected")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.4 Data collected before approval?</option><option>Yes</option><option>No</option></select>
        <select required value={form.canWithdraw} onChange={onFieldChange("canWithdraw")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.5 Participants can withdraw?</option><option>Yes</option><option>No</option></select>
        <select required value={form.compensation} onChange={onFieldChange("compensation")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.6 Receive compensation?</option><option>Yes</option><option>No</option></select>
        <div className="rounded-lg border border-stroke p-3 dark:border-dark-3 md:col-span-2"><p className="mb-2 text-sm font-semibold text-dark dark:text-white">2.7 Confidentiality options (multi-select)</p><div className="grid gap-2 sm:grid-cols-2">{["Anonymization/Pseudonymization","Secure Storage (Electronic/Physical)","Access Restrictions and Confidentiality Agreements","No Disclosure of Identity","Others"].map((item) => (<label key={item} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasCsvOption("confidentialityOptions", item)} onChange={() => toggleCsvOption("confidentialityOptions", item)} /><span>{item}</span></label>))}</div></div>
        <select required value={form.vulnerablePopulation} onChange={onFieldChange("vulnerablePopulation")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.8 Vulnerable populations?</option><option>Yes</option><option>No</option><option>N/A</option></select>
      </section>
    );
  }

  if (currentStep === 2) {
    return (
      <section className="grid gap-4 md:grid-cols-2">
        <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">Step 3: Institutional Approvals & Collaboration <RequiredMark /></h3>
        <select required value={form.institutionalFunding} onChange={onFieldChange("institutionalFunding")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Has your research received institutional funding? </option><option>Yes</option><option>No</option></select>
        <select required value={form.externalFunding} onChange={onFieldChange("externalFunding")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Has your research received external funding? ?</option><option>Yes</option><option>No</option></select>
        <select required value={form.internationalCollaboration} onChange={onFieldChange("internationalCollaboration")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Does your research involve an international collaboration? </option><option>Yes</option><option>No</option></select>
        <select required value={form.conductedAbroad} onChange={onFieldChange("conductedAbroad")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Conducted overseas?</option><option>Yes</option><option>No</option></select>
      </section>
    );
  }

  if (currentStep === 3) {
    return (
      <section className="grid gap-4">
        <h3 className="text-xl font-bold text-dark dark:text-white">Step 4: Required Attachments <RequiredMark /></h3>
        <div className="grid gap-2">
          {FORM_2_REQUIRED_ATTACHMENTS.map((item) => (
            <div key={item} className="rounded border border-stroke px-3 py-2 dark:border-dark-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={hasCsvOption("requiredAttachments", item)} onChange={() => toggleCsvOption("requiredAttachments", item)} />
                  <span className="text-sm">{item}</span>
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
      <h3 className="text-xl font-bold text-dark dark:text-white">Step 5: Declaration and Submission <RequiredMark /></h3>
      <textarea required value={form.declaration} onChange={onFieldChange("declaration")} rows={6} placeholder="I/We certify this manuscript is original and all ethical requirements are met. *" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
    </section>
  );
}
