import pkg from "xlsx";
const { readFile, utils } = pkg;
import { writeFileSync } from "fs";

const wb = readFile("C:\\Users\\chuza\\Downloads\\faculty-data.xls");
const ws = wb.Sheets["Sheet1"];
const rows = utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
const data = rows.slice(1);

const ADMIN_EMAIL = "zaheer.ahmad@uol.edu.pk";

// Parse records
const allRecords = [];
for (let i = 0; i < data.length; i++) {
  const r = data[i];
  const email = r[3] ? String(r[3]).trim() : "";
  const name = r[1] ? String(r[1]).trim() : "";
  const dept = r[2] ? String(r[2]).trim() : "";
  const designation = r[4] ? String(r[4]).trim() : "";
  const rawEmpcode = r[6] != null ? String(r[6]).trim() : "";
  // Some empcodes are image URLs (data quality issue in the Excel).
  // Extract the first numeric segment from URL-like values.
  // e.g. "http://faculty.uol.edu.pk/.../8303-24082023-132640.jpg" → "8303"
  let empcode = rawEmpcode;
  if (empcode.startsWith("http")) {
    const match = empcode.match(/\/(\d+)-/);
    empcode = match ? match[1] : "";
  }
  // Truncate to 50 chars as a safety net for any other long values
  if (empcode.length > 50) empcode = empcode.slice(0, 50);
  const title = r[0] && String(r[0]).toUpperCase() !== "NULL" ? String(r[0]).trim() : "";

  // Skip records missing required fields
  if (!email || email.toUpperCase() === "NULL") continue;
  if (!name || name.toUpperCase() === "NULL") continue;
  if (!dept || dept.toUpperCase() === "NULL") continue;

  // The Name column already includes any title prefix (e.g. "Prof. Dr. Muhammad Afzal"),
  // so we use it as-is. Just trim whitespace.
  const fullName = name.trim();

  allRecords.push({
    row: i + 2,
    empcode,
    name: fullName,
    email: email.toLowerCase(),
    department: dept,
    designation: designation.toUpperCase() === "NULL" ? "" : designation,
  });
}

console.log(`Insertable records (email+name+dept): ${allRecords.length}`);

// Deduplicate by exact email (case-insensitive) — keep first occurrence
// Also track empcode collisions: if two records have the same empcode,
// the second one gets sap_id = NULL (admin_users.sap_id is nullable and
// UNIQUE allows multiple NULLs in PostgreSQL).
const seenEmails = new Set();
const seenEmpcodes = new Set();
const uniqueRecords = [];
const skippedDuplicates = [];
for (const r of allRecords) {
  if (seenEmails.has(r.email)) {
    skippedDuplicates.push(r);
    continue;
  }
  // If empcode collides with an earlier record, null it out
  if (r.empcode && seenEmpcodes.has(r.empcode)) {
    r.empcode = "";
  }
  if (r.empcode) seenEmpcodes.add(r.empcode);
  seenEmails.add(r.email);
  uniqueRecords.push(r);
}
console.log(`Unique by email: ${uniqueRecords.length}`);
console.log(`Skipped duplicate emails: ${skippedDuplicates.length}`);

