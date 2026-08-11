/**
 * Reusable organization mapping service.
 *
 * Resolves SAP department text → { facultyId, departmentId } using the
 * existing organization hierarchy stored in the database:
 *
 *   faculties (id, name, code)
 *       │
 *       └── departments (id, faculty_id, name)
 *
 * This module does NOT create any new mapping tables. It reuses the
 * `faculties` and `departments` tables and the `normalizeDepartmentName`
 * helper from `faculty-by-department.ts` for text normalization.
 *
 * Designed for reuse by:
 *   - SAP faculty sync (faculty-filter.ts)
 *   - Submission imports
 *   - Supervisor assignment
 *   - Any module that needs to map free-text org data to DB IDs
 */

import { db } from "@/lib/db";
import { normalizeDepartmentName } from "@/lib/faculty-by-department";

export type OrgMappingResult = {
  ok: boolean;
  facultyId: number | null;
  departmentId: number | null;
  facultyName: string | null;
  departmentName: string | null;
  reason?: string;
};

type DepartmentRow = {
  id: number;
  name: string;
  faculty_id: number | null;
  faculty_name: string | null;
};

// Cache all active departments joined with their faculty for the duration of
// a sync run. Avoids hitting the DB for every employee record.
let cachedDepartments: DepartmentRow[] | null = null;

/**
 * Loads all active departments with their parent faculty (if any) into an
 * in-memory cache. Uses LEFT JOIN because departments.faculty_id is now
 * nullable (departments can exist independently of faculties).
 * Call this once at the start of a bulk operation (e.g., sync).
 */
export async function loadDepartmentCache(): Promise<void> {
  const result = await db.query<DepartmentRow>(
    `
      SELECT d.id, d.name, d.faculty_id, f.name AS faculty_name
      FROM departments d
      LEFT JOIN faculties f ON f.id = d.faculty_id AND f.is_active = TRUE
      WHERE d.is_active = TRUE
      ORDER BY d.name
    `,
  );
  cachedDepartments = result.rows;
}

/**
 * Clears the department cache. Call after a bulk operation completes.
 */
export function clearDepartmentCache(): void {
  cachedDepartments = null;
}

/**
 * Normalizes a department name for comparison.
 * Reuses the existing normalizeDepartmentName helper which handles common
 * SAP typos (e.g., "Deptartment" → "Department", "Tech" → "Technology").
 */
function normalizeForComparison(value: string): string {
  return normalizeDepartmentName(value);
}

/**
 * Resolves a SAP department text to { facultyId, departmentId } using the
 * existing database hierarchy.
 *
 * Matching strategy (in order):
 *   1. Exact normalized match on department name.
 *   2. Fuzzy match: department name contains or is contained in the
 *      normalized SAP value.
 *
 * If a match is found, the parent faculty_id is read from the departments
 * table relationship. No guessing or hardcoded mapping is used.
 *
 * If no match is found, returns { ok: false, reason: "DEPARTMENT_NOT_FOUND" }.
 */
export async function resolveOrgFromDepartment(
  sapDepartmentText: string,
): Promise<OrgMappingResult> {
  const rawText = (sapDepartmentText ?? "").trim();
  if (!rawText) {
    return {
      ok: false,
      facultyId: null,
      departmentId: null,
      facultyName: null,
      departmentName: null,
      reason: "EMPTY_DEPARTMENT",
    };
  }

  const normalized = normalizeForComparison(rawText);

  // Load cache if not already loaded
  if (!cachedDepartments) {
    await loadDepartmentCache();
  }

  const departments = cachedDepartments ?? [];

  // 1. Exact normalized match
  const exactMatch = departments.find(
    (d) => normalizeForComparison(d.name) === normalized,
  );

  if (exactMatch) {
    return {
      ok: true,
      facultyId: exactMatch.faculty_id,
      departmentId: exactMatch.id,
      facultyName: exactMatch.faculty_name,
      departmentName: exactMatch.name,
    };
  }

  // 2. Fuzzy match — check if the normalized SAP value contains or is
  //    contained in a department name. This handles partial SAP values.
  //    Prefer longer department names first to avoid false partial matches.
  const sortedByLength = [...departments].sort(
    (a, b) => normalizeForComparison(b.name).length - normalizeForComparison(a.name).length,
  );

  const fuzzyMatch = sortedByLength.find((d) => {
    const deptNormalized = normalizeForComparison(d.name);
    if (!deptNormalized || !normalized) return false;
    return (
      deptNormalized.includes(normalized) ||
      normalized.includes(deptNormalized)
    );
  });

  if (fuzzyMatch) {
    return {
      ok: true,
      facultyId: fuzzyMatch.faculty_id,
      departmentId: fuzzyMatch.id,
      facultyName: fuzzyMatch.faculty_name,
      departmentName: fuzzyMatch.name,
    };
  }

  // No match found — create a new canonical department record so future
  // lookups for the same SAP department text resolve immediately. The
  // department is created with faculty_id = NULL (independent department).
  const insertResult = await db.query<{ id: number; name: string; faculty_id: number | null }>(
    `
      INSERT INTO departments (faculty_id, name, is_active)
      VALUES (NULL, $1, TRUE)
      RETURNING id, name, faculty_id
    `,
    [rawText],
  );

  const newDept = insertResult.rows[0];

  if (newDept) {
    // Add to cache so subsequent lookups in this run don't hit the DB.
    if (cachedDepartments) {
      cachedDepartments.push({
        id: newDept.id,
        name: newDept.name,
        faculty_id: newDept.faculty_id ?? 0,
        faculty_name: "",
      });
    }
    return {
      ok: true,
      facultyId: newDept.faculty_id ?? null,
      departmentId: newDept.id,
      facultyName: null,
      departmentName: newDept.name,
    };
  }

  return {
    ok: false,
    facultyId: null,
    departmentId: null,
    facultyName: null,
    departmentName: null,
    reason: "DEPARTMENT_NOT_FOUND",
  };
}

/**
 * Resolves organization mapping for a single employee without using the
 * cache. Use this for one-off lookups (e.g., login flow upsert).
 */
export async function resolveOrgFromDepartmentUncached(
  sapDepartmentText: string,
): Promise<OrgMappingResult> {
  const previousCache = cachedDepartments;
  cachedDepartments = null;
  try {
    return await resolveOrgFromDepartment(sapDepartmentText);
  } finally {
    cachedDepartments = previousCache;
  }
}
