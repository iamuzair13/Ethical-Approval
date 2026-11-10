# Project Context — IREB Ethical Approval System

Web application for the **Institutional Review Ethics Board (IREB)** of the **University of Lahore (UOL)**. It receives, reviews, approves, and reports on research-ethics applications (theses and publications) involving human subjects. Built on the **NextAdmin** dashboard template, heavily extended for IREB workflows.

- **Repo:** `https://github.com/iamuzair13/Ethical-Approval.git` (branch `main`)
- **Production:** deployed on the `alumniportal` server (`~/ireb-system`), served via PM2 (`ecosystem.config.cjs`, app name `ireb`)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1.6 (App Router, webpack for dev / Turbopack for build) |
| UI | React 19, TypeScript 5, Tailwind CSS 3.4, lucide-react, sonner, next-themes |
| Auth | NextAuth v4 (JWT sessions, 30-day maxAge, credentials provider) |
| Database | PostgreSQL via `pg` Pool — **no ORM**, parameterized SQL in `src/lib` |
| Passwords | `@node-rs/argon2` (admin accounts) |
| Email | nodemailer (SMTP, optional — `SMTP_ENABLED`) |
| Reports | jspdf + html2canvas (PDF), xlsx (Excel), apexcharts (dashboard) |
| Files | Local disk `uploads/submission-files` (override: `SUBMISSION_UPLOAD_DIR`) |

## Commands

```bash
npm run dev      # next dev --webpack --port 3004
npm run build    # next build (Turbopack)
npm start        # next start -p 3004
npm run db:migrate:0XX   # node scripts/run-sql-migration.mjs migrations/0XX_*.sql
```

Production: `pm2 start ecosystem.config.cjs` — the config **manually loads `.env`** because `next start` does not auto-load dotenv files.

## Directory Layout

```
src/
  app/            # App Router pages + api/**/route.ts handlers
  components/     # UI (Auth/Signin, dashboard, sidebar, forms)
  lib/            # Business logic: auth, RBAC, SAP, reports, email, storage
  proxy.ts        # Next.js 16 "proxy" (middleware): JWT + route guards
migrations/       # Sequential SQL migrations (001–035)
scripts/          # Migration runner + data inspection/dedup utilities
docs/             # Architecture docs (IREB_ARCHITECTURE_ANALYSIS is dated — verify against migrations)
uploads/          # Submission attachment storage (gitignored)
ecosystem.config.cjs  # PM2 production config
schema.sql / schema.admin_rbac.sql  # Reference schemas
```

## Authentication

Single unified SSO credentials provider `"student-email"` (`src/lib/auth-options.ts`):

- **Students** (`*@student.uol.edu.pk`): verified against SAP `ZSTUDENTHMIS_SRV`
- **Faculty/staff** (other UOL emails): looked up in `admin_users` → `faculty_members` → SAP `Z_EMP_INFO_API_SRV` fallback; records are auto-created/linked on first login
- **Sign-in UI:** Google Identity Services browser token → `POST /api/auth/verify-student` → `signIn("student-email")` → `resolvePostLoginRedirect()` → **full-page `window.location` nav** (client router can race the session cookie; do not replace with `router.replace`)
- JWT carries `sapId`, `adminId`, `adminRole`, `adminScopeMode`, `adminFacultyIds`, `facultyMemberId`, `applicantRole`, `tokenVersion`, view-as fields
- Admin login also exists at `/admin/login` (`/api/admin/login`)

## Roles & Authorization

`admin_users.admin_role`: `administrator` | `hod` | `ireb` (renamed from `supervisor` in migration 032). Applicants: `student` | `faculty`.

- `src/proxy.ts` guards pages: `/my-applications` requires `facultyMemberId`; `/administrator`, `/organizations`, `/faculty-members`, `/forms`, `/reports`, `/activity-center` require administrator/ireb; `/admin/*` role-checked
- API routes use `assertActiveAdmin()` (token version + active-status re-check) and scope checks (`canAccessFacultySnapshot`)
- Scope via `admin_faculty_assignments` / `admin_department_assignments` / `admin_program_assignments`
- Administrators can "view as" another role (`src/lib/view-as.ts`) and act on behalf of HOD/IREB

