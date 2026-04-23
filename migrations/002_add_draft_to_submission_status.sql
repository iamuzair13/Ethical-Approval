-- Adds in-progress application drafts (saved via "Save Progress" on the student stepper).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'submission_status'
      AND e.enumlabel = 'draft'
  ) THEN
    ALTER TYPE submission_status ADD VALUE 'draft';
  END IF;
END
$$;
