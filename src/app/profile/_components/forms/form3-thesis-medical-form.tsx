"use client";

import type { CommonFormProps } from "./form-stepper-types";

const FORM_1_REQUIRED_ATTACHMENTS = [
  "Complete Research Proposal/Protocol",
  "Research Questionnaire/Interview Guide (i.e., focus group guide)",
  "Participant Information Letter (Cover Letter)",
  "Participant Consent Form (Qualitative and mix-methods research with selective participations)",
  "Participant Information Letter Only (Quantitative research)",
  "Approval from Board of Study (BOS) and Board of Faculty (BOF)",
  "Other Institutional Approval Letter(s) (If applicable)",
];

export function Form3ThesisMedicalForm({
  currentStep,
  form,
  onFieldChange,
  setForm,
  hasCsvOption,
  toggleCsvOption,
  attachmentFiles,
  handleRequiredAttachmentUpload,
}: CommonFormProps) {
  if (currentStep === 0) {
    return (
      <section className="grid gap-6">
        <h3 className="text-xl font-bold text-dark dark:text-white">
          Step 1: Researcher(s) and Thesis/Project Information
        </h3>
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
          <h4 className="font-semibold text-dark dark:text-white md:col-span-2">1.2 Supervisor(s)&apos;s Information</h4>
          <input value={form.supervisorSapId} onChange={onFieldChange("supervisorSapId")} placeholder="SAP ID" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          <input value={form.supervisorName} onChange={onFieldChange("supervisorName")} placeholder="Supervisor's Name" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          <input value={form.supervisorEmail} onChange={onFieldChange("supervisorEmail")} placeholder="Email" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          <input value={form.supervisorFaculty} onChange={onFieldChange("supervisorFaculty")} placeholder="Faculty" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
          <input value={form.supervisorDepartment} onChange={onFieldChange("supervisorDepartment")} placeholder="Department" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
        </div>
      </section>
    );
  }

  if (currentStep === 1) {
    return (
      <section className="grid gap-4 md:grid-cols-2">
        <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">Step 2: Ethical Considerations</h3>
        <select value={form.involveHumanParticipants} onChange={onFieldChange("involveHumanParticipants")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.1 Human subjects/patients?</option><option>Yes</option><option>No</option></select>
        <select value={form.collectPii} onChange={onFieldChange("collectPii")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.2 Collect PII?</option><option>Yes</option><option>No</option></select>
        <div className="rounded-lg border border-stroke p-3 dark:border-dark-3 md:col-span-2"><p className="mb-2 text-sm font-semibold text-dark dark:text-white">2.3 Recruitment channels (multi-select)</p><div className="grid gap-2 sm:grid-cols-2">{["Emails","Google Forms/ Online Surveys","Social Media (Facebook, Instagram, etc.)","LinkedIn (professional networking platforms)","Institutional Mailing Lists","Online forms","Academic Networks","In-person","Other"].map((item) => (<label key={item} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasCsvOption("recruitmentChannels", item)} onChange={() => toggleCsvOption("recruitmentChannels", item)} /><span>{item}</span></label>))}</div></div>
        <select value={form.informedConsentType} onChange={onFieldChange("informedConsentType")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">2.4 Informed consent</option><option>Written informed consent</option><option>Oral informed consent (with witness)</option><option>Waiver of consent</option><option>Not applicable</option></select>
      </section>
    );
  }

  if (currentStep === 2) {
    return (
      <section className="grid gap-4 md:grid-cols-2">
        <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">Step 3: Biomedical & Pharmaceutical Aspects</h3>
        <select value={form.publicationPharmaInterventions} onChange={onFieldChange("publicationPharmaInterventions")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Involve pharmaceutical substances/drug administration?</option><option>Yes</option><option>No</option></select>
        <input value={form.drugName} onChange={onFieldChange("drugName")} placeholder="Drug name/classification" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
      </section>
    );
  }

  if (currentStep === 3) {
    return (
      <section className="grid gap-4 md:grid-cols-2">
        <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">Step 4: Data Management</h3>
        <select value={form.dataRetentionYears} onChange={onFieldChange("dataRetentionYears")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Data retention period</option><option>1-5 years</option><option>6-10 years</option><option>11-15 years</option><option>More than 16 years</option></select>
      </section>
    );
  }

  if (currentStep === 4) {
    return (
      <section className="grid gap-4 md:grid-cols-2">
        <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">Step 5: Institutional Approvals & Collaborations</h3>
        <select value={form.institutionalFunding} onChange={onFieldChange("institutionalFunding")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Institutional funding?</option><option>Yes</option><option>No</option></select>
        <select value={form.externalFunding} onChange={onFieldChange("externalFunding")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">External funding?</option><option>Yes</option><option>No</option></select>
      </section>
    );
  }

  if (currentStep === 5) {
    return (
      <section className="grid gap-4">
        <h3 className="text-xl font-bold text-dark dark:text-white">Step 6: Required Attachments</h3>
        <div className="grid gap-2">
          {FORM_1_REQUIRED_ATTACHMENTS.map((item) => (
            <div key={item} className="rounded border border-stroke px-3 py-2 dark:border-dark-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={hasCsvOption("requiredAttachments", item)} onChange={() => toggleCsvOption("requiredAttachments", item)} />
                  <span className="text-sm">{item}</span>
                </label>
                <label className="cursor-pointer rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10">
                  Upload document
                  <input type="file" className="hidden" onChange={handleRequiredAttachmentUpload(item)} />
                </label>
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
      <h3 className="text-xl font-bold text-dark dark:text-white">Step 7: Declaration and Submission</h3>
      <textarea value={form.declaration} onChange={onFieldChange("declaration")} rows={6} placeholder="Declaration for medical thesis form" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
      <label className="flex items-center gap-2 rounded border border-stroke px-3 py-2 dark:border-dark-3"><input type="checkbox" checked={form.form3DeclarationAccepted === "yes"} onChange={(e) => setForm((prev) => ({ ...prev, form3DeclarationAccepted: e.target.checked ? "yes" : "" }))} /><span className="text-sm">I agree with this declaration.</span></label>
    </section>
  );
}
