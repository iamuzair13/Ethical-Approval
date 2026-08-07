/**
 * Faculty filtering pipeline.
 *
 * SAP returns ~84,000 employee records. Only ~4,000 are academic faculty
 * eligible for the IREB system. This module applies a multi-stage filter:
 *
 *   1. Active employee check (status, leaving date)
 *   2. Academic sector check (exclude admin/HR/finance/IT/security/etc.)
 *   3. Email validation (only *.uol.edu.pk, no student emails)
 *   4. Designation validation (configurable via faculty_designation_rules table)
 *   5. Organization mapping (resolve faculty_id/department_id from SAP
 *      department text using the existing DB hierarchy)
 *
 * Each stage produces a FilterResult with the reason for rejection so the
 * sync service can log it to faculty_sync_errors and produce detailed counts.
 */

import { db } from "@/lib/db";
import type { SapEmployeeRecord } from "@/lib/sap-employee";
import {
  resolveOrgFromDepartment,
  type OrgMappingResult,
} from "@/lib/org-mapping";

export type FilterRejectionReason =
  | "NO_SAP_ID"
  | "NO_EMAIL"
  | "INVALID_EMAIL_DOMAIN"
  | "STUDENT_EMAIL"
  | "INACTIVE_EMPLOYEE"
  | "HAS_LEAVING_DATE"
  | "NON_ACADEMIC_SECTOR"
  | "NON_ACADEMIC_DESIGNATION"
  | "DESIGNATION_NOT_ALLOWED"
  | "EMPTY_DEPARTMENT"
  | "DEPARTMENT_NOT_FOUND"
  | "INVALID_ORGANIZATION_DATA";

export type FilterRejection = {
  reason: FilterRejectionReason;
  sapId: string | null;
  rawData: Record<string, unknown>;
};

export type FilterSuccess = {
  ok: true;
  normalized: NormalizedFacultyMember;
};

export type FilterFailure = {
  ok: false;
  rejection: FilterRejection;
};

export type FilterResult = FilterSuccess | FilterFailure;

export type NormalizedFacultyMember = {
  sapId: string;
  employeeCode: string | null;
  name: string;
  email: string;
  designation: string | null;
  departmentText: string;
  facultyText: string;
  facultyId: number | null;
  departmentId: number | null;
  orgMappingFailed: boolean;
  orgMappingReason: string | null;
  employeeStatus: string | null;
  employeeGroup: string | null;
  employeeType: string | null;
  isActive: boolean;
};

// ─── Non-academic keywords for sector/group filtering ───
const NON_ACADEMIC_KEYWORDS = [
  "admin",
  "administration",
  "hr",
  "human resource",
  "finance",
  "accounts",
  "accounting",
  "it support",
  "it department",
  "security",
  "maintenance",
  "facility",
  "facilities",
  "housekeeping",
  "transport",
  "clerk",
  "office assistant",
  "office staff",
  "non-teaching",
  "nonteaching",
  "support staff",
  "auxiliary",
  "store",
  "storekeeper",
  "driver",
  "guard",
  "peon",
];

// ─── Default allowed designation keywords (used when no DB rules exist) ───
const DEFAULT_ALLOWED_DESIGNATIONS = [
  "professor",
  "associate professor",
  "assistant professor",
  "lecturer",
  "senior lecturer",
  "research",
  "faculty",
  "teacher",
  "instructor",
  "demonstrator",
  "visiting",
  "honorary",
  "emeritus",
  "chair",
  "dean",
  "director",
  "hod",
  "head of department",
  "principal",
];

const DEFAULT_EXCLUDED_DESIGNATIONS = [
  "lab assistant",
  "lab technician",
  "clerk",
  "office assistant",
  "office boy",
  "peon",
  "driver",
  "guard",
  "security",
  "sweeper",
  "cleaner",
  "cook",
  "attendant",
  "helper",
  "stenographer",
  "typist",
  "receptionist",
  "accountant",
  "account assistant",
  "data entry",
  "operator",
  "storekeeper",
  "store keeper",
];

type DesignationRuleRow = { designation: string; is_allowed: boolean };

let cachedDesignationRules: { rules: Map<string, boolean>; loadedAt: number } | null = null;
const DESIGNATION_RULE_CACHE_MS = 60_000;

