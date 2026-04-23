"use client";

import type { CommonFormProps } from "./form-stepper-types";

const REQUIRED_ATTACHMENTS = [
  "Questionnaire/Interview Guide",
  "Participant Consent Form",
  "Participant Information Letter Only",
  "Other Institutional Approval Letter(s) (If applicable)",
];

export function Form5ResearchPublicationFacultyStaffForm({
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
    return <section className="grid gap-4"><h3 className="text-xl font-bold text-dark dark:text-white">Step 1: Scholar&apos;s Information</h3><input value={form.scholarName} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Scholar's Name" /><input value={form.scholarSapId} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="SAP ID / Reg. No" /><input value={form.scholarEmail} readOnly className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2" placeholder="Email" /><input value={form.publicationTitle} onChange={onFieldChange("publicationTitle")} placeholder="Research Title" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" /><textarea value={form.publicationMethodology} onChange={onFieldChange("publicationMethodology")} rows={3} placeholder="Study Design and Methodology" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" /></section>;
  }

  if (currentStep === 1) {
    return <section className="grid gap-4"><h3 className="text-xl font-bold text-dark dark:text-white">Step 2: Ethical Considerations</h3><select value={form.publicationHumanSubjects} onChange={onFieldChange("publicationHumanSubjects")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Human subjects involved?</option><option>Yes</option><option>No</option></select><select value={form.publicationInformedConsent} onChange={onFieldChange("publicationInformedConsent")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Informed consent</option><option>Written informed consent</option><option>Oral informed consent</option><option>Waived consent</option><option>Not applicable</option></select></section>;
  }

  if (currentStep === 2) {
    return <section className="grid gap-4"><h3 className="text-xl font-bold text-dark dark:text-white">Step 3: Data Integrity and Permissions</h3><select value={form.publicationDataAccurate} onChange={onFieldChange("publicationDataAccurate")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Data accurate?</option><option>Yes</option><option>No</option><option>Partial disclosure</option></select></section>;
  }

  if (currentStep === 3) {
    return <section className="grid gap-4"><h3 className="text-xl font-bold text-dark dark:text-white">Step 4: Institutional Approvals & Collaboration</h3><select value={form.institutionalFunding} onChange={onFieldChange("institutionalFunding")} className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"><option value="">Institutional funding?</option><option>Yes</option><option>No</option></select></section>;
  }

  if (currentStep === 4) {
    return (
      <section className="grid gap-4">
        <h3 className="text-xl font-bold text-dark dark:text-white">Step 5: Required Attachments</h3>
        {REQUIRED_ATTACHMENTS.map((item) => (
          <div key={item} className="rounded border border-stroke px-3 py-2 dark:border-dark-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={hasCsvOption("requiredAttachments", item)} onChange={() => toggleCsvOption("requiredAttachments", item)} />
              <span className="text-sm">{item}</span>
            </label>
            <input type="file" className="mt-2 text-xs" onChange={handleRequiredAttachmentUpload(item)} />
            {attachmentFiles[item] && <p className="mt-1 text-xs text-body">Selected: {attachmentFiles[item]}</p>}
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      <h3 className="text-xl font-bold text-dark dark:text-white">Step 6: Declaration and Submission</h3>
      <textarea value={form.declaration} onChange={onFieldChange("declaration")} rows={5} placeholder="Declaration text" className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3" />
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.publicationDeclarationAccepted === "yes"} onChange={(e) => setForm((prev) => ({ ...prev, publicationDeclarationAccepted: e.target.checked ? "yes" : "" }))} />
        <span>I/We agree and submit.</span>
      </label>
    </section>
  );
}
