import { db } from "@/lib/db";

// ─── Types ───

export type SupervisorDepartment = {
  /** departments.id — the centralized department entity. */
  id: number;
  /** departments.name — the display name. */
  name: string;
};

export type SupervisorOption = {
  /** admin_users.id — the stable identifier stored on submissions.supervisor_user_id. */
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

export type VerifiedSupervisor = SupervisorOption & {
  facultyId: number | null;
  departmentId: number | null;
};

// ─── Queries ───

/**
 * All active departments from the centralized `departments` table.
 *
 * Returns every active department regardless of whether a supervisor is
 * currently assigned to it. The supervisor filtering happens at the
 * supervisor dropdown level (by department_id), not here.
 *
 * This is the Department-only organization model source — no dependency
 * on Faculty or Program entities.
 */
export async function listSupervisorDepartments(): Promise<SupervisorDepartment[]> {
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
 * All active faculty members in a given department, eligible for supervisor
 * selection.
 *
 * The department match is performed on faculty_members.department_id (the FK
 * to the centralized departments table). Any active faculty member with a
 * linked, active admin_users account is eligible — regardless of their admin
 * role (administrator, supervisor, ireb, or no role). This means a super
 * admin who is also a faculty member can be selected as a supervisor.
 *
 * The admin_faculty_assignments / admin_department_assignments RBAC scope
 * (supervisor_primary) is NOT used to filter this list — that scope controls
 * which admin actions a supervisor can perform (e.g., approving submissions),
 * not whether a student can select them as their supervisor. Using it here
 * caused the dropdown to return empty for most departments because only a
 * handful of supervisors had the RBAC assignment configured.
 */
export async function listSupervisorsForDepartment(
  departmentId: number,
): Promise<SupervisorOption[]> {
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
 * supervisor selection.
 *
 * Returns null if the user does not exist, is inactive, or has no linked
 * active faculty_members profile. Any admin role (administrator, supervisor,
 * ireb, or no role) is eligible — the role does not affect supervisor
 * selection eligibility.
 */
export async function getSupervisorForSelection(
  supervisorUserId: string,
): Promise<VerifiedSupervisor | null> {
  const trimmedId = supervisorUserId.trim();
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
 * Verify that a faculty member is eligible to be selected as a supervisor
 * for a given department.
 *
 * This is the authoritative server-side check used at submission time. The
 * client-submitted supervisor name/email/sapId are NEVER trusted; only the
 * supervisor user id is, and even that is re-validated against the database.
 *
 * The department is verified by department_id (the FK to the centralized
 * departments table), not by text matching.
 *
 * Any active faculty member with an active admin_users account is eligible,
 * regardless of their admin role (administrator, supervisor, ireb, or none).
 *
 * Returns the verified supervisor record, or null if:
 *   - the user does not exist
 *   - the user is inactive / soft-deleted
 *   - the faculty profile is missing or inactive
 *   - the supervisor's department_id does not match the selected department
 */
export async function verifySupervisorEligibility(
  supervisorUserId: string,
  expectedDepartmentId: number,
): Promise<VerifiedSupervisor | null> {
  const supervisor = await getSupervisorForSelection(supervisorUserId);
  if (!supervisor) return null;

  if (Number(supervisor.departmentId) !== Number(expectedDepartmentId)) return null;

  return supervisor;
}

// ─── Ethics payload extraction ───

/**
 * Extracts the supervisor user id and selected department from an ethics
 * payload's form state.
 *
 * The ethics payload shape at submit/draft time is:
 *   { form: { supervisorUserId, supervisorDepartment, ... }, requiredForm, ... }
 *
 * Returns null if no supervisorUserId is present.
 */
export function extractSupervisorFromEthics(
  ethics: Record<string, unknown> | undefined,
): { supervisorUserId: string; departmentId: number } | null {
  if (!ethics) return null;

  // The form state is nested under `form` in the standard payload shape.
  const formRaw = ethics.form;
  const form =
    formRaw && typeof formRaw === "object" && !Array.isArray(formRaw)
      ? (formRaw as Record<string, unknown>)
      : null;

  // Also check the top-level ethics object as a fallback (some older code
  // paths may spread form fields directly).
  const supervisorUserIdRaw = form?.supervisorUserId ?? ethics.supervisorUserId;
  const departmentIdRaw =
    form?.supervisorDepartmentId ?? ethics.supervisorDepartmentId;

  if (typeof supervisorUserIdRaw !== "string" || !supervisorUserIdRaw.trim()) {
    return null;
  }

  const departmentId =
    typeof departmentIdRaw === "string"
      ? Number(departmentIdRaw)
      : typeof departmentIdRaw === "number"
        ? departmentIdRaw
        : NaN;

  return {
    supervisorUserId: supervisorUserIdRaw.trim(),
    departmentId,
  };
}

/**
 * Result of validating the supervisor for a submission.
 */
export type SupervisorValidationResult =
  | { ok: true; supervisor: VerifiedSupervisor }
  | { ok: false; error: string };

/**
 * Validates the supervisor selection for a student thesis submission.
 *
 * This is the authoritative server-side check. The client-submitted
 * supervisor name/email/sapId are NEVER trusted — only the supervisorUserId
 * is, and even that is re-validated against the database.
 *
 * Returns `{ ok: true, supervisor }` if the supervisor is eligible, or
 * `{ ok: false, error }` with a user-facing error message otherwise.
 */
export async function validateSupervisorForSubmission(
  ethics: Record<string, unknown> | undefined,
): Promise<SupervisorValidationResult> {
  const extracted = extractSupervisorFromEthics(ethics);
  if (!extracted || !extracted.supervisorUserId) {
    return {
      ok: false,
      error: "Please select a supervisor before submitting.",
    };
  }

  if (!Number.isInteger(extracted.departmentId) || extracted.departmentId <= 0) {
    return {
      ok: false,
      error: "Please select a department before submitting.",
    };
  }

  const supervisor = await verifySupervisorEligibility(
    extracted.supervisorUserId,
    extracted.departmentId,
  );

  if (!supervisor) {
    return {
      ok: false,
      error:
        "The selected supervisor is not eligible. Please select a valid supervisor from the list.",
    };
  }

  return { ok: true, supervisor };
}
