-- migrations/025_find_duplicate_faculty_emails.sql
--
-- Diagnostic migration: identifies duplicate emails in faculty_members.
--
-- This migration is READ-ONLY — it does not modify any data.
--
-- To view the results with formatted output, run the companion script:
--   node scripts/find-duplicate-faculty-emails.mjs
--
-- That script runs the same queries but prints the results as tables.
--
-- If you run this file directly via run-sql-migration.mjs, the queries
-- will execute but results won't be displayed (the runner uses pool.query
-- which doesn't print SELECT output).

-- Duplicate emails (excluding soft-deleted records)
SELECT
  LOWER(TRIM(email)) AS email,
  COUNT(*) AS record_count,
  COUNT(*) FILTER (WHERE status = 'active' AND is_active = TRUE) AS active_count,
  STRING_AGG(sap_id, ', ' ORDER BY sap_id) AS sap_ids,
  STRING_AGG(name, ' | ' ORDER BY name) AS names,
  STRING_AGG(id::text, ', ' ORDER BY id) AS member_ids
FROM faculty_members
WHERE deleted_at IS NULL
  AND TRIM(email) != ''
GROUP BY LOWER(TRIM(email))
HAVING COUNT(*) > 1
ORDER BY record_count DESC, email;

-- Duplicate emails (including soft-deleted records)
SELECT
  LOWER(TRIM(email)) AS email,
  COUNT(*) AS record_count,
  COUNT(*) FILTER (WHERE status = 'active' AND is_active = TRUE) AS active_count,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS soft_deleted_count,
  STRING_AGG(sap_id, ', ' ORDER BY sap_id) AS sap_ids,
  STRING_AGG(name, ' | ' ORDER BY name) AS names,
  STRING_AGG(id::text, ', ' ORDER BY id) AS member_ids
FROM faculty_members
WHERE TRIM(email) != ''
GROUP BY LOWER(TRIM(email))
HAVING COUNT(*) > 1
ORDER BY record_count DESC, email;

-- Detail rows for each duplicate email (excluding soft-deleted)
SELECT
  fm.id,
  fm.sap_id,
  fm.name,
  fm.email,
  fm.department,
  fm.department_id,
  fm.faculty,
  fm.status,
  fm.is_active,
  fm.created_at,
  au.id AS admin_user_id,
  au.role AS admin_role,
  au.status AS admin_status
FROM faculty_members fm
LEFT JOIN admin_users au ON au.id = fm.user_id
WHERE fm.deleted_at IS NULL
  AND TRIM(fm.email) != ''
  AND LOWER(TRIM(fm.email)) IN (
    SELECT LOWER(TRIM(email))
    FROM faculty_members
    WHERE deleted_at IS NULL AND TRIM(email) != ''
    GROUP BY LOWER(TRIM(email))
    HAVING COUNT(*) > 1
  )
ORDER BY LOWER(TRIM(fm.email)), fm.name;
