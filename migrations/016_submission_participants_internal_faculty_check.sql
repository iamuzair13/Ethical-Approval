-- migrations/016_submission_participants_internal_faculty_check.sql
-- Updates the submission_participants source CHECK constraint to accept the
-- new 'internal_faculty' participant source.
--
-- Idempotent: safe to run multiple times.

BEGIN;

ALTER TABLE submission_participants
  DROP CONSTRAINT IF EXISTS submission_participants_source_check;

ALTER TABLE submission_participants
  ADD CONSTRAINT submission_participants_source_check
  CHECK (
    (source = 'internal_erp' AND sap_id IS NOT NULL AND external_name IS NULL)
    OR
    (source = 'internal_faculty' AND faculty_member_id IS NOT NULL AND external_name IS NULL)
    OR
    (source = 'external' AND external_name IS NOT NULL AND sap_id IS NULL AND faculty_member_id IS NULL)
  );

COMMIT;
