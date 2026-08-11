# Faculty Application Workflow — Implementation Map

This document describes the **actual** implementation of the faculty ethical approval
application flow, as discovered during the end-to-end audit.

---

## 1. Architecture Overview

Faculty and students share the **same** application infrastructure. The only differences
are:

1. **Form eligibility** — faculty can only select Form 6 (Non-Medical) and Form 7 (Medical).
2. **Approval workflow** — faculty submissions skip the supervisor stage and go directly
   to IREB review.
3. **Landing page** — faculty land on `/my-applications`; students land on `/profile`.

There is **one** authentication pipeline, **one** set of submission endpoints, and **one**
database schema for both user types.

---

## 2. Database Tables

| Table | Purpose |
|---|---|
| `submissions` | Core application record (type, domain, applicant_role, current_status) |
| `submission_applicant_snapshot` | ERP snapshot of applicant (sap_id, name, email, faculty, department) |
| `submission_research_core` | Research metadata (title, objectives, methodology) |
| `submission_ethics_payload` | Full form data as JSONB (form answers, attachments metadata, requiredForm) |
| `submission_attachments` | File attachments across stages |
| `submission_participants` | Co-authors, supervisors, external researchers |
| `approval_decisions` | Append-only approval/rejection history (stage, decision, comment, actor) |
| `activity_events` | Audit trail for all workflow actions |
| `admin_users` | Unified user table (students verified via SAP, faculty via SAP employee) |
| `faculty_members` | Faculty profile extension (linked to admin_users via user_id) |
| `admin_faculty_assignments` | Supervisor/IREB scope assignments per faculty |

### Key Relationship

```
admin_users (id)
  ↓ user_id
faculty_members (id, user_id, sap_id, faculty_id, department_id)
  ↓
submissions (applicant_role = 'faculty')
  ↓ submission_id
submission_applicant_snapshot (sap_id ← from session)
submission_research_core
submission_ethics_payload (ethics_json ← contains form data + requiredForm)
  ↓ submission_id
approval_decisions (stage, decision, decided_by_sap_id)
activity_events (actor_admin_id, submission_id)
```

---

## 3. Application Flow

```
Faculty Login (/auth/sign-in)
      ↓
/ (universal landing page)
      ↓
/my-applications
      ↓
Initiate Application
      ↓
Select Form (FACULTY_FORM_CATALOG)
  ├─ Form 6: Faculty Publication Form (Non-Medical)
  └─ Form 7: Faculty Publication Form (Medical)
      ↓
Create Draft (POST /api/profile/submissions/draft)
  applicant_role = 'faculty'
  current_status = 'draft'
      ↓
Fill Application Form (ApprovalRequestStepper)
      ↓
Save Draft (PATCH /api/profile/submissions/:id)
  current_status remains 'draft'
      ↓
Submit Application (POST /api/profile/submissions)
  current_status → 'under_ireb_review'  (skips supervisor)
      ↓
IREB Review (POST /api/submissions/:id/ireb-decision)
  ├─ Approved → 'approved'
  └─ Rejected → 'rejected'
      ↓
Final Decision
  ├─ Approved → Faculty sees "Approved by IREB"
  └─ Rejected → Faculty can resubmit → 'under_ireb_review'
```

---

## 4. Status State Machine

### Faculty Submissions

```
draft
  │ Submit
  ▼
under_ireb_review
  │
  ├──────────────► rejected
  │                  │ Resubmit
  │                  ▼
  │               under_ireb_review
  │
  ▼
approved
```

### Student Submissions (for comparison)

```
draft
  │ Submit
  ▼
submitted
  │
  ▼
under_supervisor_review
  │
  ├──────────────► supervisor_rejected
  │                  │ Resubmit
  │                  ▼
  │               submitted
  │
  ▼
supervisor_approved
  │
  ▼
under_ireb_review
  │
  ├──────────────► rejected
  │                  │ Resubmit
  │                  ▼
  │               under_ireb_review
  │
  ▼
approved
```

---

## 5. Approval Stages

| Stage | Applicable To | Who Handles It | How Reviewer Is Determined |
|---|---|---|---|
| Supervisor Review | Students only | Assigned supervisor | `admin_faculty_assignments` with `assignment_type='supervisor_primary'` — one supervisor per faculty |
| IREB Review | Students + Faculty | IREB members | `admin_faculty_assignments` with `assignment_type='ireb_scope'` — multiple IREB members per faculty |

### Reviewer Access Rules

- **Supervisor**: Can only see submissions from their assigned faculty. Enforced via
  `canAccessFacultySnapshot()` in the decision endpoint.
- **IREB**: Can only see submissions from their assigned faculty scope. Enforced via
  `canAccessFacultySnapshot()`.
- **Super Admin**: Can access all submissions. Can also act "on behalf of" a supervisor
  or IREB member.

---

## 6. API Endpoints

### Applicant Endpoints (shared by students and faculty)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/profile/submissions` | List own submissions (filtered by `sas.sap_id = session.sapId`) |
| POST | `/api/profile/submissions` | Submit application (new, draft promotion, or resubmission) |
| POST | `/api/profile/submissions/draft` | Create new draft |
| PATCH | `/api/profile/submissions/:id` | Update existing draft |
| GET | `/api/profile/submissions/:id` | View own submission |
| DELETE | `/api/profile/submissions/:id` | Delete own draft |
| GET | `/api/profile/submissions/:id/attachment` | Download attachment from own submission |

### Reviewer Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/submissions/:id/dean-decision` | Supervisor approve/reject |
| POST | `/api/submissions/:id/ireb-decision` | IREB approve/reject |
| POST | `/api/submissions/:id/decision` | Unified decision endpoint (auto-detects stage) |

