-- Migration: Rename "dean" role/stage to "supervisor" across all enums and tables.
-- Safe to run on both existing databases (has old 'dean' values) and fresh databases
-- (schema.sql already creates 'supervisor' values – the DO blocks below are no-ops).

BEGIN;

-- Guard each enum rename with an existence check because PostgreSQL's
-- ALTER TYPE ... RENAME VALUE errors if the old value is absent.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'admin_role' AND e.enumlabel = 'dean'
  ) THEN
    ALTER TYPE admin_role RENAME VALUE 'dean' TO 'supervisor';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'admin_assignment_type' AND e.enumlabel = 'dean_primary'
  ) THEN
    ALTER TYPE admin_assignment_type RENAME VALUE 'dean_primary' TO 'supervisor_primary';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'submission_status' AND e.enumlabel = 'under_dean_review'
  ) THEN
    ALTER TYPE submission_status RENAME VALUE 'under_dean_review' TO 'under_supervisor_review';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'submission_status' AND e.enumlabel = 'dean_approved'
  ) THEN
    ALTER TYPE submission_status RENAME VALUE 'dean_approved' TO 'supervisor_approved';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'submission_status' AND e.enumlabel = 'dean_rejected'
  ) THEN
    ALTER TYPE submission_status RENAME VALUE 'dean_rejected' TO 'supervisor_rejected';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'review_stage' AND e.enumlabel = 'dean'
  ) THEN
    ALTER TYPE review_stage RENAME VALUE 'dean' TO 'supervisor';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'upload_stage' AND e.enumlabel = 'dean_review'
  ) THEN
    ALTER TYPE upload_stage RENAME VALUE 'dean_review' TO 'supervisor_review';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'uploader_role' AND e.enumlabel = 'dean'
  ) THEN
    ALTER TYPE uploader_role RENAME VALUE 'dean' TO 'supervisor';
  END IF;
END
$$;

-- 7. admin_department_assignments: VARCHAR column with CHECK constraint
--    Drop old constraint, update data, add new constraint
ALTER TABLE admin_department_assignments DROP CONSTRAINT IF EXISTS admin_department_assignments_assignment_type_check;

UPDATE admin_department_assignments
SET assignment_type = 'supervisor_primary'
WHERE assignment_type = 'dean_primary';

ALTER TABLE admin_department_assignments
  ADD CONSTRAINT admin_department_assignments_assignment_type_check
  CHECK (assignment_type IN ('supervisor_primary', 'ireb_scope'));

-- 8. Rename unique index on admin_faculty_assignments
DROP INDEX IF EXISTS uq_dean_faculty_single_active;
CREATE UNIQUE INDEX IF NOT EXISTS uq_supervisor_faculty_single_active
  ON admin_faculty_assignments(faculty_id)
  WHERE assignment_type = 'supervisor_primary' AND deleted_at IS NULL;

-- 9. Update any activity_events rows that store the old role string
UPDATE activity_events SET actor_role = 'supervisor'     WHERE actor_role = 'dean';
UPDATE activity_events SET effective_role = 'supervisor' WHERE effective_role = 'dean';

COMMIT;
