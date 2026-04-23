export type ApplicationType = "thesis" | "research-publication";

export type ApprovalFormId =
  | "form1-thesis-non-medical"
  | "form2-publication-non-medical"
  | "form3-thesis-medical"
  | "form4-publication-medical"
  | "form5-publication-faculty-staff";

export type RequiredForm = {
  id?: ApprovalFormId;
  label: string;
  href: string;
  applicationType: ApplicationType;
};

type FormRegistryEntry = {
  id: ApprovalFormId;
  label: string;
  applicationType: ApplicationType;
  audience: "medical" | "non-medical";
};

const FORM_REGISTRY: FormRegistryEntry[] = [
  {
    id: "form1-thesis-non-medical",
    label: "Form 1 Thesis form Other than Medical Sciences.docx",
    applicationType: "thesis",
    audience: "non-medical",
  },
  {
    id: "form2-publication-non-medical",
    label: "Form 2 Research Publication Form other than medicla sciences.docx",
    applicationType: "research-publication",
    audience: "non-medical",
  },
  {
    id: "form3-thesis-medical",
    label: "Form 3_Ethical Form For Students Thesis-Projects (for Medical Sciences).docx",
    applicationType: "thesis",
    audience: "medical",
  },
  {
    id: "form4-publication-medical",
    label: "Form 4 Research Publication Medical Sciences.docx",
    applicationType: "research-publication",
    audience: "medical",
  },
];

const normalizeFacultyName = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();

const MEDICAL_AND_HEALTH_SCIENCES_FACULTIES = new Set([
  normalizeFacultyName("Faculty of Pharmacy"),
  normalizeFacultyName("Faculty of Allied Health Sciences"),
  normalizeFacultyName("Faculty of Allied Health Science"),
  normalizeFacultyName("Faculty of Medicine and Dentistry"),
  normalizeFacultyName("Faculty of Medicine & Dentistry"),
]);

export function isMedicalAndHealthSciencesFaculty(facultyName: string): boolean {
  const normalized = normalizeFacultyName(facultyName);
  return MEDICAL_AND_HEALTH_SCIENCES_FACULTIES.has(normalized);
}

export function isMedicalPublicationFaculty(facultyName: string): boolean {
  return isMedicalAndHealthSciencesFaculty(facultyName);
}

export function resolveRequiredFormByFaculty(
  applicationType: ApplicationType,
  facultyName: string,
): RequiredForm {
  const isHealthFaculty = isMedicalAndHealthSciencesFaculty(facultyName);
  // Faculty of Pharmacy, Allied Health Sciences, and Medicine & Dentistry follow the
  // "Students' Thesis/Projects (Other than Medical Sciences)" ethical form (Form 1), not Form 3.
  if (applicationType === "thesis" && isHealthFaculty) {
    return resolveRequiredForm("thesis", false);
  }
  return resolveRequiredForm(applicationType, isHealthFaculty);
}

export function resolveRequiredForm(
  applicationType: ApplicationType,
  isMedicalFaculty: boolean,
): RequiredForm {
  const audience: "medical" | "non-medical" = isMedicalFaculty ? "medical" : "non-medical";
  const matched = FORM_REGISTRY.find(
    (entry) => entry.applicationType === applicationType && entry.audience === audience,
  );

  // Registry is static and complete; this fallback protects runtime if entries drift.
  const fallback = FORM_REGISTRY[0];
  const selected = matched ?? fallback;

  return {
    id: selected.id,
    label: selected.label,
    href: `/${encodeURI(`studentsfinalforms/${selected.label}`)}`,
    applicationType: selected.applicationType,
  };
}

export function inferFormIdFromLegacyRequiredForm(
  requiredForm: Pick<RequiredForm, "label" | "applicationType"> | null | undefined,
): ApprovalFormId | null {
  if (!requiredForm) return null;
  const label = requiredForm.label.toLowerCase();

  if (requiredForm.applicationType === "thesis" && label.includes("form 1")) {
    return "form1-thesis-non-medical";
  }
  if (
    requiredForm.applicationType === "research-publication" &&
    label.includes("form 4") &&
    label.includes("medical sciences")
  ) {
    return "form4-publication-medical";
  }
  if (requiredForm.applicationType === "thesis" && label.includes("form 3")) {
    return "form3-thesis-medical";
  }
  if (requiredForm.applicationType === "research-publication" && label.includes("form 2")) {
    return "form2-publication-non-medical";
  }
  if (
    requiredForm.applicationType === "research-publication" &&
    (label.includes("faculty/staff") || label.includes("faculty staff"))
  ) {
    return "form5-publication-faculty-staff";
  }

  return null;
}

