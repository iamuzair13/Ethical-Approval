"use client";

import type { CommonFormProps } from "./form-stepper-types";
import { allInlineRequiredProps, requiredMarkField } from "./form-validation-mark";
import { Required } from "./required";

const REQUIRED_ATTACHMENTS = [
  "Questionnaire/Interview Guide",
  "Participant Consent Form",
  "Participant Information Letter Only",
  "Other Institutional Approval Letter(s) (If applicable)",
];

function buildMedicalEthicsDeclarationParagraph(declarationName: string): string {
  return `I ${declarationName} hereby certify that: I have read and understood the ethical guidelines for medical and health sciences research. The information provided in this application is accurate and complete to the best of my knowledge. I will conduct this research strictly according to the approved protocol. I will report all adverse events and protocol deviations to my supervisor and the IREB immediately. I will obtain updated approvals if any significant changes to the protocol are necessary. I will not proceed with data collection without formal ethical approval.`;
}

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
  const RequiredMark = () => (
    <span
      aria-hidden="true"
      className="ml-1 inline-flex items-center rounded px-1.5 py-0.5 text-lg font-extrabold leading-none text-red-700 dark:text-red-600"
    >
      *
    </span>
  );

  if (currentStep === 0) {
    return (
      <section className="grid gap-4" {...allInlineRequiredProps()}>
        <h3 className="text-xl font-bold text-dark dark:text-white">
          Step 1: Scholar&apos;s Information <RequiredMark />
        </h3>
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
          placeholder="SAP ID / Reg. No"
        />
        <input
          value={form.scholarEmail}
          readOnly
          className="rounded-lg border border-stroke bg-gray-1 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2"
          placeholder="Email"
        />
        <Required label="Research Title *">
          <input
            value={form.publicationTitle}
            onChange={onFieldChange("publicationTitle")}
            placeholder="Research Title *"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
          />
        </Required>
        <Required label="Study Design and Methodology *">
          <textarea
            value={form.publicationMethodology}
            onChange={onFieldChange("publicationMethodology")}
            rows={3}
            placeholder="Study Design and Methodology *"
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
          />
        </Required>
      </section>
    );
  }

  if (currentStep === 1) {
    return (
      <section className="grid gap-4" {...allInlineRequiredProps()}>
        <h3 className="text-xl font-bold text-dark dark:text-white">
          Step 2: Ethical Considerations <RequiredMark />
        </h3>
        <Required label="Human subjects involved? *">
          <select
            value={form.publicationHumanSubjects}
            onChange={onFieldChange("publicationHumanSubjects")}
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
          >
            <option value="">Human subjects involved?</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
        <Required label="Informed consent from participants/patients? *">
          <select
            value={form.publicationInformedConsent}
            onChange={onFieldChange("publicationInformedConsent")}
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
          >
            <option value="">Did the research obtain informed consent from participants/patients?</option>
            <option>Written informed consent</option>
            <option>Oral informed consent</option>
            <option>Waived consent</option>
            <option>Not applicable</option>
          </select>
        </Required>
      </section>
    );
  }

  if (currentStep === 2) {
    return (
      <section className="grid gap-4" {...allInlineRequiredProps()}>
        <h3 className="text-xl font-bold text-dark dark:text-white">
          Step 3: Data Integrity and Permissions <RequiredMark />
        </h3>
        <Required label="Data accurate? *">
          <select
            value={form.publicationDataAccurate}
            onChange={onFieldChange("publicationDataAccurate")}
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
          >
            <option value="">Data accurate?</option>
            <option>Yes</option>
            <option>No</option>
            <option>Partial disclosure</option>
          </select>
        </Required>
      </section>
    );
  }

  if (currentStep === 3) {
    return (
      <section className="grid gap-4" {...allInlineRequiredProps()}>
        <h3 className="text-xl font-bold text-dark dark:text-white">
          Step 4: Institutional Approvals & Collaboration <RequiredMark />
        </h3>
        <Required label="Has your research received institutional funding? *">
          <select
            value={form.institutionalFunding}
            onChange={onFieldChange("institutionalFunding")}
            className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
          >
            <option value="">Has your research received institutional funding? </option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </Required>
      </section>
    );
  }

  if (currentStep === 4) {
    return (
      <section className="grid gap-4">
        <h3 className="text-xl font-bold text-dark dark:text-white">
          Step 5: Required Attachments <RequiredMark />
        </h3>
        {REQUIRED_ATTACHMENTS.map((item) => (
          <div key={item} className="rounded border border-stroke px-3 py-2 dark:border-dark-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasCsvOption("requiredAttachments", item)}
                onChange={() => toggleCsvOption("requiredAttachments", item)}
              />
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
                declaration: checked ? buildMedicalEthicsDeclarationParagraph(declarationName) : "",
              };
            });
          }}
        />
        <span className="text-sm">
          I {form.scholarName.trim() || form.applicantName.trim() || "_____________________"} hereby certify that: I
          have read and understood the ethical guidelines for medical and health sciences research. The information
          provided in this application is accurate and complete to the best of my knowledge. I will conduct this
          research strictly according to the approved protocol. I will report all adverse events and protocol
          deviations to my supervisor and the IREB immediately. I will obtain updated approvals if any significant
          changes to the protocol are necessary. I will not proceed with data collection without formal ethical approval.
          <RequiredMark />
        </span>
      </label>
    </section>
  );
}
