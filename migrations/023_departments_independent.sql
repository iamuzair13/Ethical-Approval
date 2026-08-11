-- migrations/023_departments_independent.sql
--
-- Makes departments independent of faculties in the organization management
-- workflow. Departments become top-level entities that no longer require a
-- parent faculty.
--
-- The faculties and programs tables are NOT dropped — they remain for:
--   - RBAC scope assignments (admin_faculty_assignments, admin_program_assignments)
--   - ERP sync resolution (faculty_members.faculty_id, resolveFacultyIdsFromSnapshotValue)
--   - Reports and exports
--   - Applicant faculty snapshot resolution
--
-- Idempotent: safe to run multiple times.

-- 1. Drop the UNIQUE(faculty_id, name) constraint so departments can have
--    the same name across different (or no) faculties.
ALTER TABLE departments
  DROP CONSTRAINT IF EXISTS departments_faculty_id_name_key;

-- 2. Replace the NOT NULL CASCADE FK with a nullable SET NULL FK so
--    departments can exist without a parent faculty. Existing departments
--    retain their faculty_id value; new departments can be created with
--    faculty_id = NULL.
ALTER TABLE departments
  DROP CONSTRAINT IF EXISTS departments_faculty_id_fkey;

ALTER TABLE departments
  ADD CONSTRAINT departments_faculty_id_fkey
  FOREIGN KEY (faculty_id) REFERENCES faculties(id) ON DELETE SET NULL;

ALTER TABLE departments
  ALTER COLUMN faculty_id DROP NOT NULL;

-- 3. Add a unique constraint on department name alone (case-sensitive) so
--    department names remain unique across the organization.
CREATE UNIQUE INDEX IF NOT EXISTS uq_departments_name
  ON departments(name)
  WHERE faculty_id IS NULL;
