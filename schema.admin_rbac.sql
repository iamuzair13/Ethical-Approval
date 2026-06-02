DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
    CREATE TYPE admin_role AS ENUM ('administrator', 'dean', 'ireb');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_status') THEN
    CREATE TYPE admin_status AS ENUM ('active', 'inactive');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_assignment_type') THEN
    CREATE TYPE admin_assignment_type AS ENUM ('dean_primary', 'ireb_scope');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS faculties (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faculty_sap_aliases (
  id BIGSERIAL PRIMARY KEY,
  faculty_id BIGINT NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  sap_value_normalized VARCHAR(255) NOT NULL UNIQUE,
  source_system VARCHAR(100) NOT NULL DEFAULT 'sap',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role admin_role NOT NULL,
  status admin_status NOT NULL DEFAULT 'active',
  sap_id VARCHAR(50) UNIQUE,
  faculty_id BIGINT REFERENCES faculties(id),
  created_by UUID REFERENCES admin_users(id),
  token_version INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_faculty_assignments (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  faculty_id BIGINT NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  assignment_type admin_assignment_type NOT NULL,
  assigned_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_admin_id UUID REFERENCES admin_users(id),
  action VARCHAR(120) NOT NULL,
  target_type VARCHAR(80) NOT NULL,
  target_id VARCHAR(120),
  metadata_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS activity_notification_reads (
  admin_user_id   UUID PRIMARY KEY,
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01T00:00:00Z'::timestamptz,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_notification_reads_last_read
  ON activity_notification_reads (last_read_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_assignment_single_active
ON admin_faculty_assignments(admin_user_id, faculty_id, assignment_type)
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dean_faculty_single_active
ON admin_faculty_assignments(faculty_id)
WHERE assignment_type = 'dean_primary' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_users_role_status
ON admin_users(role, status)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_snapshot_faculty
ON submission_applicant_snapshot(faculty);
