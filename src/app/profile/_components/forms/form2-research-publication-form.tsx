"use client";

import { Children, isValidElement } from "react";
import type { CommonFormProps } from "./form-stepper-types";
import {
  allInlineRequiredProps,
  ignoreRequiredValidationProps,
  requiredMarkField,
  requiredSelectionGroupProps,
} from "./form-validation-mark";
import { Required } from "./required";

/* ============================================
   CONSTANTS (unchanged)
   ============================================ */
const FORM_2_REQUIRED_ATTACHMENTS = [
  "Questionnaire/Interview Guide",
  "Participant Consent Form (Qualitative and mix-methods research with selective participations)",
  "Participant Information Letter Only (Quantitative research)",
  "Other Instituittional Approval Letter(s) (if applicable)",
];

const FORM_2_MANDATORY_ATTACHMENTS = [
  FORM_2_REQUIRED_ATTACHMENTS[0],
  FORM_2_REQUIRED_ATTACHMENTS[2],
] as const;

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

const RESEARCH_POPULATION_OPTIONS = [
  "University students",
  "Faculty members",
  "Librarians",
  "Patients/healthcare workers",
  "Children/minors",
  "General adults",
  "Employees/staff members",
  "Other (specify in methodology)",
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

const CONFIDENTIALITY_OPTIONS = [
  "Anonymization/Pseudonymization",
  "Secure Storage (Electronic/Physical)",
  "Access Restrictions and Confidentiality Agreements",
  "No Disclosure of Identity",
  "Others",
] as const;

/* ============================================
   UI PRIMITIVES (purely presentational)
   ============================================ */

const baseInputClasses =
  "w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm text-dark transition-colors placeholder:text-body/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-dark-3 dark:text-white dark:placeholder:text-dark-6";

const readOnlyInputClasses =
  "w-full rounded-lg border border-stroke bg-gray-1 px-4 py-3 text-sm text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white";

const selectClasses = `${baseInputClasses} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_12px_center] bg-no-repeat pr-10`;

const disabledSelectClasses =
  "w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm text-dark opacity-70 cursor-not-allowed dark:border-dark-3 dark:text-white";

function FormSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-dark-2 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h4 className={`text-base font-semibold text-dark dark:text-white ${className}`}>
      {children}
    </h4>
  );
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xl font-bold tracking-tight text-dark dark:text-white">
      {children}
    </h3>
  );
}

function RequiredMark() {
  return <span className="ml-1 text-red-600 dark:text-red-400">*</span>;
}

function RequiredLabel({ label, required = true }: { label: string; required?: boolean }) {
  return (
    <span className="text-sm font-medium text-dark dark:text-white">
      {label}
      {required && <RequiredMark />}
    </span>
  );
}

function FieldRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid gap-4 md:grid-cols-2 ${className}`}>
      {children}
    </div>
  );
}

function FieldGroup({
  label,
  required,
  children,
  className = "",
  fullWidth = false,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}) {
  const hasRequiredWrapper = Children.toArray(children).some(
    (child) => isValidElement(child) && child.type === Required,
  );

  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? "md:col-span-2" : ""} ${className}`}>
      {!hasRequiredWrapper && <RequiredLabel label={label} required={required} />}
      {children}
    </div>
  );
}

