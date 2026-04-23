export function normalizeDepartmentName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bdeptartment\b/g, "department")
    .replace(/\bdeveloment\b/g, "development")
    .replace(/\bregenrative\b/g, "regenerative")
    .replace(/\btech\b/g, "technology")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const FACULTY_DEPARTMENT_ROWS: Array<{ faculty: string; department: string }> = [
  { faculty: "Faculty of Allied Health Sciences", department: "Department of Audiology" },
  { faculty: "Faculty of Allied Health Sciences", department: "Lahore School of Nursing" },
  { faculty: "Faculty of Allied Health Sciences", department: "Department of Rehabilitation Sciences" },
  { faculty: "Faculty of Allied Health Sciences", department: "University Institute of Physical Therapy" },
  { faculty: "Faculty of Allied Health Sciences", department: "University Institute of Public Health" },
  { faculty: "Faculty of Allied Health Sciences", department: "University Institute of Radiological Sciences & Medical Imaging" },
  { faculty: "Faculty of Allied Health Sciences", department: "University Institute of Food Science & Technology" },
  { faculty: "Faculty of Allied Health Sciences", department: "University Institute of Diet & Nutritional Sciences" },
  { faculty: "Faculty of Allied Health Sciences", department: "University Institute of Medical Lab Technology" },
  { faculty: "Faculty of Allied Health Sciences", department: "Department of Health Professional Technologies" },
  { faculty: "Faculty of Allied Health Sciences", department: "Department of Optometry & Vision Science" },
  { faculty: "Faculty of Allied Health Sciences", department: "Department of Emerging Allied Health Technologies" },
  { faculty: "Faculty of Arts and Architecture", department: "School of Creative Arts" },
  { faculty: "Faculty of Arts and Architecture", department: "School of Fashion and Textile" },
  { faculty: "Faculty of Engineering & Technology", department: "Department of Technology" },
  { faculty: "Faculty of Engineering & Technology", department: "Department of Electrical Engineering" },
  { faculty: "Faculty of Engineering & Technology", department: "Department of Mechanical Engineering" },
  { faculty: "Faculty of Engineering & Technology", department: "Department of Civil Engineering" },
  { faculty: "Faculty of Information Technology", department: "Department of Computer Sciences & IT" },
  { faculty: "Faculty of Information Technology", department: "Department of Software Engineering" },
  { faculty: "Faculty of Information Technology", department: "Department of Intelligent Systems" },
  { faculty: "Faculty of Languages & Literature", department: "Deptartment of English Language and Literature" },
  { faculty: "Faculty of Languages & Literature", department: "Department of Urdu" },
  { faculty: "Faculty of Law", department: "M.A Raoof College of Law" },
  { faculty: "Faculty of Management Sciences", department: "Department of Sports Sciences" },
  { faculty: "Faculty of Management Sciences", department: "Lahore School of Aviation" },
  { faculty: "Faculty of Management Sciences", department: "Lahore Business School" },
  { faculty: "Faculty of Management Sciences", department: "Department of Economics" },
  { faculty: "Faculty of Management Sciences", department: "Department of Information Management" },
  { faculty: "Faculty of Medicine & Dentistry", department: "Department of Medical Education" },
  { faculty: "Faculty of Medicine & Dentistry", department: "Center for Heath Professional Develoment & Lifelong Learning" },
  { faculty: "Faculty of Medicine & Dentistry", department: "University College of Medicine" },
  { faculty: "Faculty of Pharmacy", department: "Department of Pharmacy" },
  { faculty: "Faculty of Sciences", department: "Institute of Molecular Biology & Biotechnology" },
  { faculty: "Faculty of Sciences", department: "Department of Environmental Sciences" },
  { faculty: "Faculty of Sciences", department: "Department of Mathematics and Statistics" },
  { faculty: "Faculty of Sciences", department: "Department of Physics" },
  { faculty: "Faculty of Sciences", department: "Center for Research in Molecular Medicine" },
  { faculty: "Faculty of Sciences", department: "Department of Chemistry" },
  { faculty: "Faculty of Sciences", department: "School of Pain & Regenrative Medicine" },
  { faculty: "Faculty of Social Sciences", department: "Department of Islamic Studies" },
  { faculty: "Faculty of Social Sciences", department: "Department of Education" },
  { faculty: "Faculty of Social Sciences", department: "School of Integrated Social Science" },
  { faculty: "Faculty of Social Sciences", department: "Lahore School of Behavioural Sciences" },
  { faculty: "Faculty of Social Sciences", department: "Department of Criminology" },
  { faculty: "Faculty of Social Sciences", department: "Department of Sociology" },
  // Common SAP abbreviation variant.
  { faculty: "Faculty of Allied Health Sciences", department: "University Institute of Medical Lab Tech" },
];

const DEPARTMENT_TO_FACULTY_MAP = FACULTY_DEPARTMENT_ROWS.reduce<Record<string, string>>(
  (acc, row) => {
    acc[normalizeDepartmentName(row.department)] = row.faculty;
    return acc;
  },
  {},
);

export function inferFacultyFromDepartment(department: string): string | null {
  const normalized = normalizeDepartmentName(department);
  const directMatch = DEPARTMENT_TO_FACULTY_MAP[normalized];
  if (directMatch) return directMatch;

  // Fallback for partial department values seen in SAP snapshots.
  const fuzzyMatchKey = Object.keys(DEPARTMENT_TO_FACULTY_MAP).find(
    (key) => normalized.includes(key) || key.includes(normalized),
  );
  return fuzzyMatchKey ? DEPARTMENT_TO_FACULTY_MAP[fuzzyMatchKey] : null;
}

