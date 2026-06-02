-- migrations/010_activity_notification_reads.sql
-- Per-admin "last seen" timestamp for activity notification bell.

BEGIN;

CREATE TABLE IF NOT EXISTS activity_notification_reads (
  admin_user_id   UUID PRIMARY KEY,
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01T00:00:00Z'::timestamptz,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_notification_reads_last_read
  ON activity_notification_reads (last_read_at DESC);

COMMIT;
