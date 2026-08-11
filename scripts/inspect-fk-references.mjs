/**
 * Investigate all FK references to admin_users.id and faculty_members.id
 * before writing the deduplication migration.
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
    label: "FK references to admin_users(id)",
    sql: `SELECT tc.table_name, kcu.column_name, rc.delete_rule
          FROM information_schema.referential_constraints rc
          INNER JOIN information_schema.key_column_usage kcu
            ON kcu.constraint_name = rc.constraint_name
          INNER JOIN information_schema.table_constraints tc
            ON tc.constraint_name = rc.constraint_name
          WHERE rc.unique_constraint_name = 'admin_users_pkey'
          ORDER BY tc.table_name`,
  },
  {
    label: "FK references to faculty_members(id)",
    sql: `SELECT tc.table_name, kcu.column_name, rc.delete_rule
          FROM information_schema.referential_constraints rc
          INNER JOIN information_schema.key_column_usage kcu
            ON kcu.constraint_name = rc.constraint_name
          INNER JOIN information_schema.table_constraints tc
            ON tc.constraint_name = rc.constraint_name
          WHERE rc.unique_constraint_name = 'faculty_members_pkey'
          ORDER BY tc.table_name`,
  },
  {
    label: "Check: submissions referencing supervisor_user_id",
    sql: `SELECT COUNT(*) AS cnt, COUNT(DISTINCT supervisor_user_id) AS distinct_supervisors
          FROM submissions WHERE supervisor_user_id IS NOT NULL`,
  },
  {
    label: "Check: submissions table columns related to supervisor",
    sql: `SELECT column_name, data_type FROM information_schema.columns
          WHERE table_name = 'submissions' AND column_name LIKE '%supervisor%'
          ORDER BY ordinal_position`,
  },
  {
    label: "Check: activity_events referencing admin_user_id",
    sql: `SELECT COUNT(*) AS cnt FROM activity_events WHERE admin_user_id IS NOT NULL`,
  },
  {
    label: "Check: all tables with admin_user_id column",
    sql: `SELECT table_name, column_name FROM information_schema.columns
          WHERE column_name IN ('admin_user_id', 'user_id', 'supervisor_user_id', 'faculty_member_id')
            AND table_schema = 'public'
          ORDER BY table_name, column_name`,
  },
  {
    label: "Sample: what references non-primary admin_users in submissions?",
    sql: `SELECT
            LOWER(SPLIT_PART(LOWER(TRIM(fm.email)), '@', 1)) AS email_prefix,
            COUNT(DISTINCT s.id) AS submission_count,
            STRING_AGG(DISTINCT au.email, ', ') AS supervisor_emails
          FROM submissions s
          INNER JOIN admin_users au ON au.id = s.supervisor_user_id
          INNER JOIN faculty_members fm ON fm.user_id = au.id AND fm.deleted_at IS NULL
          WHERE s.supervisor_user_id IS NOT NULL
            AND LOWER(SPLIT_PART(LOWER(TRIM(fm.email)), '@', 1)) IN (
              SELECT LOWER(SPLIT_PART(LOWER(TRIM(email)), '@', 1))
              FROM faculty_members
              WHERE deleted_at IS NULL AND TRIM(email) != ''
              GROUP BY LOWER(SPLIT_PART(LOWER(TRIM(email)), '@', 1))
              HAVING COUNT(*) > 1
            )
          GROUP BY email_prefix
          HAVING COUNT(DISTINCT s.id) > 0
          ORDER BY submission_count DESC
          LIMIT 20`,
  },
  {
    label: "Check: admin_faculty_assignments for duplicate users",
    sql: `SELECT
            LOWER(SPLIT_PART(LOWER(TRIM(fm.email)), '@', 1)) AS email_prefix,
            COUNT(*) AS afa_count,
            STRING_AGG(afa.admin_user_id::text, ', ') AS admin_user_ids
          FROM admin_faculty_assignments afa
          INNER JOIN faculty_members fm ON fm.user_id = afa.admin_user_id AND fm.deleted_at IS NULL
          WHERE afa.deleted_at IS NULL
            AND LOWER(SPLIT_PART(LOWER(TRIM(fm.email)), '@', 1)) IN (
              SELECT LOWER(SPLIT_PART(LOWER(TRIM(email)), '@', 1))
              FROM faculty_members
              WHERE deleted_at IS NULL AND TRIM(email) != ''
              GROUP BY LOWER(SPLIT_PART(LOWER(TRIM(email)), '@', 1))
              HAVING COUNT(*) > 1
            )
          GROUP BY email_prefix
          ORDER BY afa_count DESC`,
  },
  {
    label: "Check: admin_department_assignments for duplicate users",
    sql: `SELECT
            LOWER(SPLIT_PART(LOWER(TRIM(fm.email)), '@', 1)) AS email_prefix,
            COUNT(*) AS ada_count,
            STRING_AGG(ada.admin_user_id::text, ', ') AS admin_user_ids
          FROM admin_department_assignments ada
          INNER JOIN faculty_members fm ON fm.user_id = ada.admin_user_id AND fm.deleted_at IS NULL
          WHERE ada.deleted_at IS NULL
            AND LOWER(SPLIT_PART(LOWER(TRIM(fm.email)), '@', 1)) IN (
              SELECT LOWER(SPLIT_PART(LOWER(TRIM(email)), '@', 1))
              FROM faculty_members
              WHERE deleted_at IS NULL AND TRIM(email) != ''
              GROUP BY LOWER(SPLIT_PART(LOWER(TRIM(email)), '@', 1))
              HAVING COUNT(*) > 1
            )
          GROUP BY email_prefix
          ORDER BY ada_count DESC`,
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
