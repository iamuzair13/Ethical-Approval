-- Run once on databases created before `application_id` was added to schema.sql.

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS application_id CHAR(6);

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY id) AS rn
  FROM submissions
  WHERE application_id IS NULL
)
UPDATE submissions s
SET application_id = LPAD(((ranked.rn - 1) % 900000 + 100000)::text, 6, '0')
FROM ranked
WHERE s.id = ranked.id;

ALTER TABLE submissions
  ALTER COLUMN application_id SET NOT NULL;

ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_application_id_digits_ck;

ALTER TABLE submissions
  ADD CONSTRAINT submissions_application_id_digits_ck
  CHECK (application_id ~ '^[0-9]{6}$');

CREATE UNIQUE INDEX IF NOT EXISTS uq_submissions_application_id
  ON submissions (application_id);
