-- 031: Drop the old submission_participants_check constraint
--
-- The original check constraint only allowed 'internal_erp' and 'external'
-- sources. A later migration added the 'internal_faculty' source and a
-- newer, more complete constraint (submission_participants_source_check)
-- that includes all three sources. However, the old constraint was never
-- dropped, so it still blocked inserts with source = 'internal_faculty'
-- even though the newer constraint allowed them.
--
-- This migration drops the old, redundant constraint. The
-- submission_participants_source_check constraint remains and covers all
-- valid source combinations.

ALTER TABLE submission_participants DROP CONSTRAINT IF EXISTS submission_participants_check;
