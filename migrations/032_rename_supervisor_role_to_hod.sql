-- migrations/032_rename_supervisor_role_to_hod.sql
-- Structural change: faculty members are now simple applicants (SAP auth
-- integration planned for later). The "supervisor" review role is renamed
-- to "hod" (Head of Department) everywhere. The approval workflow itself
-- (student -> HOD review -> IREB review) is unchanged, only the role name.
--
-- Idempotent: safe to run multiple times.

BEGIN;

-- =========================
-- 1. Enum value renames
-- =========================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'admin_role' AND e.enumlabel = 'supervisor'
  ) THEN
    ALTER TYPE admin_role RENAME VALUE 'supervisor' TO 'hod';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'admin_assignment_type' AND e.enumlabel = 'supervisor_primary'
  ) THEN
    ALTER TYPE admin_assignment_type RENAME VALUE 'supervisor_primary' TO 'hod_primary';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'review_stage' AND e.enumlabel = 'supervisor'
  ) THEN
    ALTER TYPE review_stage RENAME VALUE 'supervisor' TO 'hod';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'uploader_role' AND e.enumlabel = 'supervisor'
  ) THEN
    ALTER TYPE uploader_role RENAME VALUE 'supervisor' TO 'hod';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'upload_stage' AND e.enumlabel = 'supervisor_review'
  ) THEN
    ALTER TYPE upload_stage RENAME VALUE 'supervisor_review' TO 'hod_review';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'participant_role' AND e.enumlabel = 'supervisor'
  ) THEN
    ALTER TYPE participant_role RENAME VALUE 'supervisor' TO 'hod';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'participant_role' AND e.enumlabel = 'co_supervisor'
  ) THEN
    ALTER TYPE participant_role RENAME VALUE 'co_supervisor' TO 'co_hod';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'submission_status' AND e.enumlabel = 'under_supervisor_review'
  ) THEN
    ALTER TYPE submission_status RENAME VALUE 'under_supervisor_review' TO 'under_hod_review';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'submission_status' AND e.enumlabel = 'supervisor_approved'
  ) THEN
    ALTER TYPE submission_status RENAME VALUE 'supervisor_approved' TO 'hod_approved';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'submission_status' AND e.enumlabel = 'supervisor_rejected'
  ) THEN
    ALTER TYPE submission_status RENAME VALUE 'supervisor_rejected' TO 'hod_rejected';
  END IF;
END
$$;

-- =========================
-- 2. submissions: column renames (per-application HOD routing, added in 021)
-- =========================
ALTER TABLE submissions RENAME COLUMN supervisor_user_id TO hod_user_id;
ALTER TABLE submissions RENAME COLUMN supervisor_name_snapshot TO hod_name_snapshot;
ALTER TABLE submissions RENAME COLUMN supervisor_sap_id_snapshot TO hod_sap_id_snapshot;
ALTER TABLE submissions RENAME COLUMN supervisor_email_snapshot TO hod_email_snapshot;
ALTER TABLE submissions RENAME COLUMN supervisor_department_snapshot TO hod_department_snapshot;
ALTER TABLE submissions RENAME COLUMN supervisor_faculty_snapshot TO hod_faculty_snapshot;

ALTER INDEX IF EXISTS idx_submissions_supervisor_user_id RENAME TO idx_submissions_hod_user_id;

-- =========================
-- 3. admin_department_assignments / admin_program_assignments:
--    assignment_type is VARCHAR + CHECK (not an enum) — update data then constraint.
-- =========================
ALTER TABLE admin_department_assignments DROP CONSTRAINT IF EXISTS admin_department_assignments_assignment_type_check;
UPDATE admin_department_assignments SET assignment_type = 'hod_primary' WHERE assignment_type = 'supervisor_primary';
ALTER TABLE admin_department_assignments
  ADD CONSTRAINT admin_department_assignments_assignment_type_check
  CHECK (assignment_type IN ('hod_primary', 'ireb_scope'));

ALTER TABLE admin_program_assignments DROP CONSTRAINT IF EXISTS admin_program_assignments_assignment_type_check;
UPDATE admin_program_assignments SET assignment_type = 'hod_primary' WHERE assignment_type = 'supervisor_primary';
ALTER TABLE admin_program_assignments
  ADD CONSTRAINT admin_program_assignments_assignment_type_check
  CHECK (assignment_type IN ('hod_primary', 'ireb_scope'));

-- =========================
-- 4. Rename the "single active hod per faculty" unique index if still present.
--    (It was dropped in migration 021 for per-application routing, but guard
--    against environments where it still exists.)
-- =========================
ALTER INDEX IF EXISTS uq_supervisor_faculty_single_active RENAME TO uq_hod_faculty_single_active;

COMMIT;
