# Faculty Member Architecture

> **Date:** 2026-08-05  
> **Phase 1:** Architectural preparation only. No supervisor assignment UI or workflow changes.

## Overview

Faculty members are now first-class internal entities instead of transient SAP
verifications. SAP still provides the source of truth for employee data, but the
system keeps a local `faculty_members` record for authentication, role
assignment, and future workflow permissions.

```text
SAP Employee API (EmployeeSet)
        |
        v
fetchAllEmployees (bulk, paginated)
        |
        v
Faculty Filtering Pipeline (src/lib/sap/faculty-filter.ts)
        |
        +-- 1. Active employee check (status, leaving date)
        +-- 2. Academic sector check (exclude admin/HR/finance/etc.)
        +-- 3. Email validation (@uol.edu.pk only, no student emails)
        +-- 4. Designation validation (configurable via faculty_designation_rules)
        +-- 5. Organization mapping (resolve faculty_id, department_id)
        |
        v
faculty_members table  (internal canonical record)
        |
        +-- Authentication identity
        +-- Organization FK links (faculty_id, department_id, program_id)
        +-- faculty_member_roles table  (supervisor today, more later)
        +-- submission_participants.faculty_member_id  (future linkage)
        |
        v
NextAuth session: facultyMemberId, userType, facultyId, departmentId, facultyMemberRoles
```

## Database

### `faculty_members` enhancements

- `sap_id` — canonical SAP identifier, unique.
- `employee_id` — optional HR/employee number if different from `sap_id`.
- `employee_code` — SAP personnel/employee code.
- `name`, `email`, `department` (text), `designation` — from SAP.
- `faculty` (text) — derived from department using `inferFacultyFromDepartment`.
- `faculty_id` — FK to `faculties(id)`, resolved during sync.
- `department_id` — FK to `departments(id)`, resolved during sync.
- `program_id` — FK to `programs(id)`, for future use.
- `program` (text) — optional, for future use.
- `employee_type` — optional classification (e.g., `faculty`, `staff`).
- `employee_status` — SAP employment status text.
- `status` — `active` / `inactive` (faculty_member_status enum).
- `is_active` — boolean flag for quick filtering.
- `last_synced_at` — last SAP bulk sync.
- `last_login_at` — retained from earlier schema.
- Soft delete via `deleted_at`.

### `faculty_member_roles`

Scalable role assignment table. One faculty member may have multiple roles over
time. Roles can be soft-deleted.

- `id BIGSERIAL PRIMARY KEY`
- `faculty_member_id UUID REFERENCES faculty_members(id)`
- `role VARCHAR(30) CHECK (role IN ('supervisor'))` — extendable.
- `assigned_by UUID REFERENCES admin_users(id)`
- `assigned_at`, `status`, `created_at`, `updated_at`, `deleted_at`

### `faculty_designation_rules`

Configurable designation allow/deny list used by the SAP filtering pipeline.

- `id BIGSERIAL PRIMARY KEY`
- `designation VARCHAR(255) NOT NULL UNIQUE`
- `is_allowed BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at`, `updated_at`

When the table is empty, the filter falls back to built-in default keyword lists.

### `faculty_sync_history`

Tracks each SAP faculty sync run.

- `id BIGSERIAL PRIMARY KEY`
- `started_at`, `completed_at`
- `total_records`, `inserted_count`, `updated_count`, `skipped_count`, `failed_count`
- `status` — `running` / `completed` / `failed`

### `faculty_sync_errors`

Per-record error/skip logging for debugging SAP mapping issues.

- `id BIGSERIAL PRIMARY KEY`
- `sync_history_id BIGINT REFERENCES faculty_sync_history(id) ON DELETE CASCADE`
- `sap_id VARCHAR(50)`
- `reason VARCHAR(255) NOT NULL` — e.g., `NON_ACADEMIC_SECTOR`, `DESIGNATION_NOT_ALLOWED`
- `raw_data JSONB` — the raw SAP record for debugging
- `created_at`

### `submission_participants`

- New `participant_source` value: `internal_faculty`.
- New `faculty_member_id UUID` column.
- Updated CHECK constraint:
  - `internal_erp`: requires `sap_id`.
  - `internal_faculty`: requires `faculty_member_id`.
  - `external`: requires `external_name`.

No existing data or behavior is changed; only the schema is prepared.

## Migrations

Because PostgreSQL does not allow a newly-added enum value to be used in the
same `pool.query` batch that created it, the schema changes are split into three
migrations:

- `migrations/014_faculty_member_roles_and_participant_schema.sql`  
  — `faculty_members` columns, `faculty_member_roles` table, and
  `submission_participants.faculty_member_id` column/index.
- `migrations/015_add_internal_faculty_participant_source.sql`  
  — Adds the `internal_faculty` value to `participant_source`.
