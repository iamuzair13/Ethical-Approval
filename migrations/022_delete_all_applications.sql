-- migrations/022_delete_all_applications.sql
--
-- DESTRUCTIVE: Deletes ALL submissions and every related row.
--
-- This wipes the entire application dataset:
--   - submissions (the core rows)
--   - submission_applicant_snapshot   (ON DELETE CASCADE)
--   - submission_research_core         (ON DELETE CASCADE)
--   - submission_ethics_payload        (ON DELETE CASCADE)
--   - submission_attachments           (ON DELETE CASCADE)
--   - submission_participants          (ON DELETE CASCADE)
--   - submission_timeline              (ON DELETE CASCADE)
--   - approval_decisions               (ON DELETE CASCADE)
--   - activity_events                  (explicit delete — FK has no CASCADE)
--
-- User accounts (admin_users, faculty_members) and org structure
-- (faculties, departments, programs) are NOT touched.
--
-- Idempotent: safe to run multiple times (deletes 0 rows on subsequent runs).

-- activity_events references submissions(id) without ON DELETE CASCADE,
-- so remove those rows first to avoid a FK violation.
DELETE FROM activity_events WHERE submission_id IS NOT NULL;

-- Deleting from submissions cascades to all child tables listed above.
DELETE FROM submissions;

-- Reset the submissions id sequence so new applications start from 1.
ALTER SEQUENCE submissions_id_seq RESTART WITH 1;