async function loadDesignationRules(): Promise<Map<string, boolean>> {
  if (cachedDesignationRules && Date.now() - cachedDesignationRules.loadedAt < DESIGNATION_RULE_CACHE_MS) {
    return cachedDesignationRules.rules;
  }

  const result = await db.query<DesignationRuleRow>(
    `SELECT designation, is_allowed FROM faculty_designation_rules`,
  );

  const rules = new Map<string, boolean>();
  for (const row of result.rows) {
    rules.set(row.designation.trim().toLowerCase(), row.is_allowed);
  }

  cachedDesignationRules = { rules, loadedAt: Date.now() };
  return rules;
}

/** Invalidate the designation rule cache (e.g., after rules are updated). */
export function invalidateDesignationRuleCache(): void {
  cachedDesignationRules = null;
}

function isStudentEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@student.uol.edu.pk");
}

/**
 * Validates that an email belongs to a UOL employee.
 * Accepts @uol.edu.pk and any subdomain (e.g. @mlt.uol.edu.pk, @pharm.uol.edu.pk).
 * Rejects student emails and non-UOL domains.
 */
function isValidUolEmployeeEmail(email: string): boolean {
  const lower = email.trim().toLowerCase();
  if (!lower.includes("@")) return false;
  if (isStudentEmail(lower)) return false;
  return lower.endsWith(".uol.edu.pk") || lower.endsWith("@uol.edu.pk");
}

