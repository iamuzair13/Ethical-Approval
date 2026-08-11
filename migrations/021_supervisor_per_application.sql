-- migrations/021_supervisor_per_application.sql
-- Per-application supervisor selection.
--
-- Previously supervisor routing was faculty-scoped: any supervisor assigned to
-- the applicant's faculty could approve any student application in that faculty,
-- and a DB unique index enforced one supervisor per faculty.
--
-- This migration:
--   1. Adds a `supervisor_user_id` FK on submissions so the SELECTED supervisor
--      is the only one who can approve that specific application.
--   2. Adds snapshot columns (name/sap_id/email/department/faculty) so the
--      supervisor's profile data at submission time is preserved even if the
--      faculty_members row changes later.
--   3. Drops the one-supervisor-per-faculty unique index so multiple
--      supervisors can coexist within a faculty/department and students can
--      pick the relevant one.
--
-- Idempotent: safe to run multiple times.

-- 1. supervisor_user_id FK on submissions (authoritative routing key)
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS supervisor_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;

-- 2. Supervisor snapshot columns (historical record at submission time)
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS supervisor_name_snapshot VARCHAR(255),
  ADD COLUMN IF NOT EXISTS supervisor_sap_id_snapshot VARCHAR(50),
  ADD COLUMN IF NOT EXISTS supervisor_email_snapshot VARCHAR(255),
  ADD COLUMN IF NOT EXISTS supervisor_department_snapshot VARCHAR(255),
  ADD COLUMN IF NOT EXISTS supervisor_faculty_snapshot VARCHAR(255);

-- 3. Index for fast "applications assigned to this supervisor" lookups
CREATE INDEX IF NOT EXISTS idx_submissions_supervisor_user_id
  ON submissions(supervisor_user_id)
  WHERE supervisor_user_id IS NOT NULL;

-- 4. Drop the one-supervisor-per-faculty constraint so multiple supervisors
--    can be assigned within a faculty. Per-application routing is now handled
--    by submissions.supervisor_user_id.
DROP INDEX IF EXISTS uq_supervisor_faculty_single_active;
