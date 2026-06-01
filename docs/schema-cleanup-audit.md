# Schema cleanup audit (post SAP faculty login)

Run only after faculty SAP login is verified in production.

## Method

Searched `src/`, `migrations/`, and `schema.sql` for table/column references (June 2026).

## Safe to drop (after production verification)

### `faculty_auth_accounts`

| Evidence | Detail |
|----------|--------|
| Application code | **No** TypeScript references |
| Purpose | Planned Google SSO linkage; never implemented |
| Migration | [`migrations/007_post_deploy_drop_faculty_auth_accounts.sql`](../migrations/007_post_deploy_drop_faculty_auth_accounts.sql) |

### `faculty_members` columns (optional, if table kept)

| Column | Application code |
|--------|------------------|
| `is_google_sso_enabled` | Schema/migrations only |
| `last_login_at` | Schema/migrations only |

Use a separate migration if product confirms these columns are not needed for imports.

## Do not drop

| Entity | Reason |
|--------|--------|
| `faculty_members` (table) | Historical roster / CSV import data; login no longer reads it but data should remain |
| `faculties`, `departments` | RBAC, forms, admin scope |
| `admin_users`, `admin_faculty_assignments`, `admin_department_assignments` | Admin portal |
| `faculty_sap_aliases` | Maps snapshot faculty strings to `faculties.id` in reports |
| All submission / approval / `user_profiles` tables | Core application data |

## Dormant code

[`src/lib/faculty-members.ts`](../src/lib/faculty-members.ts) is retained for future admin/import tooling; not used at login after SAP employee integration.
