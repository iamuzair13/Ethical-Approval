export type ApplicationType = "thesis" | "research-publication";

export type ApprovalFormId =
  | "form1-thesis-non-medical"
  | "form2-publication-non-medical"
  | "form3-thesis-medical"
  | "form4-publication-medical"
  | "form5-publication-faculty-staff"
  | "form6-publication-faculty-non-medical"
  | "form7-publication-faculty-staff-medical";

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
    if (label.includes("medical")) {
      return "form7-publication-faculty-staff-medical";
    }
    return "form5-publication-faculty-staff";
  }
  if (
    requiredForm.applicationType === "research-publication" &&
    (label.includes("faculty non medical") || label.includes("non-medical faculty"))
  ) {
    return "form6-publication-faculty-non-medical";
  }

  return null;
}

export type AdminEthicsFormCatalogEntry = {
  id: ApprovalFormId;
  navTitle: string;
  label: string;
  applicationType: ApplicationType;
};

export const ADMIN_ETHICS_FORM_CATALOG: AdminEthicsFormCatalogEntry[] = [
  {
    id: "form1-thesis-non-medical",
    navTitle: "Form 1 · Thesis (Non-Medical)",
    label: "Form 1 Thesis form Other than Medical Sciences.docx",
    applicationType: "thesis",
  },
  {
    id: "form2-publication-non-medical",
    navTitle: "Form 2 · Publication (Non-Medical)",
    label: "Form 2 Research Publication Form other than medicla sciences.docx",
    applicationType: "research-publication",
  },
  {
    id: "form3-thesis-medical",
    navTitle: "Form 3 · Thesis (Medical)",
    label: "Form 3_Ethical Form For Students Thesis-Projects (for Medical Sciences).docx",
    applicationType: "thesis",
  },
  {
    id: "form4-publication-medical",
    navTitle: "Form 4 · Publication (Medical)",
    label: "Form 4 Research Publication Medical Sciences.docx",
    applicationType: "research-publication",
  },
  {
    id: "form6-publication-faculty-non-medical",
    navTitle: "Form 5 · Faculty Non-Medical",
    label: "Form 6 Research Publication Faculty Non Medical.docx",
    applicationType: "research-publication",
  },
  {
    id: "form7-publication-faculty-staff-medical",
    navTitle: "Form 6 · Faculty Medical Sciences",
    label: "Form 7 Research Publication Faculty Staff Medical Sciences.docx",
    applicationType: "research-publication",
  },
];

export function getAdminFormById(formId: string): RequiredForm | null {
  const entry = ADMIN_ETHICS_FORM_CATALOG.find((item) => item.id === formId);
  if (!entry) return null;
  return {
    id: entry.id,
    label: entry.label,
    href: `/${encodeURI(`studentsfinalforms/${entry.label}`)}`,
    applicationType: entry.applicationType,
  };
}

