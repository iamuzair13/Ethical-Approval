import { normalizeDepartmentName } from "@/lib/faculty-by-department";

export type DepartmentDomain = "medical" | "non-medical";

/**
 * Fallback domain for departments that cannot be classified (empty, unknown,
 * or administrative units). Non-medical is the conservative default — the
 * medical forms carry medical-sciences-specific fields.
 */
export const DEFAULT_DEPARTMENT_DOMAIN: DepartmentDomain = "non-medical";

/**
 * Hardcoded department lists derived from the official medical /
 * non-medical department sheets (see medical-departments.xlsx and
 * non-medical-departments.xlsx in the repo root).
 *
 * SAP department names vary in spelling, so each canonical entry is
 * followed by known SAP/legacy variants. Matching is done on
 * normalizeDepartmentName() output, with a contains-based fallback.
 */
const MEDICAL_DEPARTMENTS = [
  // Faculty of Sciences
  "Department of Physics",
  "Department of Mathematics and Statistics",
  "Institute of Molecular Biology & Biotech (IMBB-CRiMM)",
  "Institute of Molecular Biology & Biotechnology",
  "Center for Research in Molecular Medicine",
  "Department of Chemistry",
  "Department of Environmental Sciences",
  // Faculty of Medicine and Dentistry
  "University College of Medicine",
  "University College of Dentistry",
  "Department of Medical Education",
  "Health Professional Development & Lifelong",
  "Center for Heath Professional Develoment & Lifelong Learning",
  "Center for Health Professional Development & Lifelong Learning",
  // Faculty of Pharmacy
  "Department of Pharmacy",
  // Faculty of Allied Health Sciences
  "School of Pain & Regenerative Medicine",
  "Pain and Regenerative Medicine",
  "Dept of Health Professional Technologies",
  "Department of Health Professional Technologies",
  "University Inst of Diet & Nutri Sciences",
  "University Institute of Diet & Nutritional Sciences",
  "University Institute of Diet and Nutritional Science",
  "Department of Physical Education & SS",
  "Sports Sciences and Physical Education",
  "Lahore School of Nursing",
  "University Institute of Medical Lab Tech",
  "University Institute of Medical Lab Technology",
  "Dept of Radiological Sciences and MIT",
  "University Institute of Radiological Sciences & Medical Imaging",
  "University Institute of Radiological Sciences and Medical Imaging Technology",
  "University Institute of Physical Therapy",
  "ITH Physical Therapy & Rehabilitation",
  "University Institute of Public Health",
  "Department of Optometry & Vision Science",
  "Department of Optometry and Vision Sciences",
  "Uni. Inst. of Food Science & Technology",
  "University Institute of Food Science & Technology",
  "Department of Rehabilitation Sciences",
  "Dept. of Emerging Allied Health Tech.",
  "Deptt. of Emerging Allied Health Tech.",
  "Department of Emerging Allied Health Technologies",
  "Department of Audiology",
  // Short SAP names seen in synced records
  "CRiMM",
];

const NON_MEDICAL_DEPARTMENTS = [
  // Faculty of Management Sciences
  "Lahore Business School",
  "Lahore School of Aviation",
  "Department of Information Management",
  "Department of Economics",
  "Department of Sports Sciences",
  // Faculty of Social Sciences
  "Lahore School of Behavioural Sciences",
  "Department of Education",
  "School of Integrated Social Science",
  "Department of Islamic Studies",
  "Department of Criminology",
  "Department of Sociology",
  // Faculty of Law
  "M.A Raoof College of Law",
  // Faculty of Arts and Architecture
  "School of Creative Arts",
  "School of Fashion and Textile",
  "School of Architecture",
  // Faculty of Languages and Literature
  "Dept. of English Language and Literature",
  "Department of English Language and Literature",
  "Department of Urdu",
  // Faculty of Engineering and Technology
  "Department of Electrical Engineering",
  "Department of Civil Engineering",
  "Department of Mechanical Engineering",
  "Department of Technology",
  "Department of Computer Engineering",
  // Faculty of Information Technology
  "Department of Computer Sciences & IT",
  "Computer Science and Information Technology",
  "Department of Software Engineering",
  "Department of Intelligent Systems",
  "Intelligent Systems",
  "Department of Artificial Intelligence",
  // Administrative units — not academic departments, but their staff submit
  // through the non-medical publication form.
  "Academy of International Certifications",
  "Center for Skills Develop. & Leadership",
  "Skill Development and Leadership",
  "Strategic Project Management Office",
  "Strategic Project Management Office (LHR)",
];

