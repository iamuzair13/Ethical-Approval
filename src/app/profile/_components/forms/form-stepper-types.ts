"use client";

import { type ChangeEvent } from "react";

export type FormState = Record<string, string>;

export type CommonFormProps = {
  currentStep: number;
  form: FormState;
  onFieldChange: (
    key: string,
  ) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  hasCsvOption: (key: string, value: string) => boolean;
  toggleCsvOption: (key: string, value: string) => void;
  attachmentFiles: Record<string, string>;
  handleRequiredAttachmentUpload: (
    attachmentLabel: string,
  ) => (e: ChangeEvent<HTMLInputElement>) => void;
};
