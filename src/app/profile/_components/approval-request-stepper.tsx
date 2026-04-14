"use client";

import { cn } from "@/lib/utils";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type RequestPayload = {
  title: string;
  description: string;
  expectedResponseDays: number;
};

type ApprovalRequestStepperProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: RequestPayload) => void;
};

const STEPS = [
  "Researcher & Project Information",
  "Ethical Considerations",
  "Biomedical & Pharmaceutical Aspects",
  "Data Management",
  "Institutional Approvals & Collaboration",
  "Attachments",
  "Declaration & Submission",
];

const INITIAL_FORM = {
  researcherName: "",
  discipline: "",
  supervisorName: "",
  coSupervisorName: "",
  projectTitle: "",
  projectObjectives: "",
  expectedResponseDays: "2",
  classification: "",
  sdgs: "",
  recruitmentMethod: "",
  sensitiveTopics: "",
  consentProcess: "",
  confidentiality: "",
  riskMitigation: "",
  biomedicalDetails: "",
  dataStorageMethod: "",
  cloudServices: "",
  retentionPeriod: "",
  accessToData: "",
  dataSecurity: "",
  futureDataUse: "",
  researchSetting: "",
  fundingSource: "",
  approvalsDetails: "",
  declaration: "",
  applicantName: "",
  submissionDate: "",
};

const DRAFT_STORAGE_KEY = "approval-request-stepper-draft";

type DraftData = {
  form: typeof INITIAL_FORM;
  currentStep: number;
  completedSteps: number[];
  savedAt: string;
};

