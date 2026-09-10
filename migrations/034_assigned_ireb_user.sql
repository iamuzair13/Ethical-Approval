-- migrations/034_assigned_ireb_user.sql
--
-- Adds `assigned_ireb_user_id` to submissions so the Administrator can
-- recommend an application to a specific IREB member.  Only that IREB
-- member (and administrators) will be able to see the application once
-- it has been recommended.
--
-- Idempotent: safe to run multiple times.

BEGIN;

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS assigned_ireb_user_id UUID
    REFERENCES admin_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_submissions_assigned_ireb_user
  ON submissions(assigned_ireb_user_id)
  WHERE assigned_ireb_user_id IS NOT NULL;

COMMIT;
