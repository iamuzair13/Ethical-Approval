-- POST-DEPLOY ONLY: run after SAP faculty login is verified in production.
-- See docs/schema-cleanup-audit.md
--
-- Rollback (if needed before any dependent data existed):
--   Re-run migrations/005_add_faculty_members_google_sso.sql section for faculty_auth_accounts

DROP TABLE IF EXISTS faculty_auth_accounts;