function matchesAnyKeyword(value: string, keywords: string[]): boolean {
  const lower = value.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function isActiveEmployee(emp: SapEmployeeRecord): boolean {
  if (emp.leavingDate) {
    const dateStr = emp.leavingDate.trim();
    if (dateStr && dateStr !== "0000-00-00" && dateStr !== "00000000") {
      return false;
    }
  }

  if (emp.employeeStatus) {
    const status = emp.employeeStatus.toLowerCase();
    if (status.includes("inactive") || status.includes("terminated") || status.includes("separated") || status.includes("left") || status === "0") {
      return false;
    }
  }

  return true;
}

function isAcademicEmployee(emp: SapEmployeeRecord): boolean {
  if (emp.employeeGroup) {
    const group = emp.employeeGroup.toLowerCase();
    if (matchesAnyKeyword(group, NON_ACADEMIC_KEYWORDS)) return false;
  }

  if (emp.sector) {
    if (matchesAnyKeyword(emp.sector, NON_ACADEMIC_KEYWORDS)) return false;
  }

  if (emp.orgUnit) {
    if (matchesAnyKeyword(emp.orgUnit, NON_ACADEMIC_KEYWORDS)) return false;
  }

  if (emp.designation) {
    if (matchesAnyKeyword(emp.designation, NON_ACADEMIC_KEYWORDS)) return false;
  }

  if (emp.department) {
    if (matchesAnyKeyword(emp.department, NON_ACADEMIC_KEYWORDS)) return false;
  }

  return true;
}

function isDesignationAllowed(designation: string, rules: Map<string, boolean>): boolean {
  const normalized = designation.trim().toLowerCase();
  if (!normalized) return false;

  if (rules.size > 0) {
    if (rules.has(normalized)) {
      return rules.get(normalized)!;
    }
    for (const [ruleDesignation, isAllowed] of rules.entries()) {
      if (normalized.includes(ruleDesignation) || ruleDesignation.includes(normalized)) {
        return isAllowed;
      }
    }
    return false;
  }

  if (matchesAnyKeyword(normalized, DEFAULT_EXCLUDED_DESIGNATIONS)) return false;
  if (matchesAnyKeyword(normalized, DEFAULT_ALLOWED_DESIGNATIONS)) return true;
  return false;
}

/**
 * Applies the full filtering pipeline to a single SAP employee record.
 * Returns a normalized faculty member or a rejection with reason.
 *
 * Organization mapping uses the reusable `resolveOrgFromDepartment` service
 * which reads from the existing `departments` → `faculties` DB hierarchy.
 * No hardcoded faculty mapping are used. If the department cannot be matched,
 * the employee is skipped with reason "DEPARTMENT_NOT_FOUND".
 */
export async function filterFacultyMember(
  emp: SapEmployeeRecord,
): Promise<FilterResult> {
  // 1. SAP ID check
  if (!emp.sapId) {
    return {
      ok: false,
      rejection: { reason: "NO_SAP_ID", sapId: null, rawData: emp.raw },
    };
  }

  // 2. Email validation
  if (!emp.email) {
    return {
      ok: false,
      rejection: { reason: "NO_EMAIL", sapId: emp.sapId, rawData: emp.raw },
    };
  }

  if (isStudentEmail(emp.email)) {
    return {
      ok: false,
      rejection: { reason: "STUDENT_EMAIL", sapId: emp.sapId, rawData: emp.raw },
    };
  }

  if (!isValidUolEmployeeEmail(emp.email)) {
    return {
      ok: false,
      rejection: { reason: "INVALID_EMAIL_DOMAIN", sapId: emp.sapId, rawData: emp.raw },
    };
  }

  // 3. Active employee check
  if (!isActiveEmployee(emp)) {
    return {
      ok: false,
      rejection: { reason: "INACTIVE_EMPLOYEE", sapId: emp.sapId, rawData: emp.raw },
    };
  }

  // 4. Academic sector check
  if (!isAcademicEmployee(emp)) {
    return {
      ok: false,
      rejection: { reason: "NON_ACADEMIC_SECTOR", sapId: emp.sapId, rawData: emp.raw },
    };
  }

  // 5. Designation validation
  const designation = emp.designation ?? "";
  const rules = await loadDesignationRules();
  if (designation && !isDesignationAllowed(designation, rules)) {
    return {
      ok: false,
      rejection: { reason: "DESIGNATION_NOT_ALLOWED", sapId: emp.sapId, rawData: emp.raw },
    };
  }

  // 6. Organization mapping — resolve department_id and faculty_id from
  //    the existing DB hierarchy (departments → faculties).
  //    If the department cannot be matched, we still upsert the employee
  //    but leave faculty_id/department_id null. The failure is recorded
  //    so it can be reported and logged.
  const departmentText = emp.department ?? "";
  if (!departmentText.trim()) {
    // Empty department — still upsert, but no org mapping
    return {
      ok: true,
      normalized: {
        sapId: emp.sapId,
        employeeCode: emp.employeeCode,
        name: emp.employeeName ?? emp.email,
        email: emp.email.trim().toLowerCase(),
        designation: emp.designation?.trim() ?? null,
        departmentText: "Unknown Department",
        facultyText: "Unknown Faculty",
        facultyId: null,
        departmentId: null,
        orgMappingFailed: true,
        orgMappingReason: "EMPTY_DEPARTMENT",
        employeeStatus: emp.employeeStatus,
        employeeGroup: emp.employeeGroup,
        employeeType: emp.employeeType,
        isActive: true,
      },
    };
  }

  const orgResult: OrgMappingResult = await resolveOrgFromDepartment(departmentText);

  if (!orgResult.ok || orgResult.facultyId == null || orgResult.departmentId == null) {
    // Department not found — still upsert the employee, but without org IDs.
    // The failure is recorded for the sync report and error log.
    return {
      ok: true,
      normalized: {
        sapId: emp.sapId,
        employeeCode: emp.employeeCode,
        name: emp.employeeName ?? emp.email,
        email: emp.email.trim().toLowerCase(),
        designation: emp.designation?.trim() ?? null,
        departmentText: departmentText,
        facultyText: "Unknown Faculty",
        facultyId: null,
        departmentId: null,
        orgMappingFailed: true,
        orgMappingReason: orgResult.reason ?? "DEPARTMENT_NOT_FOUND",
        employeeStatus: emp.employeeStatus,
        employeeGroup: emp.employeeGroup,
        employeeType: emp.employeeType,
        isActive: true,
      },
    };
  }

  return {
    ok: true,
    normalized: {
      sapId: emp.sapId,
      employeeCode: emp.employeeCode,
      name: emp.employeeName ?? emp.email,
      email: emp.email.trim().toLowerCase(),
      designation: emp.designation?.trim() ?? null,
      departmentText: orgResult.departmentName ?? departmentText,
      facultyText: orgResult.facultyName ?? "Unknown Faculty",
      facultyId: orgResult.facultyId,
      departmentId: orgResult.departmentId,
      orgMappingFailed: false,
      orgMappingReason: null,
      employeeStatus: emp.employeeStatus,
      employeeGroup: emp.employeeGroup,
      employeeType: emp.employeeType,
      isActive: true,
    },
  };
}
