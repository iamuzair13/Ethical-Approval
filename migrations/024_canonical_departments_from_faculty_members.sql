-- migrations/024_canonical_departments_from_faculty_members.sql
--
-- Consolidates department data into one canonical source.
--
-- ROOT CAUSE: The `departments` table had 68 manually inserted records, but
-- `faculty_members.department` (synced from SAP) had ~150+ distinct text
-- values, many of which didn't match any departments table record. This left
-- most `faculty_members.department_id` as NULL, causing the supervisor query
-- (which filters by `fm.department_id = $1`) to return zero results.
--
-- This migration:
--   1. For every distinct TRIM(faculty_members.department) value, creates a
--      canonical department record if one doesn't already exist (matched by
--      normalized name).
--   2. Updates all faculty_members.department_id to point to the canonical
--      department record.
--   3. Deactivates departments table records that have no faculty_members
--      AND no other FK references.
--
-- Idempotent: safe to run multiple times.

BEGIN;

-- Helper: create a normalization function that mirrors
-- normalizeDepartmentName() in src/lib/faculty-by-department.ts.
CREATE OR REPLACE FUNCTION normalize_dept_name(input TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  result := LOWER(TRIM(input));
  result := REPLACE(result, '&', ' and ');
  result := REGEXP_REPLACE(result, '\bdeptartment\b', 'department', 'g');
  result := REGEXP_REPLACE(result, '\bdeveloment\b', 'development', 'g');
  result := REGEXP_REPLACE(result, '\bregenrative\b', 'regenerative', 'g');
  result := REGEXP_REPLACE(result, '\btech\b', 'technology', 'g');
  result := REGEXP_REPLACE(result, '[^a-z0-9 ]', ' ', 'g');
  result := REGEXP_REPLACE(result, '\s+', ' ', 'g');
  RETURN TRIM(result);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─── Step 1: Create canonical department records for every distinct
--              faculty_members.department text value that doesn't already
--              have a matching department in the departments table. ───

INSERT INTO departments (faculty_id, name, is_active)
SELECT NULL, TRIM(fm.department), TRUE
FROM (
  SELECT DISTINCT TRIM(department) AS department
  FROM faculty_members
  WHERE deleted_at IS NULL
    AND TRIM(department) IS NOT NULL
    AND TRIM(department) != ''
) fm
WHERE NOT EXISTS (
  SELECT 1
  FROM departments d
  WHERE normalize_dept_name(d.name) = normalize_dept_name(fm.department)
)
ON CONFLICT DO NOTHING;

-- ─── Step 2: Update all faculty_members.department_id to point to the
--              canonical department record (matched by normalized name,
--              preferring exact text match). ───

UPDATE faculty_members fm
SET department_id = canonical.dept_id,
    updated_at = NOW()
FROM (
  SELECT
    fm2.id AS fm_id,
    (
      SELECT d.id
      FROM departments d
      WHERE d.is_active = TRUE
        AND normalize_dept_name(d.name) = normalize_dept_name(fm2.department)
      ORDER BY
        CASE
          WHEN LOWER(TRIM(d.name)) = LOWER(TRIM(fm2.department)) THEN 0
          ELSE 1
        END,
        d.id ASC
      LIMIT 1
    ) AS dept_id
  FROM faculty_members fm2
  WHERE fm2.deleted_at IS NULL
    AND TRIM(fm2.department) IS NOT NULL
    AND TRIM(fm2.department) != ''
) canonical
WHERE fm.id = canonical.fm_id
  AND canonical.dept_id IS NOT NULL
  AND fm.department_id IS DISTINCT FROM canonical.dept_id;

-- ─── Step 3: Deactivate departments that have no faculty_members, no
--              admin_department_assignments, no admin_program_assignments,
--              and no programs referencing them. ───

UPDATE departments d
SET is_active = FALSE,
    updated_at = NOW()
WHERE d.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM faculty_members fm
    WHERE fm.department_id = d.id AND fm.deleted_at IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM admin_department_assignments ada
    WHERE ada.department_id = d.id AND ada.deleted_at IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM admin_program_assignments apa
    WHERE apa.department_id = d.id AND apa.deleted_at IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM programs p WHERE p.department_id = d.id
  );

COMMIT;
