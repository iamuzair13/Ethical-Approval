-- migrations/017_faculty_sync_tracking_and_org_links.sql
-- Enhances faculty_members with organization FK links and employee status,
-- and creates sync tracking + designation rule tables.
--
-- Idempotent: safe to run multiple times.

BEGIN;

-- =========================
-- faculty_members: organization FK links and employee status
-- =========================
ALTER TABLE faculty_members
  ADD COLUMN IF NOT EXISTS employee_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS faculty_id BIGINT REFERENCES faculties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS program_id BIGINT REFERENCES programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS employee_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_faculty_members_faculty_id
  ON faculty_members(faculty_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_faculty_members_department_id
  ON faculty_members(department_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_faculty_members_is_active
  ON faculty_members(is_active)
  WHERE deleted_at IS NULL;

-- =========================
-- faculty_designation_rules: configurable designation allow/deny list
-- =========================
CREATE TABLE IF NOT EXISTS faculty_designation_rules (
  id BIGSERIAL PRIMARY KEY,
  designation VARCHAR(255) NOT NULL,
  is_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (designation)
);

-- =========================
-- faculty_sync_history: tracks each sync run
-- =========================
CREATE TABLE IF NOT EXISTS faculty_sync_history (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_records INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_faculty_sync_history_started_at
  ON faculty_sync_history(started_at DESC);

-- =========================
-- faculty_sync_errors: per-record error/skip logging
-- =========================
CREATE TABLE IF NOT EXISTS faculty_sync_errors (
  id BIGSERIAL PRIMARY KEY,
  sync_history_id BIGINT REFERENCES faculty_sync_history(id) ON DELETE CASCADE,
  sap_id VARCHAR(50),
  reason VARCHAR(255) NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faculty_sync_errors_sync_history
  ON faculty_sync_errors(sync_history_id);

CREATE INDEX IF NOT EXISTS idx_faculty_sync_errors_reason
  ON faculty_sync_errors(reason);

COMMIT;