// Generate SQL
function sqlEscape(str) {
  if (!str) return null;
  return String(str).replace(/'/g, "''");
}

function sqlVal(val) {
  if (val === null || val === undefined || val === "") return "NULL";
  return `'${sqlEscape(val)}'`;
}

let sql = `-- migrations/028_faculty_data_dump.sql
--
-- Bulk import faculty members from faculty-data.xls (5,493 rows).
-- After sanity checks: 2,510 rows have email + name + department.
-- Deduplicated by email (case-insensitive): ${uniqueRecords.length} unique records.
-- Skipped ${skippedDuplicates.length} duplicate-email rows.
--
-- Every faculty member gets:
--   - admin_users.role = 'supervisor'
--   - admin_users.status = 'active'
-- Except zaheer.ahmad@uol.edu.pk → role = 'administrator'
--
-- Overwrites ALL existing faculty_members and their linked admin_users.
--
-- Run with: node scripts/run-sql-migration.mjs migrations/028_faculty_data_dump.sql

BEGIN;

-- ─── Step 1: Clear existing data ───
-- Unlink faculty_members from admin_users first (set user_id = NULL)
-- then delete faculty_members. admin_users rows that were linked to
-- faculty members are deleted; other admin_users (e.g. IREB members
-- not in this Excel) are preserved.

-- Soft-delete existing faculty_members (preserves audit history)
UPDATE faculty_members SET deleted_at = NOW(), is_active = FALSE, status = 'inactive', updated_at = NOW()
WHERE deleted_at IS NULL;

-- Clear FK references in assignment tables (assigned_by has no ON DELETE cascade)
-- Null out assigned_by on ALL rows (including soft-deleted) before deleting admin_users.
UPDATE admin_faculty_assignments SET assigned_by = NULL WHERE assigned_by IS NOT NULL;
UPDATE admin_department_assignments SET assigned_by = NULL WHERE assigned_by IS NOT NULL;
UPDATE admin_program_assignments SET assigned_by = NULL WHERE assigned_by IS NOT NULL;
DELETE FROM admin_faculty_assignments;
DELETE FROM admin_department_assignments;
DELETE FROM admin_program_assignments;

-- Null out activity_events and admin_audit_logs FK references (no ON DELETE cascade)
UPDATE activity_events SET actor_admin_id = NULL WHERE actor_admin_id IS NOT NULL;
UPDATE activity_events SET effective_admin_id = NULL WHERE effective_admin_id IS NOT NULL;
UPDATE admin_audit_logs SET actor_admin_id = NULL WHERE actor_admin_id IS NOT NULL;

-- Null out self-referential created_by before deleting
UPDATE admin_users SET created_by = NULL WHERE created_by IS NOT NULL;

-- Delete ALL admin_users with sap_id (both active and soft-deleted).
-- The sap_id UNIQUE constraint applies to all rows, so soft-deleted rows
-- with sap_id would conflict with new inserts. Preserve manually-created
-- admin_users without sap_id (e.g. initial bootstrap admin).
DELETE FROM admin_users
WHERE sap_id IS NOT NULL;

-- ─── Step 2: Insert admin_users ───
-- One admin_users row per faculty member. Role = supervisor for all,
-- except ${ADMIN_EMAIL} = administrator.

`;

// Insert admin_users
for (let i = 0; i < uniqueRecords.length; i++) {
  const r = uniqueRecords[i];
  const role = r.email === ADMIN_EMAIL ? "administrator" : "supervisor";
  sql += `INSERT INTO admin_users (name, email, role, status, sap_id, created_at, updated_at)
VALUES (${sqlVal(r.name)}, ${sqlVal(r.email)}, '${role}', 'active', ${sqlVal(r.empcode)}, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  status = 'active',
  sap_id = COALESCE(EXCLUDED.sap_id, admin_users.sap_id),
  deleted_at = NULL,
  updated_at = NOW();
`;
}

sql += `
-- ─── Step 3: Insert faculty_members ───
-- Link each faculty_member to its admin_users row via user_id.
-- sap_id = empcode from the Excel sheet.

`;

// Insert faculty_members
// faculty_members.sap_id is NOT NULL, so for records without an empcode
// (URL-extracted collisions), use the email prefix as a fallback sap_id.
for (let i = 0; i < uniqueRecords.length; i++) {
  const r = uniqueRecords[i];
  const fmSapId = r.empcode || r.email.split("@")[0];
  sql += `INSERT INTO faculty_members (user_id, sap_id, employee_code, name, email, department, designation, status, is_active, is_google_sso_enabled, last_synced_at, created_at, updated_at)
SELECT au.id, ${sqlVal(fmSapId)}, ${sqlVal(r.empcode)}, ${sqlVal(r.name)}, ${sqlVal(r.email)}, ${sqlVal(r.department)}, ${sqlVal(r.designation)}, 'active', TRUE, TRUE, NOW(), NOW(), NOW()
FROM admin_users au
WHERE LOWER(au.email) = ${sqlVal(r.email)}
  AND au.deleted_at IS NULL
ON CONFLICT (sap_id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  employee_code = COALESCE(EXCLUDED.employee_code, faculty_members.employee_code),
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  department = EXCLUDED.department,
  designation = COALESCE(EXCLUDED.designation, faculty_members.designation),
  status = 'active',
  is_active = TRUE,
  deleted_at = NULL,
  last_synced_at = NOW(),
  updated_at = NOW();
`;
}

// Add summary report
sql += `
-- ─── Step 4: Summary ───
SELECT
  (SELECT COUNT(*) FROM faculty_members WHERE deleted_at IS NULL) AS active_faculty_members,
  (SELECT COUNT(*) FROM admin_users WHERE deleted_at IS NULL AND role = 'supervisor') AS supervisors,
  (SELECT COUNT(*) FROM admin_users WHERE deleted_at IS NULL AND role = 'administrator') AS administrators,
  (SELECT COUNT(*) FROM admin_users WHERE deleted_at IS NULL) AS total_active_admins;

COMMIT;

-- ─── Skipped duplicate-email rows (${skippedDuplicates.length}) ───
-- These rows had the same email as an earlier row and were skipped:
`;

for (const r of skippedDuplicates) {
  sql += `-- Row ${r.row}: empcode=${r.empcode}, name="${r.name}", email="${r.email}", dept="${r.department}"
`;
}

sql += `
-- ─── Skipped missing-field rows (${data.length - allRecords.length}) ───
-- These rows were missing email, name, or department and could not be inserted.
`;

const outputPath = "D:\\UOL\\Ethical-Approval\\migrations\\028_faculty_data_dump.sql";
writeFileSync(outputPath, sql, "utf8");
console.log(`\nSQL written to: ${outputPath}`);
console.log(`File size: ${(sql.length / 1024).toFixed(1)} KB`);
console.log(`\nSummary:`);
console.log(`  - Total Excel rows: ${data.length}`);
console.log(`  - Skipped (missing fields): ${data.length - allRecords.length}`);
console.log(`  - Skipped (duplicate email): ${skippedDuplicates.length}`);
console.log(`  - Inserted: ${uniqueRecords.length}`);
console.log(`  - Supervisors: ${uniqueRecords.filter((r) => r.email !== ADMIN_EMAIL).length}`);
console.log(`  - Administrators: ${uniqueRecords.filter((r) => r.email === ADMIN_EMAIL).length}`);
