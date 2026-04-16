-- =========================
-- ENUMS
-- =========================
CREATE TYPE submission_type AS ENUM ('thesis', 'publication');
CREATE TYPE submission_domain AS ENUM ('medical', 'non_medical');
CREATE TYPE applicant_role AS ENUM ('student', 'faculty');

CREATE TYPE submission_status AS ENUM (
  'submitted',
  'under_dean_review',
  'dean_approved',
  'dean_rejected',
  'under_ireb_review',
  'approved',
  'rejected'
);

CREATE TYPE review_stage AS ENUM ('dean', 'ireb');
CREATE TYPE review_decision AS ENUM ('approved', 'rejected');

CREATE TYPE upload_stage AS ENUM ('submission', 'dean_review', 'ireb_review');
CREATE TYPE uploader_role AS ENUM ('student', 'faculty', 'dean', 'ireb');

CREATE TYPE participant_role AS ENUM (
  'supervisor',
  'co_supervisor',
  'co_author',
  'external_researcher'
);

CREATE TYPE participant_source AS ENUM ('internal_erp', 'external');

-- =========================
-- CORE SUBMISSION
-- =========================
CREATE TABLE submissions (
  id BIGSERIAL PRIMARY KEY,

  type submission_type NOT NULL,
  domain submission_domain NOT NULL,
  applicant_role applicant_role NOT NULL,

  current_status submission_status NOT NULL DEFAULT 'submitted',

  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  last_updated_at TIMESTAMPTZ,
  last_updated_by_sap_id VARCHAR(50)
);

-- ERP snapshot for historical accuracy
CREATE TABLE submission_applicant_snapshot (
  submission_id BIGINT PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,

  sap_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  faculty VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL,
  program VARCHAR(255),

  snapshot_taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Common research fields
CREATE TABLE submission_research_core (
  submission_id BIGINT PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  objectives TEXT NOT NULL,
  methodology TEXT NOT NULL,
  participants_range VARCHAR(100),
  research_population TEXT
);

-- Flexible ethical data storage (varies by type/domain/form)
CREATE TABLE submission_ethics_payload (
  submission_id BIGINT PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,
  ethics_json JSONB NOT NULL,
  -- optional: keep schema version to evolve form definitions safely
  schema_version VARCHAR(30) NOT NULL DEFAULT 'v1'
);

-- Thesis-only timeline
CREATE TABLE submission_timeline (
  submission_id BIGINT PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  CHECK (end_date >= start_date)
);

-- SDGs normalized
CREATE TABLE sdg_goals (
  id SMALLINT PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL, -- e.g. SDG-3
  name VARCHAR(255) NOT NULL
);

CREATE TABLE submission_sdgs (
  submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  sdg_id SMALLINT NOT NULL REFERENCES sdg_goals(id),
  PRIMARY KEY (submission_id, sdg_id)
);

-- Supervisors / Co-supervisors / Co-authors / External researchers
CREATE TABLE submission_participants (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,

  participant_role participant_role NOT NULL,
  source participant_source NOT NULL,

  -- Internal ERP person fields
  sap_id VARCHAR(50),
  internal_name VARCHAR(255),
  internal_email VARCHAR(255),
  internal_faculty VARCHAR(255),
  internal_department VARCHAR(255),

  -- External person fields
  external_name VARCHAR(255),
  external_email VARCHAR(255),
  external_affiliation VARCHAR(255),
  external_designation VARCHAR(255),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (
    (source = 'internal_erp' AND sap_id IS NOT NULL AND external_name IS NULL)
    OR
    (source = 'external' AND external_name IS NOT NULL AND sap_id IS NULL)
  )
);

-- Approval history (append-only)
CREATE TABLE approval_decisions (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,

  stage review_stage NOT NULL,
  decision review_decision NOT NULL,
  comment TEXT, -- reason/comments; mandatory on reject via CHECK below

  decided_by_sap_id VARCHAR(50) NOT NULL,
  decided_by_name VARCHAR(255),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (
    (decision = 'approved')
    OR
    (decision = 'rejected' AND comment IS NOT NULL AND LENGTH(TRIM(comment)) > 0)
  )
);

-- File attachments across stages
CREATE TABLE submission_attachments (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,

  upload_stage upload_stage NOT NULL,
  file_type VARCHAR(100) NOT NULL, -- consent_form/proposal/letter/questionnaire/other
  original_filename VARCHAR(255) NOT NULL,
  storage_key TEXT NOT NULL, -- S3 key / local path / blob id

  uploaded_by_role uploader_role NOT NULL,
  uploaded_by_sap_id VARCHAR(50),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Master faculty list for admin/dean/IREB assignment scopes
CREATE TABLE IF NOT EXISTS faculties (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- INDEXES FOR DASHBOARD / FILTERS
-- =========================
CREATE INDEX idx_submissions_type ON submissions(type);
CREATE INDEX idx_submissions_domain ON submissions(domain);
CREATE INDEX idx_submissions_status ON submissions(current_status);
CREATE INDEX idx_applicant_department ON submission_applicant_snapshot(department);
CREATE INDEX IF NOT EXISTS idx_faculties_active ON faculties(is_active);
CREATE INDEX idx_approvals_submission_stage ON approval_decisions(submission_id, stage, decided_at DESC);
CREATE INDEX idx_attachments_submission_stage ON submission_attachments(submission_id, upload_stage);
CREATE INDEX idx_ethics_json_gin ON submission_ethics_payload USING GIN (ethics_json);

-- helpful uniqueness for internal participant not repeated in same role
CREATE UNIQUE INDEX uq_submission_internal_participant_role
ON submission_participants(submission_id, participant_role, sap_id)
WHERE source = 'internal_erp';