---

## 7. Authorization

### Ownership Checks (Applicant)

Every applicant endpoint verifies ownership via:

```sql
WHERE s.id = $1 AND sas.sap_id = $2
-- $2 = session.user.sapId
```

This ensures a user can only access their own submissions. A faculty member cannot
access another faculty member's submission by changing the URL ID.

### Reviewer Checks

Reviewer endpoints use `assertActiveAdmin()` to verify the session has an active admin
role, then `canAccessSubmissionStage()` to verify the role can act on the current stage,
and `canAccessFacultySnapshot()` to verify the reviewer has scope over the submission's
faculty.

---

## 8. Form Eligibility

### Frontend

The `FACULTY_FORM_CATALOG` in `src/app/profile/_components/forms/form-registry.ts`
exposes only Form 6 and Form 7 to faculty members.

### Backend (NEW)

`src/lib/form-eligibility.ts` validates server-side that the form ID in the ethics
payload is allowed for the authenticated user's role:

- Faculty: can only use forms in `FACULTY_ALLOWED_FORM_IDS` (Form 6, Form 7)
- Students: can only use forms in `STUDENT_ALLOWED_FORM_IDS` (Form 1, 2, 3, 4)

This check runs on both `POST /api/profile/submissions` and
`POST /api/profile/submissions/draft`.

---

## 9. Notifications

| Event | Email Trigger | Function |
|---|---|---|
| Submission created | Confirmation email to applicant | `scheduleSubmissionConfirmationEmail()` |
| Supervisor rejection | Rejection email to applicant | `scheduleSupervisorRejectionEmail()` |
| IREB rejection | Rejection email to applicant | `scheduleIrebRejectionEmail()` |
| IREB approval | Approval email with PDF letter | `scheduleIrebApprovalEmail()` |

All emails are fire-and-forget (async void) to avoid blocking the response.

---

## 10. Activity / Audit Trail

All workflow actions are recorded in `activity_events` via
`logApplicationDecisionActivity()`:

| Action Code | Description |
|---|---|
| `application.review.approve` | Reviewer approved a submission |
| `application.review.reject` | Reviewer rejected a submission |

Each event records:
- `actor_admin_id` — the admin user who performed the action
- `effective_admin_id` — the effective admin (may differ in view-as mode)
- `submission_id` — the affected submission
- `faculty_id` / `faculty_name` — the faculty context
- `metadata_json` — additional context

---

## 11. Concurrency Protection

### Duplicate Submission Prevention

The POST endpoint has a "safety net" that checks for an existing draft before creating
a new submission. If a draft exists for the applicant (`sas.sap_id = $1 AND
s.current_status = 'draft'`), it promotes that draft instead of creating a duplicate.

### State Transition Validation

Both supervisor and IREB decision endpoints validate the current status before
allowing a transition:

```typescript
if (submission.current_status !== "under_supervisor_review") {
  return 409; // Conflict
}
```

This prevents double-approval, double-rejection, and invalid state transitions.

---

## 12. Bugs Found and Fixed During Audit

### Bug 1: Hardcoded `applicant_role = 'student'` (CRITICAL)

**Files**: `src/app/api/profile/submissions/route.ts`, `src/app/api/profile/submissions/draft/route.ts`

**Problem**: Both INSERT statements hardcoded `'student'` as the `applicant_role`,
meaning all faculty submissions were incorrectly labeled as student submissions in the
database.

**Fix**: Now uses `session.user.applicantRole` to determine the correct role
(`'student'` or `'faculty'`) from the authenticated session.

### Bug 2: Email-Based Status Determination (MEDIUM)

**Files**: `src/app/api/profile/submissions/route.ts`

**Problem**: The initial submission status was determined by checking if the email ends
with `@student.uol.edu.pk` via `isStudentApplicantEmail()`. This is fragile and could
break if email patterns change.

**Fix**: Now uses `session.user.applicantRole === "student"` as the source of truth.

### Bug 3: No Backend Form Validation (SECURITY)

**Files**: New `src/lib/form-eligibility.ts`, applied to both POST endpoints

**Problem**: The backend did not validate that the selected form was available to the
authenticated user's role. A faculty member could potentially submit a student-only
form by manipulating the request payload.

**Fix**: Added `isFormAllowedForApplicant()` server-side validation that checks the form
ID in the ethics payload against the allowed form set for the user's role.

### Bug 4: Cosmetic "Student" Fallback Names (MINOR)

**Files**: All three submission endpoints

**Problem**: Default name fallback was `"Student"` even for faculty users.

**Fix**: Changed to `"Applicant"` — a generic term that applies to all user types.

### Bug 5: Misleading Error Message (MINOR)

**File**: `src/app/api/profile/submissions/route.ts`

**Problem**: Error log said `"Failed to create student submission"` even for faculty.

**Fix**: Changed to `"Failed to create submission"`.

---

## 13. Remaining Items Requiring Business Decisions

1. **Existing data**: Faculty submissions already in the database with
   `applicant_role = 'student'` need a data migration to correct the role. This should
   be done carefully by matching `submission_applicant_snapshot.email` against
   `faculty_members.email`.

2. **Form 5**: The `form5-publication-faculty-staff` form exists in the stepper and has
   a render block, but is NOT in `FACULTY_FORM_CATALOG`. If Form 5 should be available
   to faculty, add it to the catalog. If not, the render block can be removed in a
   future cleanup.

3. **Supervisor stage for faculty**: Currently faculty submissions skip the supervisor
   stage entirely. If business requirements change to require supervisor review for
   faculty, the status determination logic in the POST endpoint needs to be updated.
