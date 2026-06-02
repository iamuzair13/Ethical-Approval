-- migrations/009_backfill_activity_from_approval_decisions.sql
-- One-time idempotent backfill of legacy approval_decisions into activity_events.
-- Skips cleanly when approval_decisions is not present (apply schema.sql first).

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.activity_events') IS NULL THEN
    RAISE NOTICE '009_backfill: skipped — activity_events does not exist (run 008 first).';
    RETURN;
  END IF;

  IF to_regclass('public.approval_decisions') IS NULL
     OR to_regclass('public.submissions') IS NULL THEN
    RAISE NOTICE '009_backfill: skipped — approval_decisions or submissions not found (apply schema.sql for historical backfill).';
    RETURN;
  END IF;

  EXECUTE $backfill$
    INSERT INTO activity_events (
      action_code,
      description,
      target_type,
      target_id,
      target_label,
      actor_name,
      actor_role,
      effective_name,
      effective_role,
      impersonation_mode,
      submission_id,
      metadata_json,
      created_at,
      actor_timezone
    )
    SELECT
      CASE
        WHEN ad.decision = 'approved' THEN 'application.review.approve'
        ELSE 'application.review.reject'
      END,
      COALESCE(NULLIF(TRIM(ad.comment), ''), ad.decision || ' (' || ad.stage || ')'),
      'application',
      s.application_id,
      s.application_id,
      COALESCE(ad.decided_by_name, 'Unknown'),
      ad.stage,
      CASE
        WHEN ad.comment ~ 'while viewing as' THEN (regexp_match(ad.comment, 'while viewing as (.+?)\.'))[1]
        WHEN ad.comment ~ 'on behalf of' THEN (regexp_match(ad.comment, 'on behalf of (.+?)\.'))[1]
        ELSE NULL
      END,
      ad.stage,
      CASE
        WHEN ad.comment ~ 'while viewing as' THEN 'view_as'
        WHEN ad.comment ~ 'on behalf of' THEN 'on_behalf'
        ELSE NULL
      END,
      ad.submission_id,
      jsonb_build_object(
        'source_decision_id', ad.id::text,
        'migrated_from', 'approval_decisions',
        'stage', ad.stage,
        'decision', ad.decision
      ),
      ad.decided_at,
      'UTC'
    FROM approval_decisions ad
    INNER JOIN submissions s ON s.id = ad.submission_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM activity_events ae
      WHERE ae.metadata_json->>'source_decision_id' = ad.id::text
    )
  $backfill$;

  RAISE NOTICE '009_backfill: completed.';
END
$$;

COMMIT;
