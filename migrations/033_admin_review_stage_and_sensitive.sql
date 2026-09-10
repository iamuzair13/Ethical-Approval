-- migrations/033_admin_review_stage_and_sensitive.sql
--
-- Introduces an Administrator (IREB Chairman) review stage between HOD and
-- IREB for student theses, and as the first review stage for all publications
-- (student + faculty, including HODs acting as applicants).
--
-- Also adds a "sensitive" flag so the Administrator can route an application
-- to a Sensitive Cases section (visible to Administrator + IREB only) where
-- both roles can perform the usual approve/reject actions.
--
-- Routing after this migration:
--   Student thesis (Forms 1, 3):      draft -> submitted (HOD) -> under_admin_review -> under_ireb_review -> approved/rejected
--   Student publication (Forms 2, 4): draft -> under_admin_review -> under_ireb_review -> approved/rejected
--   Faculty publication (Forms 5, 6): draft -> under_admin_review -> under_ireb_review -> approved/rejected
--
-- Legacy data: existing rows already at `under_ireb_review` (routed directly
-- under the old logic) are NOT backfilled — they continue their existing flow.
-- The new `under_admin_review` stage only applies to submissions submitted
-- after this migration is applied.
--
-- Idempotent: safe to run multiple times.

BEGIN;

-- =========================
-- 1. submission_status: add 'under_admin_review'
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'submission_status' AND e.enumlabel = 'under_admin_review'
  ) THEN
    ALTER TYPE submission_status ADD VALUE 'under_admin_review';
  END IF;
END
$$;

-- =========================
-- 2. review_stage: add 'admin'
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'review_stage' AND e.enumlabel = 'admin'
  ) THEN
    ALTER TYPE review_stage ADD VALUE 'admin';
  END IF;
END
$$;

-- =========================
-- 3. review_decision: add 'recommended' and 'marked_sensitive'
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'review_decision' AND e.enumlabel = 'recommended'
  ) THEN
    ALTER TYPE review_decision ADD VALUE 'recommended';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'review_decision' AND e.enumlabel = 'marked_sensitive'
  ) THEN
    ALTER TYPE review_decision ADD VALUE 'marked_sensitive';
  END IF;
END
$$;

-- =========================
-- 4. submissions: add is_sensitive flag
-- =========================
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_submissions_is_sensitive
  ON submissions(is_sensitive)
  WHERE is_sensitive = TRUE;

-- =========================
-- 5. approval_decisions: update CHECK constraint to allow
--    'recommended' and 'marked_sensitive' decisions (admin stage).
--    The original constraint only allowed 'approved' or 'rejected'.
-- =========================
ALTER TABLE approval_decisions DROP CONSTRAINT IF EXISTS approval_decisions_check;

ALTER TABLE approval_decisions
  ADD CONSTRAINT approval_decisions_check
  CHECK (
    decision = 'approved'::review_decision
    OR decision = 'recommended'::review_decision
    OR decision = 'marked_sensitive'::review_decision
    OR (
      decision = 'rejected'::review_decision
      AND comment IS NOT NULL
      AND length(TRIM(BOTH FROM comment)) > 0
    )
  );

COMMIT;
