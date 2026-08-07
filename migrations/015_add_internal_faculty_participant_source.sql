-- migrations/015_add_internal_faculty_participant_source.sql
-- Adds the 'internal_faculty' value to the participant_source enum.
-- Kept as a separate migration because PostgreSQL requires the enum value to
-- be committed before it can be referenced by a CHECK constraint.
--
-- Idempotent: safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'participant_source' AND e.enumlabel = 'internal_faculty'
  ) THEN
    ALTER TYPE participant_source ADD VALUE 'internal_faculty';
  END IF;
END
$$;
