-- migrations/026_deduplicate_faculty_members.sql
--
-- Deduplicate faculty_members: the same person appears multiple times because
-- SAP has multiple employee records for them with different email domains
-- (e.g. muhammad.usman@cs.uol.edu.pk, muhammad.usman@math.uol.edu.pk, ...).
--
-- This migration:
--   1. Groups duplicates by normalized email prefix (part before @)
--   2. Picks a "primary" record for each group (prefer RBAC assignments,
--      then most recently synced, then oldest)
--   3. Re-points ALL foreign key references from non-primary admin_users
--      to the primary admin_users (submissions, activity_events, audit
--      logs, RBAC assignments, notification reads)
--   4. Re-points faculty_member_id references (submission_participants,
--      faculty_auth_accounts)
--   5. Soft-deletes non-primary faculty_members and admin_users records
--
-- Data reliability:
--   - No records are hard-deleted; everything is soft-deleted (deleted_at)
--   - All FK references are re-pointed BEFORE soft-deleting
--   - The migration runs in a single transaction (BEGIN/COMMIT)
--   - RBAC assignments are only re-pointed if the primary doesn't already
--     have one for the same faculty/department (avoids unique constraint
--     violations)
--
-- Run with: node scripts/run-sql-migration.mjs migrations/026_deduplicate_faculty_members.sql

BEGIN;

-- ─── Step 1: Build the dedup mapping ───
-- For each duplicate group, identify the primary and non-primary records.

CREATE TEMP TABLE _dedup_map ON COMMIT DROP AS
WITH groups AS (
  SELECT
    LOWER(SPLIT_PART(LOWER(TRIM(fm.email)), '@', 1)) AS email_prefix,
    fm.id           AS faculty_member_id,
    fm.user_id      AS admin_user_id,
    fm.sap_id,
    fm.department_id,
    fm.email,
    fm.name,
    fm.last_synced_at,
    fm.created_at,
    EXISTS (
      SELECT 1 FROM admin_faculty_assignments afa
      WHERE afa.admin_user_id = fm.user_id AND afa.deleted_at IS NULL
    ) AS has_faculty_assignment,
    EXISTS (
      SELECT 1 FROM admin_department_assignments ada
      WHERE ada.admin_user_id = fm.user_id AND ada.deleted_at IS NULL
    ) AS has_dept_assignment
  FROM faculty_members fm
  WHERE fm.deleted_at IS NULL
    AND TRIM(fm.email) != ''
),
dupes_only AS (
  SELECT g.*
  FROM groups g
  INNER JOIN (
    SELECT email_prefix
    FROM groups
    GROUP BY email_prefix
    HAVING COUNT(*) > 1
  ) d ON d.email_prefix = g.email_prefix
),
ranked AS (
  SELECT
    g.*,
    ROW_NUMBER() OVER (
      PARTITION BY g.email_prefix
      ORDER BY
        g.has_faculty_assignment DESC,
        g.has_dept_assignment DESC,
        g.last_synced_at DESC NULLS LAST,
        g.created_at ASC
    ) AS rn
  FROM dupes_only g
)
SELECT
  email_prefix,
  faculty_member_id,
  admin_user_id,
  sap_id,
  department_id,
  email,
  name,
  (rn = 1) AS is_primary
FROM ranked;

-- ─── Step 2: Re-point admin_users references ───
-- For every non-primary admin_user_id, update all referencing tables to
-- point to the primary admin_user_id instead.

-- 2a. submissions.supervisor_user_id
UPDATE submissions s
SET supervisor_user_id = pri.admin_user_id
FROM _dedup_map nonpri
INNER JOIN _dedup_map pri
  ON pri.email_prefix = nonpri.email_prefix AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND s.supervisor_user_id = nonpri.admin_user_id;

-- 2b. activity_events.actor_admin_id
UPDATE activity_events ae
SET actor_admin_id = pri.admin_user_id
FROM _dedup_map nonpri
INNER JOIN _dedup_map pri
  ON pri.email_prefix = nonpri.email_prefix AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND ae.actor_admin_id = nonpri.admin_user_id;

-- 2c. activity_events.effective_admin_id
UPDATE activity_events ae
SET effective_admin_id = pri.admin_user_id
FROM _dedup_map nonpri
INNER JOIN _dedup_map pri
  ON pri.email_prefix = nonpri.email_prefix AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND ae.effective_admin_id = nonpri.admin_user_id;

-- 2d. admin_audit_logs.actor_admin_id
UPDATE admin_audit_logs aal
SET actor_admin_id = pri.admin_user_id
FROM _dedup_map nonpri
INNER JOIN _dedup_map pri
  ON pri.email_prefix = nonpri.email_prefix AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND aal.actor_admin_id = nonpri.admin_user_id;

-- 2e. activity_notification_reads.admin_user_id
UPDATE activity_notification_reads anr
SET admin_user_id = pri.admin_user_id
FROM _dedup_map nonpri
INNER JOIN _dedup_map pri
  ON pri.email_prefix = nonpri.email_prefix AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND anr.admin_user_id = nonpri.admin_user_id;

-- 2f. admin_faculty_assignments.admin_user_id
--     Only re-point if the primary doesn't already have an assignment
--     for the same faculty (avoids unique constraint violations).
UPDATE admin_faculty_assignments afa
SET admin_user_id = pri.admin_user_id
FROM _dedup_map nonpri
INNER JOIN _dedup_map pri
  ON pri.email_prefix = nonpri.email_prefix AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND afa.admin_user_id = nonpri.admin_user_id
  AND NOT EXISTS (
    SELECT 1 FROM admin_faculty_assignments existing
    WHERE existing.admin_user_id = pri.admin_user_id
      AND existing.faculty_id = afa.faculty_id
      AND existing.assignment_type = afa.assignment_type
      AND existing.deleted_at IS NULL
  );