## Submission Workflow (current, post-migration 033)

| Form type | Path |
|-----------|------|
| Student thesis (Forms 1, 3) | draft → submitted → `under_hod_review` → `under_admin_review` → `under_ireb_review` → approved/rejected |
| Student publication (2, 4) | draft → `under_admin_review` → `under_ireb_review` → approved/rejected |
| Faculty publication (5, 6) | draft → `under_admin_review` → `under_ireb_review` → approved/rejected |

- `under_admin_review` = Administrator / IREB Chairman stage (added in migration 033)
- Admin can **mark sensitive** (`marked_sensitive` decision) and **assign to a specific IREB member** (`submissions.assigned_ireb_user_id`, migration 034)
- `review_decision` enum includes `recommended` and `marked_sensitive` alongside approve/reject
- Decisions are append-only in `approval_decisions`; all actions logged to `activity_events` (drives notifications + audit)

## Main Dashboard

`src/app/(home)/page.tsx` renders `DashboardBoard` (`src/components/dashboard/`) — three track sections (Student Thesis, Student Publication, Faculty Publication), not aggregated stats.

- Data: `GET /api/dashboard/summary` → `src/lib/dashboard-summary.ts` → reuses `getScopedSubmissions()` (role visibility, `hod_user_id` / `assigned_ireb_user_id` routing, faculty scope, view-as).
- Track mapping: `type='thesis' + applicant_role='student'` → Student Thesis; student + publication → Student Publication; any faculty → Faculty Publication.
- Stage-outcome rule: pending = `submitted|under_hod_review|hod_approved|under_admin_review|under_ireb_review`; rejected includes `hod_rejected`; final statuses attributed to the stage of the LAST `approved`/`rejected` row in `approval_decisions` (admin-stage finalization is real). Invariant `pending+approved+rejected=total` asserted; verify against DB with `scripts/check-dashboard-summary.mjs`.
- Stage/outcome clicks drill into the All Requests table via `drillFilter` on `LeadsReportTabs` (`Lead.decidingStage` distinguishes admin vs IREB outcomes).
- Filter options come from the same scope rule as `/api/admin/reports/report-filters` (which also returns programs).

## Database Notes

- ENUMs constrain statuses/roles; `JSONB` holds flexible ethics payloads (`submission_ethics_payload`, GIN-indexed)
- `submission_applicant_snapshot` stores the ERP identity at submission time (historical accuracy — do not "fix" it to live data)
- `faculty_members` is the master staff list synced from SAP/CSV; linked to `admin_users` via `user_id`; multi-department membership via `faculty_member_departments` (035), `department_id` kept as primary
- Migrations are idempotent; run via `scripts/run-sql-migration.mjs`

## Environment Variables

See `.env.example` and `docs/environment.md`. Essentials: `NEXTAUTH_URL` (must match port), `NEXTAUTH_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `SAP_BASIC_AUTH_*` (students), `SAP_EMP_BASIC_AUTH_*` (employees), `DATABASE_URL`, optional `SMTP_*`, `IREB_PUBLIC_APP_URL`, `SUBMISSION_UPLOAD_DIR`.

## Gotchas

- **Never write `package.json` with a BOM** — `JSON.parse` in webpack/Turbopack rejects it (`Unexpected token` at 1:1). PowerShell redirection (`>`, `Out-File`, `Set-Content`) adds a BOM; this has bitten the build before.
- `docs/IREB_ARCHITECTURE_ANALYSIS.md` is from Aug 2026 — it says "no middleware" and uses the old `supervisor` naming. Trust `src/proxy.ts` and recent migrations over that doc.
- The remote `main` was force-pushed once — deploy boxes may show "divergent branches"; `git reset --hard origin/main` is the fix if the server has no local work.
- Email sends are fire-and-forget; submissions succeed even if SMTP is down.
