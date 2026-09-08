import { db } from "@/lib/db";

// ─── Types ───

export type HodDepartment = {
  /** departments.id — the centralized department entity. */
  id: number;
  /** departments.name — the display name. */
  name: string;
};

export type HodOption = {
  /** admin_users.id — the stable identifier stored on submissions.hod_user_id. */
  userId: string;
  /** faculty_members.id — used for the submission_participants FK. */
  facultyMemberId: string;
  sapId: string;
  name: string;
  email: string;
  designation: string | null;
  department: string;
  faculty: string | null;
};

export type VerifiedHod = HodOption & {
  facultyId: number | null;
  departmentId: number | null;
};

// ─── Queries ───

/**
 * All active departments from the centralized `departments` table.
 *
 * Returns every active department regardless of whether a hod is
 * currently assigned to it. The hod filtering happens at the
 * hod dropdown level (by department_id), not here.
 *
 * This is the Department-only organization model source — no dependency
 * on Faculty or Program entities.
 */
export async function listHodDepartments(): Promise<HodDepartment[]> {
  const result = await db.query<{ id: number; name: string }>(
    `
      SELECT id, name
      FROM departments
      WHERE is_active = TRUE
      ORDER BY name ASC
    `,
    [],
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
  }));
}

/**
 * All active faculty members in a given department, eligible for hod
 * selection.
 *
 * The department match is performed on faculty_members.department_id (the FK
 * to the centralized departments table). Any active faculty member with a
 * linked, active admin_users account is eligible — regardless of their admin
 * role (administrator, hod, ireb, or no role). This means a super
 * admin who is also a faculty member can be selected as a hod.
 *
 * The admin_faculty_assignments / admin_department_assignments RBAC scope
 * (hod_primary) is NOT used to filter this list — that scope controls
 * which admin actions a hod can perform (e.g., approving submissions),
 * not whether a student can select them as their hod. Using it here
 * caused the dropdown to return empty for most departments because only a
 * handful of hods had the RBAC assignment configured.
 */
export async function listHodsForDepartment(
  departmentId: number,
): Promise<HodOption[]> {
  if (!Number.isInteger(departmentId) || departmentId <= 0) return [];

  const result = await db.query<{
    user_id: string;
    faculty_member_id: string;
    sap_id: string;
    name: string;
    email: string;
    designation: string | null;
    department: string;
    faculty: string | null;
  }>(
    `
      SELECT
        au.id AS user_id,
        fm.id AS faculty_member_id,
        fm.sap_id,
        fm.name,
        fm.email,
        fm.designation,
        fm.department,
        fm.faculty
      FROM faculty_members fm
      INNER JOIN admin_users au
        ON au.id = fm.user_id
        AND au.deleted_at IS NULL
      WHERE fm.deleted_at IS NULL
        AND fm.status = 'active'
        AND fm.is_active = TRUE
        AND au.status = 'active'
        AND fm.department_id = $1
      ORDER BY fm.name ASC
    `,
    [departmentId],
  );

  return result.rows.map((row) => ({
    userId: row.user_id,
    facultyMemberId: row.faculty_member_id,
    sapId: row.sap_id,
    name: row.name,
    email: row.email,
    designation: row.designation,
    department: row.department,
    faculty: row.faculty,
  }));
}

/**
 * Fetch a single faculty member's full details by admin_users id, for
 * hod selection.
 *
 * Returns null if the user does not exist, is inactive, or has no linked
 * active faculty_members profile. Any admin role (administrator, hod,
 * ireb, or no role) is eligible — the role does not affect hod
 * selection eligibility.
 */
export async function getHodForSelection(
  hodUserId: string,
): Promise<VerifiedHod | null> {
  const trimmedId = hodUserId.trim();
  if (!trimmedId) return null;

  const result = await db.query<{
    user_id: string;
    faculty_member_id: string;
    sap_id: string;
    name: string;
    email: string;
    designation: string | null;
    department: string;
    faculty: string | null;
    faculty_id: number | null;
    department_id: number | null;
  }>(
    `
      SELECT
        au.id AS user_id,
        fm.id AS faculty_member_id,
        fm.sap_id,
        fm.name,
        fm.email,
        fm.designation,
        fm.department,
        fm.faculty,
        fm.faculty_id,
        fm.department_id
      FROM admin_users au
      INNER JOIN faculty_members fm
        ON fm.user_id = au.id
        AND fm.deleted_at IS NULL
      WHERE au.id = $1
        AND au.deleted_at IS NULL
        AND au.status = 'active'
        AND fm.status = 'active'
        AND fm.is_active = TRUE
      LIMIT 1
    `,
    [trimmedId],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    userId: row.user_id,
    facultyMemberId: row.faculty_member_id,
    sapId: row.sap_id,
    name: row.name,
    email: row.email,
    designation: row.designation,
    department: row.department,
    faculty: row.faculty,
    facultyId: row.faculty_id,
    departmentId: row.department_id,
  };
}