const DEPARTMENT_DOMAIN_MAP = new Map<string, DepartmentDomain>();
for (const name of MEDICAL_DEPARTMENTS) {
  DEPARTMENT_DOMAIN_MAP.set(normalizeDepartmentName(name), "medical");
}
for (const name of NON_MEDICAL_DEPARTMENTS) {
  DEPARTMENT_DOMAIN_MAP.set(normalizeDepartmentName(name), "non-medical");
}

/**
 * Resolves a SAP department name to "medical" or "non-medical".
 * Returns null when the department cannot be classified — callers
 * should fall back to the unfiltered behavior in that case.
 */
export function getDepartmentDomain(
  department: string | null | undefined,
): DepartmentDomain | null {
  const normalized = normalizeDepartmentName(department ?? "");
  if (!normalized) return null;

  const directMatch = DEPARTMENT_DOMAIN_MAP.get(normalized);
  if (directMatch) return directMatch;

  // Fallback for partial department values seen in SAP snapshots.
  for (const [key, domain] of DEPARTMENT_DOMAIN_MAP) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return domain;
    }
  }
  return null;
}

// ─── Official department directory ───
// The 50 canonical departments from the official medical/non-medical
// department sheets. `code` is the SAP department code, `faculty` the
// grouping shown in the sheets.

export type DepartmentDirectoryEntry = {
  code: string;
  name: string;
  faculty: string;
  domain: DepartmentDomain;
};

