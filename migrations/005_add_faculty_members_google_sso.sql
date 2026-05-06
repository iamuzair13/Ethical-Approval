-- Faculty members master + Google SSO linkage
-- Based on staff sheet fields:
-- sap_id, name, department, designation, email

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'faculty_member_status') THEN
    CREATE TYPE faculty_member_status AS ENUM ('active', 'inactive');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS faculty_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sap_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL,
  designation VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  status faculty_member_status NOT NULL DEFAULT 'active',
  is_google_sso_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Keep email uniqueness case-insensitive.
CREATE UNIQUE INDEX IF NOT EXISTS uq_faculty_members_email_lower
  ON faculty_members (LOWER(email))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_faculty_members_department
  ON faculty_members(department)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_faculty_members_status
  ON faculty_members(status)
  WHERE deleted_at IS NULL;

-- External auth identities for faculty login (Google SSO first).
CREATE TABLE IF NOT EXISTS faculty_auth_accounts (
  id BIGSERIAL PRIMARY KEY,
  faculty_member_id UUID NOT NULL REFERENCES faculty_members(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'google',
  provider_subject VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sign_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (faculty_member_id, provider),
  UNIQUE (provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_faculty_auth_accounts_provider_email_lower
  ON faculty_auth_accounts (provider, LOWER(provider_email));

-- Optional seed/import strategy for your CSV:
-- 1) Load rows into a temp/staging table
-- 2) Upsert into faculty_members by sap_id
--
-- Example (adjust path per environment):
-- COPY temp_faculty_import (sap_id, name, department, designation, email)
-- FROM '/path/UOL LHR Staff List with Email IDs 01.05.26 - Sheet1.csv'
-- WITH (FORMAT csv, HEADER true);
