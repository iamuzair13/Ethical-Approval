-- migrations/014_faculty_member_roles_and_participant_schema.sql
-- Prepares the faculty member management architecture:
--   1. Adds sync/scope columns to faculty_members.
--   2. Creates faculty_member_roles table for scalable role assignment.
--   3. Adds faculty_member_id to submission_participants with an index.
--
-- The new participant_source enum value and the updated CHECK constraint are
-- added in separate migrations because PostgreSQL does not allow a newly-added
-- enum value to be used in the same query batch that created it.
--
-- Idempotent: safe to run multiple times.

BEGIN;

-- =========================
-- faculty_members enhancements
-- =========================
ALTER TABLE faculty_members
  ADD COLUMN IF NOT EXISTS faculty VARCHAR(255),
  ADD COLUMN IF NOT EXISTS program VARCHAR(255),
  ADD COLUMN IF NOT EXISTS employee_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- =========================
-- faculty_member_roles
-- =========================
CREATE TABLE IF NOT EXISTS faculty_member_roles (
  id BIGSERIAL PRIMARY KEY,
  faculty_member_id UUID NOT NULL REFERENCES faculty_members(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL CHECK (role IN ('supervisor')),
  assigned_by UUID REFERENCES admin_users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_faculty_member_roles_member
  ON faculty_member_roles(faculty_member_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_faculty_member_roles_status
  ON faculty_member_roles(status)
  WHERE deleted_at IS NULL;

-- =========================
-- submission_participants internal faculty support (column only)
-- =========================
ALTER TABLE submission_participants
  ADD COLUMN IF NOT EXISTS faculty_member_id UUID REFERENCES faculty_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_submission_participants_faculty_member
  ON submission_participants(faculty_member_id)
  WHERE faculty_member_id IS NOT NULL;

COMMIT;
