-- migrations/027_deduplicate_leading_zero_sap_ids.sql
--
-- Deduplicate faculty_members that share the same SAP ID but with different
-- leading-zero padding (e.g. '22833' and '00022833').
--
-- This migration:
--   1. Groups active faculty_members by normalized SAP ID (leading zeros stripped)
--   2. Picks a primary record per group (prefer the one with a lowercase email
--      that matches the person's name, then most recently synced)
--   3. Re-points all FK references from non-primary to primary
--   4. Soft-deletes non-primary records
--
-- Run with: node scripts/run-sql-migration.mjs migrations/027_deduplicate_leading_zero_sap_ids.sql

BEGIN;

-- ─── Step 1: Build the dedup mapping ───
CREATE TEMP TABLE _sap_dedup_map ON COMMIT DROP AS
WITH groups AS (
  SELECT
    fm.id              AS faculty_member_id,
    fm.user_id         AS admin_user_id,
    fm.sap_id,
    REGEXP_REPLACE(TRIM(fm.sap_id), '^0+', '') AS sap_norm,
    fm.email,
    fm.name,
    fm.department_id,
    fm.last_synced_at,
    fm.created_at,
    -- Prefer records with lowercase emails (more likely correct from SAP sync
    -- with proper email, not a wrongly-assigned uppercase email from another
    -- person's record)
    (fm.email = LOWER(fm.email)) AS has_lowercase_email,
    -- Prefer records with non-empty department_id (properly mapped)
    (fm.department_id IS NOT NULL) AS has_dept
  FROM faculty_members fm
  WHERE fm.deleted_at IS NULL
    AND fm.sap_id IS NOT NULL AND TRIM(fm.sap_id) != ''
    AND fm.sap_id !~ '^[A-Za-z]'
),
dupes_only AS (
  SELECT g.*
  FROM groups g
  INNER JOIN (
    SELECT sap_norm
    FROM groups
    GROUP BY sap_norm
    HAVING COUNT(*) > 1
  ) d ON d.sap_norm = g.sap_norm
),
ranked AS (
  SELECT
    g.*,
    ROW_NUMBER() OVER (
      PARTITION BY g.sap_norm
      ORDER BY
        g.has_lowercase_email DESC,
        g.has_dept DESC,
        g.last_synced_at DESC NULLS LAST,
        g.created_at ASC
    ) AS rn
  FROM dupes_only g
)
SELECT
  sap_norm,
  faculty_member_id,
  admin_user_id,
  sap_id,
  email,
  name,
  (rn = 1) AS is_primary
FROM ranked;

-- ─── Step 2: Re-point admin_users references ───

-- 2a. submissions.supervisor_user_id
UPDATE submissions s
SET supervisor_user_id = pri.admin_user_id
FROM _sap_dedup_map nonpri
INNER JOIN _sap_dedup_map pri
  ON pri.sap_norm = nonpri.sap_norm AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND s.supervisor_user_id = nonpri.admin_user_id;

-- 2b. activity_events.actor_admin_id
UPDATE activity_events ae
SET actor_admin_id = pri.admin_user_id
FROM _sap_dedup_map nonpri
INNER JOIN _sap_dedup_map pri
  ON pri.sap_norm = nonpri.sap_norm AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND ae.actor_admin_id = nonpri.admin_user_id;

-- 2c. activity_events.effective_admin_id
UPDATE activity_events ae
SET effective_admin_id = pri.admin_user_id
FROM _sap_dedup_map nonpri
INNER JOIN _sap_dedup_map pri
  ON pri.sap_norm = nonpri.sap_norm AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND ae.effective_admin_id = nonpri.admin_user_id;

-- 2d. admin_audit_logs.actor_admin_id
UPDATE admin_audit_logs aal
SET actor_admin_id = pri.admin_user_id
FROM _sap_dedup_map nonpri
INNER JOIN _sap_dedup_map pri
  ON pri.sap_norm = nonpri.sap_norm AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND aal.actor_admin_id = nonpri.admin_user_id;

-- 2e. activity_notification_reads.admin_user_id
UPDATE activity_notification_reads anr
SET admin_user_id = pri.admin_user_id
FROM _sap_dedup_map nonpri
INNER JOIN _sap_dedup_map pri
  ON pri.sap_norm = nonpri.sap_norm AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND anr.admin_user_id = nonpri.admin_user_id;

-- 2f. admin_faculty_assignments.admin_user_id (skip if primary already has one)
UPDATE admin_faculty_assignments afa
SET admin_user_id = pri.admin_user_id
FROM _sap_dedup_map nonpri
INNER JOIN _sap_dedup_map pri
  ON pri.sap_norm = nonpri.sap_norm AND pri.is_primary = TRUE
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
FROM _sap_dedup_map nonpri
INNER JOIN _sap_dedup_map pri
  ON pri.sap_norm = nonpri.sap_norm AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND afa.assigned_by = nonpri.admin_user_id;

-- 2h. admin_department_assignments.admin_user_id (skip if primary already has one)
UPDATE admin_department_assignments ada
SET admin_user_id = pri.admin_user_id
FROM _sap_dedup_map nonpri
INNER JOIN _sap_dedup_map pri
  ON pri.sap_norm = nonpri.sap_norm AND pri.is_primary = TRUE
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
FROM _sap_dedup_map nonpri
INNER JOIN _sap_dedup_map pri
  ON pri.sap_norm = nonpri.sap_norm AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND ada.assigned_by = nonpri.admin_user_id;

-- 2j. admin_program_assignments.admin_user_id (skip if primary already has one)
UPDATE admin_program_assignments apa
SET admin_user_id = pri.admin_user_id
FROM _sap_dedup_map nonpri
INNER JOIN _sap_dedup_map pri
  ON pri.sap_norm = nonpri.sap_norm AND pri.is_primary = TRUE
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
FROM _sap_dedup_map nonpri
INNER JOIN _sap_dedup_map pri
  ON pri.sap_norm = nonpri.sap_norm AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND apa.assigned_by = nonpri.admin_user_id;

-- 2l. admin_users.created_by
UPDATE admin_users au
SET created_by = pri.admin_user_id
FROM _sap_dedup_map nonpri
INNER JOIN _sap_dedup_map pri
  ON pri.sap_norm = nonpri.sap_norm AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND au.created_by = nonpri.admin_user_id;

-- ─── Step 3: Re-point faculty_members references ───

-- 3a. submission_participants.faculty_member_id
UPDATE submission_participants sp
SET faculty_member_id = pri.faculty_member_id
FROM _sap_dedup_map nonpri
INNER JOIN _sap_dedup_map pri
  ON pri.sap_norm = nonpri.sap_norm AND pri.is_primary = TRUE
WHERE nonpri.is_primary = FALSE
  AND sp.faculty_member_id = nonpri.faculty_member_id;

-- 3b. faculty_auth_accounts.faculty_member_id (skip if primary already has one)
UPDATE faculty_auth_accounts faa
SET faculty_member_id = pri.faculty_member_id
FROM _sap_dedup_map nonpri
INNER JOIN _sap_dedup_map pri
  ON pri.sap_norm = nonpri.sap_norm AND pri.is_primary = TRUE
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
FROM _sap_dedup_map nonpri
WHERE nonpri.is_primary = FALSE
  AND fm.id = nonpri.faculty_member_id
  AND fm.deleted_at IS NULL;

-- 4b. Soft-delete non-primary admin_users
UPDATE admin_users au
SET deleted_at = NOW(),
    status = 'inactive',
    updated_at = NOW()
FROM _sap_dedup_map nonpri
WHERE nonpri.is_primary = FALSE
  AND au.id = nonpri.admin_user_id
  AND au.deleted_at IS NULL;

-- ─── Step 5: Report ───
SELECT
  (SELECT COUNT(*) FROM _sap_dedup_map WHERE is_primary = FALSE) AS records_soft_deleted,
  (SELECT COUNT(DISTINCT sap_norm) FROM _sap_dedup_map WHERE is_primary = FALSE) AS duplicate_groups_resolved,
  (SELECT COUNT(*) FROM faculty_members WHERE deleted_at IS NULL) AS remaining_active_fm,
  (SELECT COUNT(*) FROM admin_users WHERE deleted_at IS NULL) AS remaining_active_au;

COMMIT;