- `migrations/016_submission_participants_internal_faculty_check.sql`  
  — Updates the `submission_participants` CHECK constraint for `internal_faculty`.
- `migrations/017_faculty_sync_tracking_and_org_links.sql`  
  — Adds `employee_code`, `faculty_id`, `department_id`, `program_id`, `employee_status`,
    `is_active` to `faculty_members`. Creates `faculty_designation_rules`,
    `faculty_sync_history`, and `faculty_sync_errors` tables.

Run in order:

```bash
npm run db:migrate:014
npm run db:migrate:015
npm run db:migrate:016
npm run db:migrate:017
```

All migrations are idempotent and safe to re-run.

## Services

### `src/lib/sap-employee.ts`

- `verifyEmployeeByEmail(email)` — existing single-record lookup via `empinfoSet`.
- `fetchAllEmployees()` — bulk collection fetch from `EmployeeSet` with OData
  pagination (`__next` links). Extracts rich fields: status, group, sector, org
  unit, leaving date, etc.
- `SapEmployeeRecord` — normalized record type with all extracted fields.

### `src/lib/sap/faculty-filter.ts`

Faculty filtering pipeline. Applies five stages:
1. Active employee check (status, leaving date)
2. Academic sector check (excludes non-academic keywords)
3. Email validation (`@uol.edu.pk` only, no student emails)
4. Designation validation (configurable via `faculty_designation_rules` table)
5. Organization mapping (resolves `faculty_id` and `department_id` from SAP text)

Returns `FilterResult` — either a `NormalizedFacultyMember` or a rejection with
reason and raw data for error logging.

### `src/lib/sap/sync-faculty-members.ts`

- `syncFacultyMembersFromSap()` — full sync pipeline:
  1. Creates a `faculty_sync_history` row.
  2. Fetches all employees from SAP `EmployeeSet`.
  3. Filters each record through `filterFacultyMember`.
  4. Upserts eligible records via `upsertFacultyMemberFromSync`.
  5. Logs skipped/failed records to `faculty_sync_errors`.
  6. Updates sync history with final counts.
- Returns `syncHistoryId`, `total`, `inserted`, `updated`, `skipped`, `failed`.
- Never deletes or inactivates missing records.

### `src/lib/faculty-members.ts`

Repository for faculty members:
- `getFacultyMemberByEmail`
- `getFacultyMemberBySapId`
- `getFacultyMemberById`
- `getFacultyMemberWithRoles`
- `upsertFacultyMemberFromSap`

## Authentication Flow

### Faculty login

1. Browser verifies Google token / email.
2. `POST /api/auth/verify-student` calls `verifyEmployeeByEmail`.
3. Client calls `signIn('student-email')`.
4. `auth-options.ts` provider:
   - Verifies SAP employee.
   - Upserts a `faculty_members` row.
   - Loads any assigned `faculty_member_roles`.
   - Returns session with `userType: 'faculty'`, `facultyMemberId`,
     `facultyMemberRoles`.

### Student login

Unchanged. `userType: 'student'`, `applicantRole: 'student'`.

## API

### `POST /api/admin/sync-faculty-members`

- Administrator only.
- Triggers `syncFacultyMembersFromSap`.
- Logs `admin.faculty.sync` activity.
- Returns the sync summary.

## RBAC

- `src/lib/faculty-rbac.ts` defines `FacultyMemberRole`, `FacultyMemberStatus`,
  and guards.
- `admin_users` remain unchanged. Administrators continue to live in the admin
  table.
- Faculty member roles are separate from admin roles and do not affect the
  current approval workflow in Phase 1.

## Files Changed / Added

| File | Change |
|------|--------|
| `migrations/014_faculty_member_roles_and_participant_schema.sql` | New migration |
| `schema.sql` | Updated base schema |
| `package.json` | Added `db:migrate:014` script |
| `src/lib/faculty-rbac.ts` | New types/guards |
| `src/lib/faculty-members.ts` | Rewritten repository |
| `src/lib/sap-employee.ts` | Added `fetchAllEmployees` |
| `src/lib/sap/sync-faculty-members.ts` | New sync service |
| `src/lib/auth-options.ts` | Faculty find/create + session fields |
| `src/app/api/admin/sync-faculty-members/route.ts` | New admin API |
| `types/next-auth.d.ts` | `userType`, `facultyMemberRoles` |
| `src/lib/activity-log/types.ts` | `admin.faculty.sync` action code |
| `src/lib/activity-log/descriptions.ts` | `admin.faculty.sync` label |
| `docs/FACULTY_MEMBER_ARCHITECTURE.md` | This document |

## Future Work (not in this phase)

- Supervisor role assignment UI and API.
- Faculty-based supervisor scope (faculty/department/program).
- Linking `submission_participants` to `faculty_members` (`internal_faculty`).
- Co-supervisor and co-author internal faculty selection.
- IREB member roles for faculty.
- Automated / scheduled SAP sync.
