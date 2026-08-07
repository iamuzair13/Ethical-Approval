-- Migration 019: Promote faculty-only users (role = NULL) to supervisor.
--
-- All admin_users rows with role IS NULL are faculty members who have an
-- account but no administrative role. This migration sets their role to
-- 'supervisor' so they can access the supervisor panel.
--
-- Existing administrators, supervisors, and IREB members are NOT touched.
-- Only role = NULL rows are changed.
--
-- This migration is wrapped in a transaction. Run it manually:
--   psql -d <database> -f migrations/019_faculty_only_to_supervisor.sql
--
-- If anything looks wrong in the sanity-check output, the transaction is
-- NOT committed — review the output and re-run without the final COMMIT.

BEGIN;

-- ─── 1. PRE-MIGRATION SANITY CHECK ───

SELECT 'BEFORE: role distribution' AS label;

SELECT
  COALESCE(role::text, 'NULL (faculty only)') AS role,
  COUNT(*) AS count
FROM admin_users
WHERE deleted_at IS NULL
GROUP BY role
ORDER BY role NULLS FIRST;

-- ─── 2. THE UPDATE ───

UPDATE admin_users
SET role       = 'supervisor',
    updated_at = NOW()
WHERE role IS NULL
  AND deleted_at IS NULL;

-- ─── 3. POST-MIGRATION SANITY CHECK ───

SELECT 'AFTER: role distribution' AS label;

SELECT
  COALESCE(role::text, 'NULL (faculty only)') AS role,
  COUNT(*) AS count
FROM admin_users
WHERE deleted_at IS NULL
GROUP BY role
ORDER BY role NULLS FIRST;

-- ─── 4. VERIFICATION: no administrators were changed ───

SELECT 'VERIFY: administrator count unchanged' AS label;

SELECT COUNT(*) AS admin_count
FROM admin_users
WHERE role = 'administrator' AND deleted_at IS NULL;

-- ─── 5. VERIFICATION: no NULL roles remain ───

SELECT 'VERIFY: remaining NULL roles (should be 0)' AS label;

SELECT COUNT(*) AS remaining_null_roles
FROM admin_users
WHERE role IS NULL AND deleted_at IS NULL;

-- ─── 6. DIAGNOSTIC: admin_users NOT linked to faculty_members ───
-- These users have a role in admin_users but won't appear on the frontend
-- because they have no faculty_members record (or the link is broken).

SELECT 'DIAGNOSTIC: admin users without faculty_members link' AS label;

SELECT
  au.id,
  au.name,
  au.email,
  au.role,
  au.status,
  fm.id AS faculty_member_id,
  fm.user_id AS fm_user_id,
  CASE
    WHEN fm.id IS NULL THEN 'NO faculty_members record'
    WHEN fm.user_id IS NULL THEN 'faculty_members.user_id is NULL'
    WHEN fm.deleted_at IS NOT NULL THEN 'faculty_members is soft-deleted'
    ELSE 'linked'
  END AS link_status
FROM admin_users au
LEFT JOIN faculty_members fm ON fm.user_id = au.id
WHERE au.deleted_at IS NULL
  AND au.role IS NOT NULL
  AND (
    fm.id IS NULL
    OR fm.user_id IS NULL
    OR fm.deleted_at IS NOT NULL
  )
ORDER BY au.role, au.name;

-- ─── 7. SAMPLE: first 10 promoted users ───

SELECT 'SAMPLE: promoted users' AS label;

SELECT id, name, email, role, status
FROM admin_users
WHERE role = 'supervisor'
  AND deleted_at IS NULL
  AND updated_at >= NOW() - INTERVAL '5 minutes'
ORDER BY name
LIMIT 10;

-- If the sanity checks look correct, uncomment the COMMIT below
-- and re-run. Otherwise the transaction will roll back automatically
-- when the session ends.

-- COMMIT;
-- ROLLBACK;