/**
 * Verify that a faculty member is eligible to be selected as a hod
 * for a given department.
 *
 * This is the authoritative server-side check used at submission time. The
 * client-submitted hod name/email/sapId are NEVER trusted; only the
 * hod user id is, and even that is re-validated against the database.
 *
 * The department is verified by department_id (the FK to the centralized
 * departments table), not by text matching.
 *
 * Any active faculty member with an active admin_users account is eligible,
 * regardless of their admin role (administrator, hod, ireb, or none).
 *
 * Returns the verified hod record, or null if:
 *   - the user does not exist
 *   - the user is inactive / soft-deleted
 *   - the faculty profile is missing or inactive
 *   - the hod's department_id does not match the selected department
 */
export async function verifyHodEligibility(
  hodUserId: string,
  expectedDepartmentId: number,
): Promise<VerifiedHod | null> {
  const hod = await getHodForSelection(hodUserId);
  if (!hod) return null;

  if (Number(hod.departmentId) !== Number(expectedDepartmentId)) return null;

  return hod;
}

// ─── Ethics payload extraction ───

/**
 * Extracts the hod user id and selected department from an ethics
 * payload's form state.
 *
 * The ethics payload shape at submit/draft time is:
 *   { form: { hodUserId, hodDepartment, ... }, requiredForm, ... }
 *
 * Returns null if no hodUserId is present.
 */
export function extractHodFromEthics(
  ethics: Record<string, unknown> | undefined,
): { hodUserId: string; departmentId: number } | null {
  if (!ethics) return null;

  // The form state is nested under `form` in the standard payload shape.
  const formRaw = ethics.form;
  const form =
    formRaw && typeof formRaw === "object" && !Array.isArray(formRaw)
      ? (formRaw as Record<string, unknown>)
      : null;

  // Also check the top-level ethics object as a fallback (some older code
  // paths may spread form fields directly).
  const hodUserIdRaw = form?.hodUserId ?? ethics.hodUserId;
  const departmentIdRaw =
    form?.hodDepartmentId ?? ethics.hodDepartmentId;

  if (typeof hodUserIdRaw !== "string" || !hodUserIdRaw.trim()) {
    return null;
  }

  const departmentId =
    typeof departmentIdRaw === "string"
      ? Number(departmentIdRaw)
      : typeof departmentIdRaw === "number"
        ? departmentIdRaw
        : NaN;

  return {
    hodUserId: hodUserIdRaw.trim(),
    departmentId,
  };
}

/**
 * Result of validating the hod for a submission.
 */
export type HodValidationResult =
  | { ok: true; hod: VerifiedHod }
  | { ok: false; error: string };

/**
 * Validates the hod selection for a student thesis submission.
 *
 * This is the authoritative server-side check. The client-submitted
 * hod name/email/sapId are NEVER trusted — only the hodUserId
 * is, and even that is re-validated against the database.
 *
 * Returns `{ ok: true, hod }` if the hod is eligible, or
 * `{ ok: false, error }` with a user-facing error message otherwise.
 */
export async function validateHodForSubmission(
  ethics: Record<string, unknown> | undefined,
): Promise<HodValidationResult> {
  const extracted = extractHodFromEthics(ethics);
  if (!extracted || !extracted.hodUserId) {
    return {
      ok: false,
      error: "Please select a hod before submitting.",
    };
  }

  if (!Number.isInteger(extracted.departmentId) || extracted.departmentId <= 0) {
    return {
      ok: false,
      error: "Please select a department before submitting.",
    };
  }

  const hod = await verifyHodEligibility(
    extracted.hodUserId,
    extracted.departmentId,
  );

  if (!hod) {
    return {
      ok: false,
      error:
        "The selected hod is not eligible. Please select a valid hod from the list.",
    };
  }

  return { ok: true, hod };
}
