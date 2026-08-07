-- Migration 018: Unify Users and Faculty Members
--
-- This migration establishes admin_users as the single source of truth for
-- authentication, authorization, role assignment, and status. Faculty members
-- become an extension of admin_users via a user_id foreign key.
--
-- Changes:
--   1. Make password_hash nullable (SSO users don't have passwords)
--   2. Make role nullable (faculty members without admin role have NULL role)
--   3. Add user_id column to faculty_members (links to admin_users)
--   4. Migrate data: link existing faculty_members to admin_users by email
--   5. Create admin_users records for faculty_members without a match
--   6. Drop faculty_member_roles table (roles come from admin_users.role)
--   7. Update indexes

-- ─── 1. Make password_hash nullable ───
ALTER TABLE admin_users ALTER COLUMN password_hash DROP NOT NULL;

-- ─── 2. Make role nullable ───
ALTER TABLE admin_users ALTER COLUMN role DROP NOT NULL;

-- ─── 3. Add user_id to faculty_members ───
ALTER TABLE faculty_members
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;

-- Unique index: one faculty profile per user
CREATE UNIQUE INDEX IF NOT EXISTS uq_faculty_members_user_id
  ON faculty_members(user_id)
  WHERE deleted_at IS NULL AND user_id IS NOT NULL;

-- ─── 4. Link existing faculty_members to admin_users by email ───
UPDATE faculty_members fm
SET user_id = au.id,
    updated_at = NOW()
FROM admin_users au
WHERE LOWER(fm.email) = LOWER(au.email)
  AND fm.deleted_at IS NULL
  AND au.deleted_at IS NULL
  AND fm.user_id IS NULL;

-- ─── 5. Create admin_users for faculty_members without a match ───
-- These are faculty-only users (no admin role, no password — SSO only).
INSERT INTO admin_users (name, email, status, sap_id, role, password_hash)
SELECT
  fm.name,
  LOWER(fm.email),
  (CASE WHEN fm.status = 'active' THEN 'active' ELSE 'inactive' END)::admin_status,
  fm.sap_id,
  NULL,
  NULL
FROM faculty_members fm
WHERE fm.deleted_at IS NULL
  AND fm.user_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM admin_users au
    WHERE LOWER(au.email) = LOWER(fm.email)
      AND au.deleted_at IS NULL
  )
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  sap_id = COALESCE(admin_users.sap_id, EXCLUDED.sap_id),
  updated_at = NOW();

-- ─── 6. Link remaining faculty_members to newly created admin_users ───
UPDATE faculty_members fm
SET user_id = au.id,
    updated_at = NOW()
FROM admin_users au
WHERE LOWER(fm.email) = LOWER(au.email)
  AND fm.deleted_at IS NULL
  AND au.deleted_at IS NULL
  AND fm.user_id IS NULL;

-- ─── 7. Drop faculty_member_roles table ───
-- Roles now come from admin_users.role. The faculty_member_roles table
-- was only used for "supervisor" role assignment, which is now handled
-- by admin_users with role = 'supervisor' and scope assignments.
DROP TABLE IF EXISTS faculty_member_roles CASCADE;

-- ─── 8. Update indexes ───
-- The old index required role to be non-null. Create a new partial index
-- that only indexes rows with a non-null role (for admin queries).
DROP INDEX IF EXISTS idx_admin_users_role_status;
CREATE INDEX IF NOT EXISTS idx_admin_users_role_status
  ON admin_users(role, status)
  WHERE deleted_at IS NULL AND role IS NOT NULL;

-- Index for looking up users by email (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_admin_users_email_lower
  ON admin_users(LOWER(email))
  WHERE deleted_at IS NULL;

-- ─── 9. Update submission_participants constraint ───
-- The faculty_member_id column still references faculty_members(id),
-- which is fine — faculty_members is now an extension of admin_users.
-- No changes needed to submission_participants.

-- ─── 10. Update activity_events ───
-- actor_role and effective_role are VARCHAR(32), so NULL role users
-- won't have a role in activity events. This is handled in code.
-- No schema changes needed.