-- 2g. admin_faculty_assignments.assigned_by
UPDATE admin_faculty_assignments afa
SET assigned_by = pri.admin_user_id
FROM _dedup_map nonpri
INNER JOIN _dedup_map pri
  ON pri.email_prefix = nonpri.email_prefix AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND afa.assigned_by = nonpri.admin_user_id;

-- 2h. admin_department_assignments.admin_user_id
--     Only re-point if the primary doesn't already have one for the same dept.
UPDATE admin_department_assignments ada
SET admin_user_id = pri.admin_user_id
FROM _dedup_map nonpri
INNER JOIN _dedup_map pri
  ON pri.email_prefix = nonpri.email_prefix AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND ada.admin_user_id = nonpri.admin_user_id
  AND NOT EXISTS (
    SELECT 1 FROM admin_department_assignments existing
    WHERE existing.admin_user_id = pri.admin_user_id
      AND existing.department_id = ada.department_id
      AND existing.assignment_type = ada.assignment_type
      AND existing.deleted_at IS NULL
  );

-- 2i. admin_department_assignments.assigned_by
UPDATE admin_department_assignments ada
SET assigned_by = pri.admin_user_id
FROM _dedup_map nonpri
INNER JOIN _dedup_map pri
  ON pri.email_prefix = nonpri.email_prefix AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND ada.assigned_by = nonpri.admin_user_id;

-- 2j. admin_program_assignments.admin_user_id
--     Only re-point if the primary doesn't already have one for the same program.
UPDATE admin_program_assignments apa
SET admin_user_id = pri.admin_user_id
FROM _dedup_map nonpri
INNER JOIN _dedup_map pri
  ON pri.email_prefix = nonpri.email_prefix AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND apa.admin_user_id = nonpri.admin_user_id
  AND NOT EXISTS (
    SELECT 1 FROM admin_program_assignments existing
    WHERE existing.admin_user_id = pri.admin_user_id
      AND existing.program_id = apa.program_id
      AND existing.assignment_type = apa.assignment_type
      AND existing.deleted_at IS NULL
  );

-- 2k. admin_program_assignments.assigned_by
UPDATE admin_program_assignments apa
SET assigned_by = pri.admin_user_id
FROM _dedup_map nonpri
INNER JOIN _dedup_map pri
  ON pri.email_prefix = nonpri.email_prefix AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND apa.assigned_by = nonpri.admin_user_id;

-- 2l. admin_users.created_by (self-referential)
UPDATE admin_users au
SET created_by = pri.admin_user_id
FROM _dedup_map nonpri
INNER JOIN _dedup_map pri
  ON pri.email_prefix = nonpri.email_prefix AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND au.created_by = nonpri.admin_user_id;

-- ─── Step 3: Re-point faculty_members references ───

-- 3a. submission_participants.faculty_member_id
UPDATE submission_participants sp
SET faculty_member_id = pri.faculty_member_id
FROM _dedup_map nonpri
INNER JOIN _dedup_map pri
  ON pri.email_prefix = nonpri.email_prefix AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND sp.faculty_member_id = nonpri.faculty_member_id;

-- 3b. faculty_auth_accounts.faculty_member_id
--     Only re-point if the primary doesn't already have one for the same provider.
UPDATE faculty_auth_accounts faa
SET faculty_member_id = pri.faculty_member_id
FROM _dedup_map nonpri
INNER JOIN _dedup_map pri
  ON pri.email_prefix = nonpri.email_prefix AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND faa.faculty_member_id = nonpri.faculty_member_id
  AND NOT EXISTS (
    SELECT 1 FROM faculty_auth_accounts existing
    WHERE existing.faculty_member_id = pri.faculty_member_id
      AND existing.provider = faa.provider
  );

-- ─── Step 4: Soft-delete non-primary records ───

-- 4a. Soft-delete non-primary faculty_members
UPDATE faculty_members fm
SET deleted_at = NOW(),
    is_active = FALSE,
    status = 'inactive',
    updated_at = NOW()
FROM _dedup_map nonpri
WHERE nonpri.is_primary = FALSE
  AND fm.id = nonpri.faculty_member_id
  AND fm.deleted_at IS NULL;

-- 4b. Soft-delete non-primary admin_users
UPDATE admin_users au
SET deleted_at = NOW(),
    status = 'inactive',
    updated_at = NOW()
FROM _dedup_map nonpri
WHERE nonpri.is_primary = FALSE
  AND au.id = nonpri.admin_user_id
  AND au.deleted_at IS NULL;

-- ─── Step 5: Report ───
SELECT
  (SELECT COUNT(*) FROM _dedup_map WHERE is_primary = FALSE) AS records_soft_deleted,
  (SELECT COUNT(DISTINCT email_prefix) FROM _dedup_map WHERE is_primary = FALSE) AS duplicate_groups_resolved,
  (SELECT COUNT(*) FROM faculty_members WHERE deleted_at IS NULL) AS remaining_active_fm,
  (SELECT COUNT(*) FROM admin_users WHERE deleted_at IS NULL) AS remaining_active_au;

COMMIT;
