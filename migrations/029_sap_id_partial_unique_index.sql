-- Replace the hard UNIQUE constraint on faculty_members.sap_id with a
-- partial unique index that only applies to non-deleted records.
--
-- The original `sap_id VARCHAR(50) NOT NULL UNIQUE` constraint blocks
-- re-creating a faculty member after they've been soft-deleted
-- (deleted_at IS NOT NULL), because the hard unique constraint covers
-- ALL rows including soft-deleted ones.
--
-- The email uniqueness already uses a partial index
-- (uq_faculty_members_email_lower ... WHERE deleted_at IS NULL), so we
-- align sap_id to the same pattern.

-- 1. Drop the existing table-level unique constraint.
ALTER TABLE faculty_members DROP CONSTRAINT IF EXISTS faculty_members_sap_id_key;

-- 2. Create a partial unique index that only enforces uniqueness for
--    non-deleted rows (same pattern as uq_faculty_members_email_lower).
CREATE UNIQUE INDEX IF NOT EXISTS uq_faculty_members_sap_id
  ON faculty_members (sap_id)
  WHERE deleted_at IS NULL;
