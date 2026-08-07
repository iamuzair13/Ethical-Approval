-- Migration 020: Fix admin_users missing from faculty_members list.
--
-- Some admin_users don't appear on the faculty members page because:
--   1. Their faculty_members record was soft-deleted (but an active duplicate
--      with the same email and user_id=NULL may exist from SAP sync)
--   2. They have no faculty_members record at all
--
-- This migration:
--   - Re-links active faculty_members (user_id=NULL) to their admin_users
--   - Hard-deletes soft-deleted duplicates after re-linking
--   - Restores soft-deleted records that have no active duplicate
--   - Creates faculty_members records for admin_users that don't have one
--   - Sets role = NULL (faculty only) for manually-created admin accounts
--
-- Run manually:
--   psql -d <database> -f migrations/020_fix_missing_faculty_members.sql
--
-- COMMIT is commented out — review the output first.

BEGIN;

-- ─── 1. PRE-CHECK: admin_users without a working faculty_members link ───

SELECT 'BEFORE: admin users missing from faculty_members' AS label;

SELECT
  au.id,
  au.name,
  au.email,
  au.role,
  au.sap_id,
  CASE
    WHEN fm.id IS NULL THEN 'NO faculty_members record'
    WHEN fm.deleted_at IS NOT NULL THEN 'faculty_members soft-deleted'
    ELSE 'OK'
  END AS link_status
FROM admin_users au
LEFT JOIN faculty_members fm ON fm.user_id = au.id AND fm.deleted_at IS NULL
WHERE au.deleted_at IS NULL
  AND (
    fm.id IS NULL
    OR fm.deleted_at IS NOT NULL
  )
ORDER BY au.name;

-- ─── 2. RE-LINK active faculty_members (user_id=NULL) to admin_users by email ───
--    SAP sync creates faculty_members with user_id=NULL. If an admin_user
--    exists with the same email, link them.

UPDATE faculty_members fm
SET user_id = au.id,
    updated_at = NOW()
FROM admin_users au
WHERE LOWER(fm.email) = LOWER(au.email)
  AND fm.user_id IS NULL
  AND fm.deleted_at IS NULL
  AND au.deleted_at IS NULL;

-- ─── 3. HARD-DELETE soft-deleted faculty_members that have an active duplicate ───
--    After step 2, the active duplicate is now linked to the admin user.
--    The soft-deleted one is no longer needed.

DELETE FROM faculty_members
WHERE deleted_at IS NOT NULL
  AND LOWER(email) IN (
    SELECT LOWER(fm2.email)
    FROM faculty_members fm2
    WHERE fm2.deleted_at IS NULL
      AND fm2.user_id IS NOT NULL
  );

-- ─── 4. RESTORE remaining soft-deleted faculty_members (no active duplicate) ───

UPDATE faculty_members
SET deleted_at = NULL,
    status = 'active',
    is_active = TRUE,
    updated_at = NOW()
WHERE deleted_at IS NOT NULL
  AND LOWER(email) IN (
    SELECT au.email
    FROM admin_users au
    WHERE au.deleted_at IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM faculty_members fm2
    WHERE fm2.deleted_at IS NULL
      AND LOWER(fm2.email) = LOWER(faculty_members.email)
  );

-- ─── 5. CREATE faculty_members for admin_users that still have none ───

INSERT INTO faculty_members (
  user_id,
  sap_id,
  name,
  email,
  department,
  designation,
  status,
  is_active,
  is_google_sso_enabled,
  created_at,
  updated_at
)
SELECT
  au.id,
  COALESCE(au.sap_id, 'ADMIN-' || UPPER(SUBSTRING(au.id::text, 1, 8))),
  au.name,
  au.email,
  'Unassigned',
  NULL,
  'active',
  TRUE,
  TRUE,
  NOW(),
  NOW()
FROM admin_users au
WHERE au.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM faculty_members fm
    WHERE fm.user_id = au.id
      AND fm.deleted_at IS NULL
  );

-- ─── 6. Set role = NULL (faculty only) for manually-created admin accounts ───
--    These are test/orphan accounts with no SAP sap_id that were created
--    directly in admin_users. Real synced faculty keep their role.

UPDATE admin_users
SET role = NULL,
    updated_at = NOW()
WHERE deleted_at IS NULL
  AND role IS NOT NULL
  AND sap_id IS NULL
  AND id IN (
    SELECT au.id
    FROM admin_users au
    LEFT JOIN faculty_members fm ON fm.user_id = au.id AND fm.deleted_at IS NULL
    WHERE au.deleted_at IS NULL
      AND au.sap_id IS NULL
      AND fm.last_synced_at IS NULL
  );

-- ─── 7. POST-CHECK: verify all admin_users now have a faculty_members link ───

SELECT 'AFTER: admin users still missing from faculty_members' AS label;

SELECT
  au.id,
  au.name,
  au.email,
  au.role,
  CASE
    WHEN fm.id IS NULL THEN 'NO faculty_members record'
    WHEN fm.deleted_at IS NOT NULL THEN 'faculty_members soft-deleted'
    ELSE 'OK'
  END AS link_status
FROM admin_users au
LEFT JOIN faculty_members fm ON fm.user_id = au.id AND fm.deleted_at IS NULL
WHERE au.deleted_at IS NULL
  AND (
    fm.id IS NULL
    OR fm.deleted_at IS NOT NULL
  )
ORDER BY au.name;

-- ─── 8. VERIFY: total faculty_members count ───

SELECT 'VERIFY: faculty_members total' AS label;

SELECT COUNT(*) AS total_faculty_members
FROM faculty_members
WHERE deleted_at IS NULL;

-- ─── 9. VERIFY: role distribution on frontend (faculty_members JOIN admin_users) ───

SELECT 'VERIFY: frontend role distribution' AS label;

SELECT
  COALESCE(au.role::text, 'NULL (faculty only)') AS role,
  COUNT(*) AS count
FROM faculty_members fm
LEFT JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
WHERE fm.deleted_at IS NULL
GROUP BY au.role
ORDER BY au.role NULLS FIRST;

-- ─── 10. SAMPLE: recently fixed faculty_members ───

SELECT 'SAMPLE: recently fixed faculty_members' AS label;

SELECT
  fm.id,
  fm.name,
  fm.email,
  fm.sap_id,
  fm.department,
  fm.status,
  au.role AS admin_role
FROM faculty_members fm
LEFT JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
WHERE fm.deleted_at IS NULL
  AND fm.updated_at >= NOW() - INTERVAL '5 minutes'
ORDER BY fm.name
LIMIT 20;

COMMIT;
-- ROLLBACK;