function CheckboxGroup({
  options,
  checkedFn,
  toggleFn,
  columns = 2,
}: {
  options: readonly string[] | string[];
  checkedFn: (item: string) => boolean;
  toggleFn: (item: string) => void;
  columns?: 1 | 2;
}) {
  return (
    <div className={`grid gap-2 ${columns === 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
      {options.map((item) => (
        <label
          key={item}
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-stroke p-3 transition-colors hover:bg-gray-1 dark:border-dark-3 dark:hover:bg-dark-3"
        >
          <input
            type="checkbox"
            checked={checkedFn(item)}
            onChange={() => toggleFn(item)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span className="text-sm leading-snug text-dark dark:text-white">{item}</span>
        </label>
      ))}
    </div>
  );
}

function RadioSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  options: readonly string[] | string[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={selectClasses}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

/* ============================================
   UTILITY (unchanged)
   ============================================ */
function buildMedicalEthicsDeclarationParagraph(declarationName: string): string {
  return `I ${declarationName} hereby certify that: I have read and understood the ethical guidelines for medical and health sciences research. The information provided in this application is accurate and complete to the best of my knowledge. I will conduct this research strictly according to the approved protocol. I will report all adverse events and protocol deviations to my supervisor and the IREB immediately. I will obtain updated approvals if any significant changes to the protocol are necessary. I will not proceed with data collection without formal ethical approval.`;
}

/* ============================================
   MAIN COMPONENT
   ============================================ */
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
  const onValueChange =
    (key: keyof typeof form) =>
    (val: string) =>
      setForm((prev) => ({ ...prev, [key]: val }));
  /* ---------- STEP 0: Scholar Information ---------- */
  if (currentStep === 0) {
    return (
      <section className="flex flex-col gap-6">
        <StepTitle>
          Step 1: Scholar&apos;s Information <RequiredMark />
        </StepTitle>

        {/* 1.1 Scholar's Info */}
        <FormSection>
          <SectionTitle className="mb-4">1.1 Scholar&apos;s Information</SectionTitle>
          <FieldRow>
            <input value={form.scholarName} readOnly className={readOnlyInputClasses} placeholder="Scholar's Name" />
            <input value={form.scholarSapId} readOnly className={readOnlyInputClasses} placeholder="SAP ID / Reg. No" />
            <input value={form.scholarEmail} readOnly className={readOnlyInputClasses} placeholder="Email" />
            <input value={form.scholarFaculty} readOnly className={readOnlyInputClasses} placeholder="Faculty" />
            <input value={form.scholarDepartment} readOnly className={readOnlyInputClasses} placeholder="Department" />
            <input value={form.scholarProgram} readOnly className={readOnlyInputClasses} placeholder="Program" />
          </FieldRow>
        </FormSection>

        {/* 1.2 Coauthor's Info */}
        <FormSection>
          <SectionTitle className="mb-4 md:col-span-2">1.2 Coauthor&apos;s Information</SectionTitle>
          <FieldRow>
            <FieldGroup label="Co-author SAP ID" required>
              <Required label="Co-author SAP ID *">
                <input
                  value={form.coauthorSapId}
                  onChange={onFieldChange("coauthorSapId")}
                  placeholder="Co-author SAP ID"
                  className={baseInputClasses}
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="Coauthor's Name" required>
              <Required label="Coauthor's Name *">
                <input
                  value={form.coauthorName}
                  onChange={onFieldChange("coauthorName")}
                  placeholder="Co-author's Name"
                  className={baseInputClasses}
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="Co-author Email" required>
              <Required label="Co-author Email *">
                <input
                  value={form.coauthorEmail}
                  onChange={onFieldChange("coauthorEmail")}
                  placeholder="Co-author Email"
                  className={baseInputClasses}
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="Co-author Faculty" required>
              <Required label="Co-author Faculty *">
                <select
                  value={form.coauthorFaculty}
                  onChange={onFieldChange("coauthorFaculty")}
                  className={selectClasses}
                >
                  <option value="">Select Faculty</option>
                  {facultyOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Required>
            </FieldGroup>

            <FieldGroup label="Co-author Department" required>
              <Required label="Co-author Department *">
                <select
                  value={form.coauthorDepartment}
                  onChange={onFieldChange("coauthorDepartment")}
                  disabled={!form.coauthorFaculty}
                  className={!form.coauthorFaculty ? disabledSelectClasses : selectClasses}
                >
                  <option value="">Select Department</option>
                  {getDepartmentsForFaculty(form.coauthorFaculty).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Required>
            </FieldGroup>
          </FieldRow>
        </FormSection>

        {/* 1.3 Add Co-Author */}
        <FormSection {...ignoreRequiredValidationProps()}>
          <SectionTitle className="mb-4">1.3 Add Co-Author</SectionTitle>

          <select
            value={form.publicationCoAuthor1Type}
            onChange={onFieldChange("publicationCoAuthor1Type")}
            className={`${selectClasses} max-w-xs mb-4`}
          >
            <option value="UOL">Option 1: UOL</option>
            <option value="External">Option 2: External</option>
          </select>

          <FieldRow>
            {form.publicationCoAuthor1Type === "UOL" ? (
              <>
                <input
                  value={form.publicationAuthor1UolSapId}
                  onChange={onFieldChange("publicationAuthor1UolSapId")}
                  placeholder="Co-Author SAP ID"
                  className={baseInputClasses}
                />
                <input
                  value={form.publicationAuthor1UolName}
                  onChange={onFieldChange("publicationAuthor1UolName")}
                  placeholder="Coauthor's Name"
                  className={baseInputClasses}
                />
                <input
                  value={form.publicationAuthor1UolEmail}
                  onChange={onFieldChange("publicationAuthor1UolEmail")}
                  placeholder="Email"
                  className={baseInputClasses}
                />
                <select
                  value={form.publicationAuthor1UolFaculty}
                  onChange={onFieldChange("publicationAuthor1UolFaculty")}
                  className={selectClasses}
                >
                  <option value="">Faculty</option>
                  {facultyOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select
                  value={form.publicationAuthor1UolDepartment}
                  onChange={onFieldChange("publicationAuthor1UolDepartment")}
                  disabled={!form.publicationAuthor1UolFaculty}
                  className={!form.publicationAuthor1UolFaculty ? disabledSelectClasses : selectClasses}
                >
                  <option value="">Department</option>
                  {getDepartmentsForFaculty(form.publicationAuthor1UolFaculty).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <input
                  value={form.publicationAuthor1ExternalName}
                  onChange={onFieldChange("publicationAuthor1ExternalName")}
                  placeholder="Co-author Name"
                  className={baseInputClasses}
                />
                <input
                  value={form.publicationAuthor1ExternalEmail}
                  onChange={onFieldChange("publicationAuthor1ExternalEmail")}
                  placeholder="Email"
                  className={baseInputClasses}
                />
                <input
                  value={form.publicationAuthor1ExternalUniversity}
                  onChange={onFieldChange("publicationAuthor1ExternalUniversity")}
                  placeholder="University Name"
                  className={baseInputClasses}
                />
                <select
                  value={form.publicationAuthor1ExternalFaculty}
                  onChange={onFieldChange("publicationAuthor1ExternalFaculty")}
                  className={selectClasses}
                >
                  <option value="">Faculty</option>
                  {facultyOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select
                  value={form.publicationAuthor1ExternalDepartment}
                  onChange={onFieldChange("publicationAuthor1ExternalDepartment")}
                  disabled={!form.publicationAuthor1ExternalFaculty}
                  className={!form.publicationAuthor1ExternalFaculty ? disabledSelectClasses : selectClasses}
                >
                  <option value="">Department</option>
                  {getDepartmentsForFaculty(form.publicationAuthor1ExternalFaculty).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </>
            )}
          </FieldRow>
        </FormSection>

        {/* 1.4 Research Details */}
        <FormSection>
          <SectionTitle className="mb-4 md:col-span-2">1.4 Research Details <RequiredMark /></SectionTitle>

          <FieldRow>
            <FieldGroup label="Research Title" required fullWidth>
              <Required label="Research Title *">
                <input
                  value={form.publicationTitle}
                  onChange={onFieldChange("publicationTitle")}
                  placeholder="Research Title"
                  className={baseInputClasses}
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="Research Objective 1" required fullWidth>
              <Required label="Research Objective 1 *">
                <textarea
                  value={form.publicationObjective1}
                  onChange={onFieldChange("publicationObjective1")}
                  rows={2}
                  placeholder="Research Objective 1"
                  className={baseInputClasses}
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="Research Objective 2" required fullWidth>
              <Required label="Research Objective 2 *">
                <textarea
                  value={form.publicationObjective2}
                  onChange={onFieldChange("publicationObjective2")}
                  rows={2}
                  placeholder="Research Objective 2"
                  className={baseInputClasses}
                />
              </Required>
            </FieldGroup>

            
              <textarea
                value={form.publicationObjective3}
                onChange={onFieldChange("publicationObjective3")}
                rows={2}
                placeholder="Research Objective 3"
                className={baseInputClasses}
              />
            

            
              <textarea
                value={form.publicationObjective4}
                onChange={onFieldChange("publicationObjective4")}
                rows={2}
                placeholder="Research Objective 4"
                className={baseInputClasses}
              />
           

            <FieldGroup
              label="Please select relevant Sustainable Development Goals (multiple select)"
              required
              fullWidth
            >
              <Required
                label="Please select relevant Sustainable Development Goals (multiple select) *"
                kind="selection"
              >
                <CheckboxGroup
                  options={SDG_OPTIONS}
                  checkedFn={(item) => hasCsvOption("sdgs", item)}
                  toggleFn={(item) => toggleCsvOption("sdgs", item)}
                  columns={2}
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="Research Methodology (Methods and Materials)" required fullWidth>
              <Required label="Research Methodology (Methods and Materials) *">
                <textarea
                  value={form.publicationMethodology}
                  onChange={onFieldChange("publicationMethodology")}
                  rows={4}
                  placeholder="Research Methodology (Methods and Materials)"
                  className={baseInputClasses}
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="Estimated number of participants" required>
              <Required label="How many participants will you be recruiting? (estimated number) *">
                <select
                  value={form.publicationParticipantsEstimate}
                  onChange={onFieldChange("publicationParticipantsEstimate")}
                  className={selectClasses}
                >
                  <option value="">Select estimated number</option>
                  <option>1-20</option>
                  <option>21-50</option>
                  <option>51-100</option>
                  <option>101-150</option>
                  <option>151-200</option>
                  <option>201-300</option>
                  <option>301-400</option>
                  <option>401-500</option>
                  <option>501+</option>
                </select>
              </Required>
            </FieldGroup>

            <FieldGroup
              label="Select Research Population (type) (multiple select)"
              required
              fullWidth
            >
              <Required
                label="Select Research Population (type) (multiple select) *"
                kind="selection"
              >
                <p className="mb-2 text-sm font-medium text-dark dark:text-white">
                  Select Research Population (type):
                </p>
                <CheckboxGroup
                  options={RESEARCH_POPULATION_OPTIONS}
                  checkedFn={(item) => hasCsvOption("publicationPopulationType", item)}
                  toggleFn={(item) => toggleCsvOption("publicationPopulationType", item)}
                  columns={2}
                />
              </Required>
            </FieldGroup>
          </FieldRow>
        </FormSection>
      </section>
    );
  }

  /* ---------- STEP 1: Ethical Considerations ---------- */
  if (currentStep === 1) {
    return (
      <section className="flex flex-col gap-6">
        <StepTitle>
          Step 2: Ethical Considerations <RequiredMark />
        </StepTitle>

        <FormSection>
          <FieldRow>
            <FieldGroup label="2.1 Does your research involve human participants or human subjects?">
              <Required label="2.1 Does your research involve human participants or human subjects?">
                <RadioSelect
                  value={form.publicationHumanSubjects}
                  onChange={onValueChange("publicationHumanSubjects")}
                  options={["Yes", "No"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>
          </FieldRow>
        </FormSection>

        <FormSection>
          <FieldGroup
            label="2.2 Recruitment channels (multi-select)"
            required
            fullWidth
          >
            <Required label="2.2 Recruitment channels (multi-select) *">
              <CheckboxGroup
                options={RECRUITMENT_CHANNELS}
                checkedFn={(item) => hasCsvOption("publicationRecruitmentChannels", item)}
                toggleFn={(item) => toggleCsvOption("publicationRecruitmentChannels", item)}
                columns={2}
              />
            </Required>
          </FieldGroup>
        </FormSection>

        <FormSection>
          <FieldRow>
            <FieldGroup label="2.3 Informed consent">
              <Required label="2.3 Informed consent">
                <RadioSelect
                  value={form.publicationInformedConsent}
                  onChange={onValueChange("publicationInformedConsent")}
                  options={["Written Consent", "Oral Consent", "Waived", "N/A"]}
                  placeholder="Select consent type"
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="2.4 Data collected prior to ethical approval?">
              <Required label="2.4 Have any research data been collected prior to receiving ethical approval?">
                <RadioSelect
                  value={form.preApprovalDataCollected}
                  onChange={onValueChange("preApprovalDataCollected")}
                  options={["Yes", "No"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="2.5 Can participants withdraw at any time?">
              <Required label="2.5 Can participants withdraw from the study at any time?">
                <RadioSelect
                  value={form.canWithdraw}
                  onChange={onValueChange("canWithdraw")}
                  options={["Yes", "No"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="2.6 Receive compensation?">
              <Required label="2.6 Receive compensation?">
                <RadioSelect
                  value={form.compensation}
                  onChange={onValueChange("compensation")}
                  options={["Yes", "No"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="2.7 Confidentiality options (multi-select)" fullWidth>
              <Required label="2.7 Confidentiality options (multi-select)">
                <CheckboxGroup
                  options={CONFIDENTIALITY_OPTIONS}
                  checkedFn={(item) => hasCsvOption("confidentialityOptions", item)}
                  toggleFn={(item) => toggleCsvOption("confidentialityOptions", item)}
                  columns={2}
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="2.8 Vulnerable populations?" fullWidth>
              <Required label="2.8 Does your research involve any vulnerable populations?">
                <RadioSelect
                  value={form.vulnerablePopulation}
                  onChange={onValueChange("vulnerablePopulation")}
                  options={["Yes", "No", "N/A"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>
          </FieldRow>
        </FormSection>
      </section>
    );
  }

  /* ---------- STEP 2: Institutional Approvals ---------- */
  if (currentStep === 2) {
    return (
      <section className="flex flex-col gap-6">
        <StepTitle>
          Step 3: Institutional Approvals & Collaboration <RequiredMark />
        </StepTitle>

        <FormSection>
          <FieldRow>
            <FieldGroup label="3.1 Has your research received institutional funding?">
              <Required label="3.1 Has your research received institutional funding?">
                <RadioSelect
                  value={form.institutionalFunding}
                  onChange={onValueChange("institutionalFunding")}
                  options={["Yes", "No"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="3.2 Has your research received external funding?">
              <Required label="3.2 Has your research received external funding?">
                <RadioSelect
                  value={form.externalFunding}
                  onChange={onValueChange("externalFunding")}
                  options={["Yes", "No"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="3.3 International collaboration?">
              <Required label="3.3 Does your research involve an international collaboration?">
                <RadioSelect
                  value={form.internationalCollaboration}
                  onChange={onValueChange("internationalCollaboration")}
                  options={["Yes", "No"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>

            <FieldGroup label="3.4 Conducted overseas?">
              <Required label="3.4 Conducted overseas?">
                <RadioSelect
                  value={form.conductedAbroad}
                  onChange={onValueChange("conductedAbroad")}
                  options={["Yes", "No"]}
                  placeholder="Select option"
                />
              </Required>
            </FieldGroup>
          </FieldRow>
        </FormSection>
      </section>
    );
  }

  /* ---------- STEP 3: Required Attachments ---------- */
  if (currentStep === 3) {
    return (
      <section className="flex flex-col gap-6">
        <StepTitle>
          Step 4: Required Attachments <RequiredMark />
        </StepTitle>

        <div className="flex flex-col gap-3">
          {FORM_2_REQUIRED_ATTACHMENTS.map((item) => {
            const isMandatory = FORM_2_MANDATORY_ATTACHMENTS.includes(item);
            const isChecked = hasCsvOption("requiredAttachments", item);
            const hasFile = attachmentFiles[item];

            return (
              <div
                key={item}
                className={`rounded-xl border p-4 transition-colors ${
                  isChecked
                    ? "border-primary bg-primary/5 dark:border-primary/50 dark:bg-primary/10"
                    : "border-stroke bg-white dark:border-dark-3 dark:bg-dark-2"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCsvOption("requiredAttachments", item)}
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                    />
                    <span className="text-sm leading-snug text-dark dark:text-white">
                      {item}
                      {isMandatory ? (
                        <RequiredMark />
                      ) : (
                        <span className="ml-1.5 text-xs font-normal text-body dark:text-dark-6">
                          (optional)
                        </span>
                      )}
                    </span>
                  </label>

                  <label className="cursor-pointer">
                    <span className="inline-flex items-center rounded-lg border border-primary px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white">
                      Upload document
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleRequiredAttachmentUpload(item)}
                    />
                  </label>
                </div>

                {hasFile && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-1 px-3 py-2 dark:bg-dark-3">
                    <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs font-medium text-dark dark:text-white">{hasFile}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  /* ---------- STEP 4: Declaration and Submission ---------- */
  return (
    <section className="flex flex-col gap-6">
      <StepTitle>
        Step 5: Declaration and Submission <RequiredMark />
      </StepTitle>

      <FormSection>
        <label className="flex cursor-pointer items-start gap-4 rounded-lg border border-stroke p-4 transition-colors hover:bg-gray-1 dark:border-dark-3 dark:hover:bg-dark-3">
          <input
            type="checkbox"
            {...requiredMarkField("Declaration and submission")}
            className="mt-1 h-5 w-5 shrink-0 accent-primary"
            checked={form.form3DeclarationAccepted === "yes"}
            onChange={(e) => {
              const checked = e.target.checked;
              setForm((prev) => {
                const declarationName =
                  prev.scholarName.trim() || prev.applicantName.trim() || "_____________________";
                return {
                  ...prev,
                  form3DeclarationAccepted: checked ? "yes" : "",
                  declaration: checked
                    ? buildMedicalEthicsDeclarationParagraph(declarationName)
                    : "",
                };
              });
            }}
          />
          <span className="text-sm leading-relaxed text-dark dark:text-white">
            I{" "}
            <span className="font-semibold">
              {form.scholarName.trim() || form.applicantName.trim() || "_____________________"}
            </span>{" "}
            hereby certify that: I have read and understood the ethical guidelines for medical and
            health sciences research. The information provided in this application is accurate and
            complete to the best of my knowledge. I will conduct this research strictly according to
            the approved protocol. I will report all adverse events and protocol deviations to my
            supervisor and the IREB immediately. I will obtain updated approvals if any
            significant changes to the protocol are necessary. I will not proceed with data
            collection without formal ethical approval.
            <RequiredMark />
          </span>
        </label>
      </FormSection>
    </section>
  );
}