export const DEPARTMENT_DIRECTORY: DepartmentDirectoryEntry[] = [
  // Faculty of Sciences — medical
  { code: "111901", name: "Department of Mathematics and Statistics", faculty: "Faculty of Sciences", domain: "medical" },
  { code: "111902", name: "Department of Physics", faculty: "Faculty of Sciences", domain: "medical" },
  { code: "111903", name: "Institute of Molecular Biology & Biotech (IMBB-CRiMM)", faculty: "Faculty of Sciences", domain: "medical" },
  { code: "111904", name: "Center for Research in Molecular Medicine", faculty: "Faculty of Sciences", domain: "medical" },
  { code: "111905", name: "Department of Chemistry", faculty: "Faculty of Sciences", domain: "medical" },
  { code: "111906", name: "Department of Environmental Sciences", faculty: "Faculty of Sciences", domain: "medical" },
  // Faculty of Medicine and Dentistry — medical
  { code: "112101", name: "University College of Medicine", faculty: "Faculty of Medicine and Dentistry", domain: "medical" },
  { code: "112102", name: "University College of Dentistry", faculty: "Faculty of Medicine and Dentistry", domain: "medical" },
  { code: "112103", name: "Department of Medical Education", faculty: "Faculty of Medicine and Dentistry", domain: "medical" },
  { code: "112104", name: "Health Professional Development & Lifelong", faculty: "Faculty of Medicine and Dentistry", domain: "medical" },
  // Faculty of Pharmacy — medical
  { code: "112301", name: "Department of Pharmacy", faculty: "Faculty of Pharmacy", domain: "medical" },
  // Faculty of Allied Health Sciences — medical
  { code: "111907", name: "School of Pain & Regenerative Medicine", faculty: "Faculty of Allied Health Sciences", domain: "medical" },
  { code: "112201", name: "Dept of Health Professional Technologies", faculty: "Faculty of Allied Health Sciences", domain: "medical" },
  { code: "112202", name: "University Inst of Diet & Nutri Sciences", faculty: "Faculty of Allied Health Sciences", domain: "medical" },
  { code: "112203", name: "Department of Physical Education & SS", faculty: "Faculty of Allied Health Sciences", domain: "medical" },
  { code: "112204", name: "Lahore School of Nursing", faculty: "Faculty of Allied Health Sciences", domain: "medical" },
  { code: "112205", name: "University Institute of Medical Lab Tech", faculty: "Faculty of Allied Health Sciences", domain: "medical" },
  { code: "112206", name: "Dept of Radiological Sciences and MIT", faculty: "Faculty of Allied Health Sciences", domain: "medical" },
  { code: "112207", name: "University Institute of Physical Therapy", faculty: "Faculty of Allied Health Sciences", domain: "medical" },
  { code: "112208", name: "University Institute of Public Health", faculty: "Faculty of Allied Health Sciences", domain: "medical" },
  { code: "112209", name: "Department of Optometry & Vision Science", faculty: "Faculty of Allied Health Sciences", domain: "medical" },
  { code: "112210", name: "Uni. Inst. of Food Science & Technology", faculty: "Faculty of Allied Health Sciences", domain: "medical" },
  { code: "112211", name: "Department of Rehabilitation Sciences", faculty: "Faculty of Allied Health Sciences", domain: "medical" },
  { code: "112212", name: "Dept. of Emerging Allied Health Tech.", faculty: "Faculty of Allied Health Sciences", domain: "medical" },
  { code: "112214", name: "Department of Audiology", faculty: "Faculty of Allied Health Sciences", domain: "medical" },
  // Faculty of Management Sciences — non-medical
  { code: "111301", name: "Lahore Business School", faculty: "Faculty of Management Sciences", domain: "non-medical" },
  { code: "111302", name: "Lahore School of Aviation", faculty: "Faculty of Management Sciences", domain: "non-medical" },
  { code: "111303", name: "Department of Information Management", faculty: "Faculty of Management Sciences", domain: "non-medical" },
  { code: "111701", name: "Department of Economics", faculty: "Faculty of Management Sciences", domain: "non-medical" },
  // Faculty of Social Sciences — non-medical
  { code: "111305", name: "Lahore School of Behavioural Sciences", faculty: "Faculty of Social Sciences", domain: "non-medical" },
  { code: "111702", name: "Department of Education", faculty: "Faculty of Social Sciences", domain: "non-medical" },
  { code: "111705", name: "School of Integrated Social Science", faculty: "Faculty of Social Sciences", domain: "non-medical" },
  { code: "111703", name: "Department of Islamic Studies", faculty: "Faculty of Social Sciences", domain: "non-medical" },
  { code: "111708", name: "Department of Criminology", faculty: "Faculty of Social Sciences", domain: "non-medical" },
  { code: "111707", name: "Department of Sociology", faculty: "Faculty of Social Sciences", domain: "non-medical" },
  // Faculty of Law — non-medical
  { code: "111501", name: "M.A Raoof College of Law", faculty: "Faculty of Law", domain: "non-medical" },
  // Faculty of Arts and Architecture — non-medical
  { code: "111402", name: "School of Creative Arts", faculty: "Faculty of Arts and Architecture", domain: "non-medical" },
  { code: "111406", name: "School of Fashion and Textile", faculty: "Faculty of Arts and Architecture", domain: "non-medical" },
  { code: "111401", name: "School of Architecture", faculty: "Faculty of Arts and Architecture", domain: "non-medical" },
  // Faculty of Languages and Literature — non-medical
  { code: "111601", name: "Dept. of English Language and Literature", faculty: "Faculty of Languages and Literature", domain: "non-medical" },
  { code: "111602", name: "Department of Urdu", faculty: "Faculty of Languages and Literature", domain: "non-medical" },
  // Faculty of Engineering and Technology — non-medical
  { code: "111801", name: "Department of Electrical Engineering", faculty: "Faculty of Engineering and Technology", domain: "non-medical" },
  { code: "111802", name: "Department of Civil Engineering", faculty: "Faculty of Engineering and Technology", domain: "non-medical" },
  { code: "111803", name: "Department of Mechanical Engineering", faculty: "Faculty of Engineering and Technology", domain: "non-medical" },
  { code: "111804", name: "Department of Technology", faculty: "Faculty of Engineering and Technology", domain: "non-medical" },
  { code: "111806", name: "Department of Computer Engineering", faculty: "Faculty of Engineering and Technology", domain: "non-medical" },
  // Faculty of Information Technology — non-medical
  { code: "112001", name: "Department of Computer Sciences & IT", faculty: "Faculty of Information Technology", domain: "non-medical" },
  { code: "112002", name: "Department of Software Engineering", faculty: "Faculty of Information Technology", domain: "non-medical" },
  { code: "112003", name: "Department of Intelligent Systems", faculty: "Faculty of Information Technology", domain: "non-medical" },
  { code: "112004", name: "Department of Artificial Intelligence", faculty: "Faculty of Information Technology", domain: "non-medical" },
];

