# Login Guide — UOL Ethical Approval System

A simple, step-by-step guide to signing in for **every type of user**: students,
faculty, and administrators (HOD / IREB / Administrator).

---

## 1. How Sign-In Works (The Big Picture)

There is **one login page for everyone**:

```
/auth/sign-in
```

You do **not** type a password on this website. Instead:

1. Click **"Sign in with Google"**.
2. Pick your **university Google account** in the Google pop-up.
3. The system checks your email against **SAP** and/or the **internal database**.
4. If your record is found → you're logged in and taken to your page.

> **Important:** You must use your **university-issued email** (@uol.edu.pk /
> @student.uol.edu.pk). Personal Gmail accounts will not work.

---

## 2. Who Are You? — User Types at a Glance

| User type | Email you use | How you're verified | Where you land after login |
|---|---|---|---|
| **Student** | `yourSAPID@student.uol.edu.pk` | SAP student records | `/profile` |
| **Faculty (already in system)** | `name@uol.edu.pk` | Internal database | `/profile` |
| **Faculty (new / not yet synced)** | `name@uol.edu.pk` | SAP employee records → account auto-created | `/profile` |
| **HOD / IREB / Administrator** | `name@uol.edu.pk` | Internal database (must have an admin role) | `/` (dashboard) |

---

## 3. Login Guide — Students (SAP-verified)

**Your email format:** `70088579@student.uol.edu.pk`
*(the number before `@` is your SAP student ID)*

### Steps

1. Open the system and go to the **Sign in** page (`/auth/sign-in`).
2. Click **"Sign in with Google"**.
3. In the Google window, select your **`@student.uol.edu.pk`** account.
4. The system looks up your SAP ID (the part before `@`) in the university SAP.
5. If a matching student record exists → you're signed in and sent to your
   **Profile** page.

### Common issues for students

| Problem | What it means | What to do |
|---|---|---|
| "No student record was found in SAP" | Your SAP ID doesn't match SAP records | Check you're using the correct student email; contact your department/registrar if your record is missing |
| "SAP verification service is unavailable" | The SAP server is down or unreachable | Wait a few minutes and try again |
| "Invalid SAP ID format in email" | The email entered isn't a valid student email | Use `SAPID@student.uol.edu.pk` |
| Signed in with the wrong Google account | Browser picked a personal Gmail | Sign out of Google, then retry and choose the university account |

---

## 4. Login Guide — Faculty / Staff (DB or SAP-verified)

**Your email format:** `firstname.lastname@uol.edu.pk` (your official staff email)

### Steps

1. Go to `/auth/sign-in` and click **"Sign in with Google"**.
2. Select your **official university staff account**.
3. The system verifies you in this order:
   - **First:** the internal **database** (users already known to the system).
   - **Then:** your **faculty profile** in the database.
   - **Finally:** the **SAP employee records** (for faculty who haven't been
     synced yet — your account is **created automatically** on first login).
4. On success → you're sent to your **Profile** page.

> **First-time faculty login is automatic.** If you're a valid SAP employee,
> your user record and faculty profile are created for you — no registration
> form needed.

### Common issues for faculty

| Problem | What it means | What to do |
|---|---|---|
| "We could not find your employee record in the university SAP" | Your email isn't in the DB *and* not in SAP employee records | Contact **HR** to make sure your official email and employment details are correctly entered in SAP, then try again |
| Account is inactive | Your user record exists but is marked inactive | Contact the system administrator to reactivate your account |
| "SAP verification service is unavailable" | The SAP server is down/unreachable | Wait a few minutes and try again |

---

## 5. Login Guide — Admins (HOD / IREB / Administrator) — DB users

Admin users sign in through **the same page** — there is no separate admin
login anymore (`/admin/login` now redirects to `/auth/sign-in`).

### Steps

1. Go to `/auth/sign-in` and click **"Sign in with Google"**.
2. Select your **official university email** (the one registered as an admin).
3. The system looks you up in the **internal database** (`admin_users` table)
   and checks your **admin role**.
4. On success → you're taken straight to the **admin dashboard** (`/`).

### Who counts as an admin?

| Role | What they do |
|---|---|
| **Administrator** | Full system access — manage users, roles, view-as, settings |
| **HOD** | Reviews applications from their department |
| **IREB** | IREB committee member — reviews and decides on applications |

### Common issues for admins

| Problem | What it means | What to do |
|---|---|---|
| You log in but land on `/profile` instead of the dashboard | Your account has **no admin role** in the DB | Ask an administrator to assign you the correct role |
| "Admin role required" | Verified as a user, but not as HOD/IREB/admin | Same as above — role must be assigned in the system |
| Account inactive | Your `admin_users` record is deactivated | Contact the system administrator |

> **Note for admins:** Admin verification is against the **database only** —
> it never falls back to SAP. If you're an admin, your record *must* exist in
> the internal `admin_users` table.

---

## 6. After Login — Session & Sign-Out

- **Session length:** your login stays valid for up to **30 days** (you won't
  need to sign in every visit unless you clear cookies or sign out).
- **Sign out:** use the **Sign out** option in the app. This clears your
  session on this site.
- **Switching accounts:** sign out first, then sign in again and pick the
  other Google account in the chooser.

---

## 7. Quick Troubleshooting Checklist

Before asking for help, try these:

1. ✅ Are you using your **university email**, not a personal Gmail?
2. ✅ Did you pick the **correct account** in the Google pop-up?
   (Sign out of Google in your browser if the wrong one keeps appearing.)
3. ✅ Waited a few minutes? **SAP outages** are temporary — retry.
4. ✅ Cleared browser cache/cookies and tried an incognito window?
5. ✅ Faculty: is your email in **SAP HR records**? (Check with HR.)
6. ✅ Admin: has your **role been assigned** in the system? (Check with an
   administrator.)

Still stuck? Contact the **IREB system administrator** with:
- The **exact error message** shown on screen
- The **email** you used
- The **time** you tried to sign in

---

## 8. Error Messages Explained (All Users)

| Error message | Cause | Fix |
|---|---|---|
| "Invalid email format" | Email typed/returned is malformed | Use your official university email |
| "No matching student record found in SAP" | SAP ID not in SAP student records | Verify SAP ID with registrar |
| "The SAP service could not be reached" | SAP server down / network issue | Retry later |
| "Google did not return an email address" | Google account sharing issue | Pick the account again / different browser |
| "Sign-in was denied" | Google account doesn't exist in SAP | Use your university Google account |
| "Server authentication is misconfigured" | Server-side env config missing | Contact the technical team |
| "Unable to verify your account" | Verification failed for an unknown reason | Retry; contact admin if persistent |

---

*Last updated: November 2026 · Ethical Approval System — University of Lahore IREB*
