-- migrations/006_add_user_profiles.sql
-- Adds editable user-profile fields keyed by SAP ID. Works for both students
-- and faculty: SAP IDs are the canonical identity used across the app
-- (see session.user.sapId, faculty_members.sap_id, submission_applicant_snapshot.sap_id).
--
-- Idempotent: safe to run multiple times.

BEGIN;

CREATE TABLE IF NOT EXISTS user_profiles (
  sap_id              VARCHAR(50) PRIMARY KEY,
  phone               VARCHAR(40),
  bio                 TEXT,
  avatar_url          TEXT,
  locale              VARCHAR(20),
  notification_email  VARCHAR(255),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive lookup on notification_email (unique not enforced — multiple
-- accounts may forward to the same address).
CREATE INDEX IF NOT EXISTS idx_user_profiles_notification_email_lower
  ON user_profiles (LOWER(notification_email))
  WHERE notification_email IS NOT NULL;

-- Auto-update updated_at on every UPDATE.
CREATE OR REPLACE FUNCTION set_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_user_profiles_updated_at();

COMMIT;
