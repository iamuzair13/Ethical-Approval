# Faculty Member Architecture

> **Date:** 2026-08-05  
> **Phase 1:** Architectural preparation only. No supervisor assignment UI or workflow changes.

## Overview

Faculty members are now first-class internal entities instead of transient SAP
verifications. SAP still provides the source of truth for employee data, but the
system keeps a local `faculty_members` record for authentication, role
assignment, and future workflow permissions.

```text
SAP Employee API
        |
        v
verifyEmployeeByEmail (single) or fetchAllEmployees (bulk)
        |
        v
faculty_members table  (internal canonical record)
        |
        +-- Authentication identity
        |
        +-- faculty_member_roles table  (supervisor today, more later)
        |
        +-- submission_participants.faculty_member_id  (future linkage)
        |
        v
NextAuth session: facultyMemberId, userType, facultyMemberRoles
```

## Database

### `faculty_members` enhancements

- `sap_id` — canonical SAP identifier, unique.
- `employee_id` — optional HR/employee number if different from `sap_id`.
- `name`, `email`, `department`, `designation` — from SAP.
- `faculty` — derived from department using `inferFacultyFromDepartment`.
- `program` — optional, for future use.
- `employee_type` — optional classification (e.g., `faculty`, `staff`).
- `status` — `active` / `inactive`.
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

### `submission_participants`

- New `participant_source` value: `internal_faculty`.
- New `faculty_member_id UUID` column.
- Updated CHECK constraint:
  - `internal_erp`: requires `sap_id`.
  - `internal_faculty`: requires `faculty_member_id`.
  - `external`: requires `external_name`.

No existing data or behavior is changed; only the schema is prepared.

## Migrations

- `migrations/014_faculty_member_roles_and_participant_schema.sql`
- Run with: `npm run db:migrate:014`

The migration is idempotent and safe to re-run.

## Services

### `src/lib/sap-employee.ts`

- `verifyEmployeeByEmail(email)` — existing single-record lookup.
- `fetchAllEmployees()` — new bulk collection fetch from `empinfoSet`.
- `SapEmployeeRecord` — normalized record type.

### `src/lib/sap/sync-faculty-members.ts`

- `syncFacultyMembersFromSap()` — fetches all employees, normalizes, and
  upserts by `sap_id`.
- Returns counts: `total`, `inserted`, `updated`, `skipped`, `errors`.
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
