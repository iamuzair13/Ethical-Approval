const DEPARTMENT_TO_FACULTY_MAP: Record<string, string> = {
  "department of audiology": "Faculty of Allied Health Sciences",
  "lahore school of nursing": "Faculty of Allied Health Sciences",
  "department of rehabilitation sciences": "Faculty of Allied Health Sciences",
  "university institute of physical therapy": "Faculty of Allied Health Sciences",
  "university institute of public health": "Faculty of Allied Health Sciences",
  "university institute of radiological sciences & medical imaging":
    "Faculty of Allied Health Sciences",
  "university institute of food science & technology":
    "Faculty of Allied Health Sciences",
  "university institute of diet & nutritional sciences":
    "Faculty of Allied Health Sciences",
  "university institute of medical lab technology":
    "Faculty of Allied Health Sciences",
  "department of health professional technologies":
    "Faculty of Allied Health Sciences",
  "department of optometry & vision science": "Faculty of Allied Health Sciences",
  "department of emerging allied health technologies":
    "Faculty of Allied Health Sciences",
  "school of creative arts": "Faculty of Arts and Architecture",
  "school of fashion and textile": "Faculty of Arts and Architecture",
  "department of technology": "Faculty of Engineering & Technology",
  "department of electrical engineering": "Faculty of Engineering & Technology",
  "department of mechanical engineering": "Faculty of Engineering & Technology",
  "department of civil engineering": "Faculty of Engineering & Technology",
  "department of computer sciences & it": "Faculty of Information Technology",
  "department of software engineering": "Faculty of Information Technology",
  "department of intelligent systems": "Faculty of Information Technology",
  "deptartment of english language and literature":
    "Faculty of Languages & Literature",
  "department of urdu": "Faculty of Languages & Literature",
  "m.a raoof college of law": "Faculty of Law",
  "department of sports sciences": "Faculty of Management Sciences",
  "lahore school of aviation": "Faculty of Management Sciences",
  "lahore business school": "Faculty of Management Sciences",
  "department of economics": "Faculty of Management Sciences",
  "department of information management": "Faculty of Management Sciences",
  "department of medical education": "Faculty of Medicine & Dentistry",
  "center for heath professional develoment & lifelong learning":
    "Faculty of Medicine & Dentistry",
  "university college of medicine": "Faculty of Medicine & Dentistry",
  "department of pharmacy": "Faculty of Pharmacy",
  "institute of molecular biology & biotechnology": "Faculty of Sciences",
  "department of environmental sciences": "Faculty of Sciences",
  "department of mathematics and statistics": "Faculty of Sciences",
  "department of physics": "Faculty of Sciences",
  "center for research in molecular medicine": "Faculty of Sciences",
  "department of chemistry": "Faculty of Sciences",
  "school of pain & regenrative medicine": "Faculty of Sciences",
  "department of islamic studies": "Faculty of Social Sciences",
  "department of education": "Faculty of Social Sciences",
  "school of integrated social science": "Faculty of Social Sciences",
  "lahore school of behavioural sciences": "Faculty of Social Sciences",
  "department of criminology": "Faculty of Social Sciences",
  "department of sociology": "Faculty of Social Sciences",
};

export function normalizeDepartmentName(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function inferFacultyFromDepartment(department: string): string | null {
  const normalized = normalizeDepartmentName(department);
  return DEPARTMENT_TO_FACULTY_MAP[normalized] ?? null;
}