export default function ApprovalRequestStepper({
  open,
  onClose,
  onSubmit,
}: ApprovalRequestStepperProps) {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [form, setForm] = useState(INITIAL_FORM);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const stepState = useMemo(
    () =>
      STEPS.map((_, index) => ({
        isActive: currentStep === index,
        isDone: completedSteps.has(index),
      })),
    [completedSteps, currentStep],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!mounted || !open) return;

    const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!rawDraft) return;

    try {
      const draft = JSON.parse(rawDraft) as DraftData;
      setForm({ ...INITIAL_FORM, ...draft.form });
      setCurrentStep(
        Number.isInteger(draft.currentStep)
          ? Math.max(0, Math.min(STEPS.length - 1, draft.currentStep))
          : 0,
      );
      setCompletedSteps(new Set(draft.completedSteps ?? []));
      setSaveMessage(`Restored draft from ${new Date(draft.savedAt).toLocaleString()}`);
    } catch {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, [mounted, open]);

  useEffect(() => {
    if (!saveMessage) return;
    const timer = window.setTimeout(() => setSaveMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [saveMessage]);

  if (!mounted || !open) return null;

  const onFieldChange =
    (key: keyof typeof INITIAL_FORM) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const handleNext = () => {
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    if (currentStep < STEPS.length - 1) setCurrentStep((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const resetAndClose = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setForm(INITIAL_FORM);
    setSaveMessage(null);
    onClose();
  };

  const handleSaveProgress = () => {
    const payload: DraftData = {
      form,
      currentStep,
      completedSteps: Array.from(completedSteps),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    setSaveMessage("Progress saved");
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const title = form.projectTitle.trim();
    const description = form.projectObjectives.trim();
    const expectedResponseDays = Number.parseInt(form.expectedResponseDays, 10);

    if (!title || !description || Number.isNaN(expectedResponseDays)) return;

    onSubmit({ title, description, expectedResponseDays });
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    resetAndClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-dark/60 px-4 py-6 backdrop-blur-[2px]">
      <div className="flex h-[min(92vh,980px)] w-full max-w-[1200px] flex-col overflow-hidden rounded-[12px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
        <div className="border-b border-stroke px-6 py-5 dark:border-dark-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-dark dark:text-white">
                Student Research Ethical Review Application
              </h2>
              <p className="mt-2 text-sm">
                Complete each step and submit your ethical review request.
              </p>
            </div>
            <button
              type="button"
              onClick={resetAndClose}
              className="rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
            >
              Close
            </button>
          </div>
        </div>

        <div className="border-b border-stroke bg-gray-1 p-4 dark:border-dark-3 dark:bg-dark-2">
          <div className="flex gap-2 overflow-x-auto">
            {STEPS.map((title, index) => (
              <button
                key={title}
                type="button"
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "shrink-0 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition sm:text-sm",
                  stepState[index]?.isActive &&
                    "border-primary bg-primary text-white dark:border-primary dark:bg-primary",
                  stepState[index]?.isDone &&
                    !stepState[index]?.isActive &&
                    "border-green/60 bg-green/10 text-green",
                  !stepState[index]?.isActive &&
                    !stepState[index]?.isDone &&
                    "border-stroke bg-white text-dark hover:border-primary/50 dark:border-dark-3 dark:bg-gray-dark dark:text-white",
                )}
              >
                {index + 1}. {title}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {currentStep === 0 && (
              <section className="grid gap-5">
                <h3 className="text-xl font-bold text-dark dark:text-white">
                  Researcher and Project Information
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={form.researcherName}
                    onChange={onFieldChange("researcherName")}
                    placeholder="Researcher Name"
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                  />
                  <input
                    value={form.discipline}
                    onChange={onFieldChange("discipline")}
                    placeholder="Discipline / Department"
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                  />
                  <input
                    value={form.supervisorName}
                    onChange={onFieldChange("supervisorName")}
                    placeholder="Supervisor Name"
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                  />
                  <input
                    value={form.coSupervisorName}
                    onChange={onFieldChange("coSupervisorName")}
                    placeholder="Co-Supervisor Name"
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                  />
                  <input
                    value={form.projectTitle}
                    onChange={onFieldChange("projectTitle")}
                    placeholder="Project Title"
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3 md:col-span-2"
                  />
                  <textarea
                    value={form.projectObjectives}
                    onChange={onFieldChange("projectObjectives")}
                    rows={4}
                    placeholder="Project Objectives"
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3 md:col-span-2"
                  />
                  <select
                    value={form.classification}
                    onChange={onFieldChange("classification")}
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                  >
                    <option value="">Research Classification</option>
                    <option>Social Sciences / Humanities</option>
                    <option>Medical Sciences</option>
                    <option>Interdisciplinary</option>
                  </select>
                  <input
                    value={form.expectedResponseDays}
                    onChange={onFieldChange("expectedResponseDays")}
                    type="number"
                    min={1}
                    placeholder="Expected Response (Days)"
                    className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                  />
                </div>
              </section>
            )}

            {currentStep === 1 && (
              <section className="grid gap-4">
                <h3 className="text-xl font-bold text-dark dark:text-white">Ethical Considerations</h3>
                <textarea
                  value={form.recruitmentMethod}
                  onChange={onFieldChange("recruitmentMethod")}
                  rows={4}
                  placeholder="Recruitment Method"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <textarea
                  value={form.sensitiveTopics}
                  onChange={onFieldChange("sensitiveTopics")}
                  rows={4}
                  placeholder="Sensitive Topics / Risks"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <textarea
                  value={form.consentProcess}
                  onChange={onFieldChange("consentProcess")}
                  rows={4}
                  placeholder="Informed Consent Process"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <textarea
                  value={form.confidentiality}
                  onChange={onFieldChange("confidentiality")}
                  rows={4}
                  placeholder="Confidentiality Measures"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <textarea
                  value={form.riskMitigation}
                  onChange={onFieldChange("riskMitigation")}
                  rows={4}
                  placeholder="Risk Mitigation Plan"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
              </section>
            )}

            {currentStep === 2 && (
              <section className="grid gap-4">
                <h3 className="text-xl font-bold text-dark dark:text-white">
                  Biomedical & Pharmaceutical Aspects
                </h3>
                <textarea
                  value={form.biomedicalDetails}
                  onChange={onFieldChange("biomedicalDetails")}
                  rows={6}
                  placeholder="Biomedical / Pharmaceutical Description"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
              </section>
            )}

            {currentStep === 3 && (
              <section className="grid gap-4 md:grid-cols-2">
                <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">
                  Data Management
                </h3>
                <input
                  value={form.dataStorageMethod}
                  onChange={onFieldChange("dataStorageMethod")}
                  placeholder="Data Storage Method"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <input
                  value={form.cloudServices}
                  onChange={onFieldChange("cloudServices")}
                  placeholder="Cloud Services Used"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <input
                  value={form.retentionPeriod}
                  onChange={onFieldChange("retentionPeriod")}
                  placeholder="Retention Period"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <input
                  value={form.accessToData}
                  onChange={onFieldChange("accessToData")}
                  placeholder="Access to Data"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <textarea
                  value={form.dataSecurity}
                  onChange={onFieldChange("dataSecurity")}
                  rows={4}
                  placeholder="Data Security Measures"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3 md:col-span-2"
                />
                <textarea
                  value={form.futureDataUse}
                  onChange={onFieldChange("futureDataUse")}
                  rows={4}
                  placeholder="Data Sharing / Future Use"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3 md:col-span-2"
                />
              </section>
            )}

            {currentStep === 4 && (
              <section className="grid gap-4 md:grid-cols-2">
                <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">
                  Institutional Approvals & Collaboration
                </h3>
                <input
                  value={form.researchSetting}
                  onChange={onFieldChange("researchSetting")}
                  placeholder="Research Setting / Institution"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <input
                  value={form.fundingSource}
                  onChange={onFieldChange("fundingSource")}
                  placeholder="Funding Source"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <textarea
                  value={form.approvalsDetails}
                  onChange={onFieldChange("approvalsDetails")}
                  rows={5}
                  placeholder="Approvals / Collaboration Details"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3 md:col-span-2"
                />
              </section>
            )}

            {currentStep === 5 && (
              <section className="grid gap-4">
                <h3 className="text-xl font-bold text-dark dark:text-white">Attachments</h3>
                <p className="rounded-lg border border-dashed border-stroke p-4 text-sm dark:border-dark-3">
                  Attachment uploads can be integrated later. This step is included in the
                  workflow to preserve your ethical review structure.
                </p>
              </section>
            )}

            {currentStep === 6 && (
              <section className="grid gap-4 md:grid-cols-2">
                <h3 className="text-xl font-bold text-dark dark:text-white md:col-span-2">
                  Declaration & Submission
                </h3>
                <textarea
                  value={form.declaration}
                  onChange={onFieldChange("declaration")}
                  rows={4}
                  placeholder="Declaration of Accuracy and Compliance"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3 md:col-span-2"
                />
                <input
                  value={form.applicantName}
                  onChange={onFieldChange("applicantName")}
                  placeholder="Applicant Name"
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
                <input
                  type="date"
                  value={form.submissionDate}
                  onChange={onFieldChange("submissionDate")}
                  className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
              </section>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-stroke px-6 py-4 dark:border-dark-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="rounded-lg border border-stroke px-4 py-2 font-medium text-dark transition hover:bg-gray-1 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              {saveMessage && <span className="text-xs text-body dark:text-dark-6">{saveMessage}</span>}
              <button
                type="button"
                onClick={handleSaveProgress}
                className="rounded-lg border border-primary px-4 py-2 font-medium text-primary transition hover:bg-primary/10"
              >
                Save Progress
              </button>
              {currentStep < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-opacity-90"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  className="rounded-lg bg-green px-4 py-2 font-medium text-white hover:bg-green/90"
                >
                  Submit Application
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
