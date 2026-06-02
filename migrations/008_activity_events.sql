-- migrations/008_activity_events.sql
-- Centralized activity / audit / notification events for admin, dean, and IREB actions.
-- Idempotent: safe to run multiple times.
--
-- Note: actor_admin_id / effective_admin_id are plain UUIDs here so this migration
-- can run before schema.admin_rbac.sql. Optional FKs are added at the end when
-- admin_users (and related tables) already exist.

BEGIN;

CREATE TABLE IF NOT EXISTS activity_events (
  id                  BIGSERIAL PRIMARY KEY,
  action_code         VARCHAR(120) NOT NULL,
  description         TEXT NOT NULL,
  target_type         VARCHAR(80) NOT NULL,
  target_id           VARCHAR(120),
  target_label        VARCHAR(255),

  actor_admin_id      UUID,
  actor_name          VARCHAR(255) NOT NULL,
  actor_role          VARCHAR(32) NOT NULL,

  effective_admin_id  UUID,
  effective_name      VARCHAR(255),
  effective_role      VARCHAR(32),

  impersonation_mode  VARCHAR(24),

  faculty_id          BIGINT,
  faculty_name        VARCHAR(255),

  submission_id       BIGINT,
  metadata_json       JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_timezone      VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_activity_events_created_at
  ON activity_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_actor_role_created
  ON activity_events (actor_role, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_action_code_created
  ON activity_events (action_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_target_type_created
  ON activity_events (target_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_faculty_created
  ON activity_events (faculty_id, created_at DESC)
  WHERE faculty_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_events_impersonation
  ON activity_events (impersonation_mode, created_at DESC)
  WHERE impersonation_mode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_events_effective_admin_created
  ON activity_events (effective_admin_id, created_at DESC)
  WHERE effective_admin_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_events_actor_admin_created
  ON activity_events (actor_admin_id, created_at DESC)
  WHERE actor_admin_id IS NOT NULL;

-- Optional referential constraints when RBAC / core tables are present
DO $$
BEGIN
  IF to_regclass('public.admin_users') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'activity_events_actor_admin_id_fkey'
    ) THEN
      ALTER TABLE activity_events
        ADD CONSTRAINT activity_events_actor_admin_id_fkey
        FOREIGN KEY (actor_admin_id) REFERENCES admin_users(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'activity_events_effective_admin_id_fkey'
    ) THEN
      ALTER TABLE activity_events
        ADD CONSTRAINT activity_events_effective_admin_id_fkey
        FOREIGN KEY (effective_admin_id) REFERENCES admin_users(id);
    END IF;
  END IF;

  IF to_regclass('public.faculties') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'activity_events_faculty_id_fkey'
    ) THEN
      ALTER TABLE activity_events
        ADD CONSTRAINT activity_events_faculty_id_fkey
        FOREIGN KEY (faculty_id) REFERENCES faculties(id);
    END IF;
  END IF;

  IF to_regclass('public.submissions') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'activity_events_submission_id_fkey'
    ) THEN
      ALTER TABLE activity_events
        ADD CONSTRAINT activity_events_submission_id_fkey
        FOREIGN KEY (submission_id) REFERENCES submissions(id);
    END IF;
  END IF;
END
$$;

COMMIT;
