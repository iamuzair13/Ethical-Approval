/**
 * Verify the deduplication migration results.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const port = process.env.DB_PORT ?? "5432";
  const database = process.env.DB_NAME ?? "postgres";
  if (!host || !user || !password) throw new Error("Set DATABASE_URL");
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

loadEnvLocal();
const pool = new pg.Pool({ connectionString: getDatabaseUrl() });

const queries = [
  {
    label: "1. Remaining duplicate email-prefix groups (should be 0)",
    sql: `SELECT
            LOWER(SPLIT_PART(LOWER(TRIM(email)), '@', 1)) AS email_prefix,
            COUNT(*) AS cnt
          FROM faculty_members
          WHERE deleted_at IS NULL AND TRIM(email) != ''
          GROUP BY LOWER(SPLIT_PART(LOWER(TRIM(email)), '@', 1))
          HAVING COUNT(*) > 1
          ORDER BY cnt DESC`,
  },
  {
    label: "2. Remaining duplicate name+dept groups (should be 0 or near 0)",
    sql: `SELECT
            LOWER(TRIM(name)) AS name_norm,
            department_id,
            COUNT(*) AS cnt
          FROM faculty_members
          WHERE deleted_at IS NULL AND TRIM(name) != ''
          GROUP BY LOWER(TRIM(name)), department_id
          HAVING COUNT(*) > 1
          ORDER BY cnt DESC
          LIMIT 10`,
  },
  {
    label: "3. Counts: active vs soft-deleted",
    sql: `SELECT
            (SELECT COUNT(*) FROM faculty_members WHERE deleted_at IS NULL) AS active_fm,
            (SELECT COUNT(*) FROM faculty_members WHERE deleted_at IS NOT NULL) AS soft_deleted_fm,
            (SELECT COUNT(*) FROM admin_users WHERE deleted_at IS NULL) AS active_au,
            (SELECT COUNT(*) FROM admin_users WHERE deleted_at IS NOT NULL) AS soft_deleted_au`,
  },
  {
    label: "4. Orphaned FKs: faculty_members.user_id pointing to deleted admin_users",
    sql: `SELECT COUNT(*) AS orphaned_fm
          FROM faculty_members fm
          INNER JOIN admin_users au ON au.id = fm.user_id
          WHERE fm.deleted_at IS NULL AND au.deleted_at IS NOT NULL`,
  },
  {
    label: "5. Orphaned FKs: submissions.supervisor_user_id pointing to deleted admin_users",
    sql: `SELECT COUNT(*) AS orphaned_submissions
          FROM submissions s
          INNER JOIN admin_users au ON au.id = s.supervisor_user_id
          WHERE au.deleted_at IS NOT NULL`,
  },
  {
    label: "6. Orphaned FKs: admin_faculty_assignments pointing to deleted admin_users",
    sql: `SELECT COUNT(*) AS orphaned_afa
          FROM admin_faculty_assignments afa
          INNER JOIN admin_users au ON au.id = afa.admin_user_id
          WHERE afa.deleted_at IS NULL AND au.deleted_at IS NOT NULL`,
  },
  {
    label: "7. Orphaned FKs: admin_department_assignments pointing to deleted admin_users",
    sql: `SELECT COUNT(*) AS orphaned_ada
          FROM admin_department_assignments ada
          INNER JOIN admin_users au ON au.id = ada.admin_user_id
          WHERE ada.deleted_at IS NULL AND au.deleted_at IS NOT NULL`,
  },
  {
    label: "8. Supervisors per department (sample: Audiology)",
    sql: `SELECT COUNT(*) AS supervisor_count
          FROM faculty_members fm
          INNER JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
          WHERE fm.deleted_at IS NULL
            AND fm.status = 'active' AND fm.is_active = TRUE
            AND au.role = 'supervisor' AND au.status = 'active'
            AND fm.department_id = 1`,
  },
  {
    label: "9. Total active supervisors",
    sql: `SELECT COUNT(*) AS total_supervisors
          FROM faculty_members fm
          INNER JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
          WHERE fm.deleted_at IS NULL
            AND fm.status = 'active' AND fm.is_active = TRUE
            AND au.role = 'supervisor' AND au.status = 'active'`,
  },
  {
    label: "10. Verify 'muhammad.usman' group (was 5, should be 1)",
    sql: `SELECT fm.id, fm.name, fm.email, fm.sap_id, fm.department_id, fm.status, fm.is_active
          FROM faculty_members fm
          WHERE fm.deleted_at IS NULL
            AND LOWER(SPLIT_PART(LOWER(TRIM(fm.email)), '@', 1)) = 'muhammad.usman'
          ORDER BY fm.name`,
  },
];

for (const q of queries) {
  console.log(`\n=== ${q.label} ===`);
  try {
    const result = await pool.query(q.sql);
    console.log(`Rows: ${result.rows.length}`);
    if (result.rows.length > 0) {
      console.table(result.rows);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

await pool.end();