/**
 * Known SAP/alternate spellings of canonical directory names, keyed by the
 * canonical `name` in DEPARTMENT_DIRECTORY.
 */
const DEPARTMENT_DIRECTORY_ALIASES: Record<string, string[]> = {
  "Institute of Molecular Biology & Biotech (IMBB-CRiMM)": [
    "Institute of Molecular Biology & Biotechnology",
  ],
  "Center for Research in Molecular Medicine": ["CRiMM"],
  "Health Professional Development & Lifelong": [
    "Center for Heath Professional Develoment & Lifelong Learning",
    "Center for Health Professional Development & Lifelong Learning",
  ],
  "School of Pain & Regenerative Medicine": [
    "School of Pain & Regenrative Medicine",
    "Pain and Regenerative Medicine",
  ],
  "Dept of Health Professional Technologies": ["Department of Health Professional Technologies"],
  "University Inst of Diet & Nutri Sciences": [
    "University Institute of Diet & Nutritional Sciences",
    "University Institute of Diet and Nutritional Science",
  ],
  "Department of Physical Education & SS": ["Sports Sciences and Physical Education"],
  "University Institute of Medical Lab Tech": ["University Institute of Medical Lab Technology"],
  "Dept of Radiological Sciences and MIT": [
    "University Institute of Radiological Sciences & Medical Imaging",
    "University Institute of Radiological Sciences and Medical Imaging Technology",
  ],
  "University Institute of Physical Therapy": ["ITH Physical Therapy & Rehabilitation"],
  "Department of Optometry & Vision Science": ["Department of Optometry and Vision Sciences"],
  "Uni. Inst. of Food Science & Technology": ["University Institute of Food Science & Technology"],
  "Dept. of Emerging Allied Health Tech.": [
    "Department of Emerging Allied Health Technologies",
    "Deptt. of Emerging Allied Health Tech.",
  ],
  "Dept. of English Language and Literature": [
    "Deptartment of English Language and Literature",
    "Department of English Language and Literature",
  ],
  "Department of Computer Sciences & IT": ["Computer Science and Information Technology"],
  "Department of Intelligent Systems": ["Intelligent Systems"],
};

const DIRECTORY_LOOKUP = new Map<string, DepartmentDirectoryEntry>();
for (const entry of DEPARTMENT_DIRECTORY) {
  DIRECTORY_LOOKUP.set(normalizeDepartmentName(entry.name), entry);
  for (const alias of DEPARTMENT_DIRECTORY_ALIASES[entry.name] ?? []) {
    DIRECTORY_LOOKUP.set(normalizeDepartmentName(alias), entry);
  }
}

/**
 * Resolves a department name (from the DB or SAP) to its official directory
 * entry — code, canonical name, faculty and domain. Returns null for
 * departments not on the official medical/non-medical lists.
 */
export function getDepartmentDirectoryEntry(
  department: string | null | undefined,
): DepartmentDirectoryEntry | null {
  const normalized = normalizeDepartmentName(department ?? "");
  if (!normalized) return null;

  const directMatch = DIRECTORY_LOOKUP.get(normalized);
  if (directMatch) return directMatch;

  for (const [key, entry] of DIRECTORY_LOOKUP) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return entry;
    }
  }
  return null;
}

const STUDENT_DEPARTMENT_KEYS = ["DeptName", "Dept", "Department"] as const;

/**
 * Resolves the department domain for an authenticated session user.
 * Faculty department comes from `facultyDepartment`; student department
 * comes from the SAP `studentRecord` (DeptName/Dept/Department).
 */
export function resolveSessionDepartmentDomain(
  user: {
    applicantRole?: "student" | "faculty";
    facultyDepartment?: string;
    studentRecord?: Record<string, unknown> | null;
  } | null | undefined,
): DepartmentDomain | null {
  if (!user) return null;

  if (user.applicantRole === "faculty") {
    return getDepartmentDomain(user.facultyDepartment);
  }

  if (user.applicantRole === "student") {
    const rec = user.studentRecord;
    if (rec && typeof rec === "object" && !Array.isArray(rec)) {
      for (const key of STUDENT_DEPARTMENT_KEYS) {
        const value = rec[key];
        if (typeof value === "string" && value.trim()) {
          return getDepartmentDomain(value);
        }
      }
    }
  }

  return null;
}
