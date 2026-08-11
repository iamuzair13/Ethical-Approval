/**
 * Find "duplicate" faculty members — same person appearing multiple times.
 *
 * The faculty_members table has no true email duplicates (emails are unique).
 * However, the same person can appear multiple times because SAP has multiple
 * employee records for them with slightly different emails or SAP IDs.
 *
 * This script detects duplicates by:
 *   1. Normalized email prefix (e.g. "abbas.raza" from "ABBAS.RAZA@csdl.uol.edu.pk")
 *   2. Same name + same department
 *
 * Usage: node scripts/find-duplicate-faculty-emails-broad.mjs
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
    label: "A. Duplicate by normalized email prefix (same person, different email domain/suffix)",
    sql: `SELECT
            LOWER(SPLIT_PART(LOWER(TRIM(email)), '@', 1)) AS email_prefix,
            COUNT(*) AS cnt,
            STRING_AGG(id::text, ', ' ORDER BY id) AS fm_ids,
            STRING_AGG(name, ' | ' ORDER BY name) AS names,
            STRING_AGG(email, ' | ' ORDER BY email) AS emails,
            STRING_AGG(sap_id, ', ' ORDER BY sap_id) AS sap_ids
          FROM faculty_members
          WHERE deleted_at IS NULL AND TRIM(email) != ''
          GROUP BY LOWER(SPLIT_PART(LOWER(TRIM(email)), '@', 1))
          HAVING COUNT(*) > 1
          ORDER BY cnt DESC
          LIMIT 50`,
  },
  {
    label: "B. Duplicate by name + department (same person in same dept)",
    sql: `SELECT
            LOWER(TRIM(name)) AS name_norm,
            department_id,
            COUNT(*) AS cnt,
            STRING_AGG(id::text, ', ' ORDER BY id) AS fm_ids,
            STRING_AGG(name, ' | ' ORDER BY name) AS names,
            STRING_AGG(email, ' | ' ORDER BY email) AS emails,
            STRING_AGG(sap_id, ', ' ORDER BY sap_id) AS sap_ids
          FROM faculty_members
          WHERE deleted_at IS NULL AND TRIM(name) != ''
          GROUP BY LOWER(TRIM(name)), department_id
          HAVING COUNT(*) > 1
          ORDER BY cnt DESC
          LIMIT 50`,
  },
  {
    label: "C. Detail rows for top 20 email-prefix duplicates",
    sql: `SELECT
            fm.id, fm.sap_id, fm.name, fm.email, fm.department, fm.department_id,
            fm.status, fm.is_active, fm.last_synced_at,
            au.id AS admin_user_id, au.role, au.status AS admin_status
          FROM faculty_members fm
          LEFT JOIN admin_users au ON au.id = fm.user_id
          WHERE fm.deleted_at IS NULL AND TRIM(fm.email) != ''
            AND LOWER(SPLIT_PART(LOWER(TRIM(fm.email)), '@', 1)) IN (
              SELECT LOWER(SPLIT_PART(LOWER(TRIM(email)), '@', 1))
              FROM faculty_members
              WHERE deleted_at IS NULL AND TRIM(email) != ''
              GROUP BY LOWER(SPLIT_PART(LOWER(TRIM(email)), '@', 1))
              HAVING COUNT(*) > 1
              ORDER BY COUNT(*) DESC
              LIMIT 20
            )
          ORDER BY LOWER(SPLIT_PART(LOWER(TRIM(fm.email)), '@', 1)), fm.name`,
  },
  {
    label: "D. Summary counts",
    sql: `SELECT
            (SELECT COUNT(*) FROM faculty_members WHERE deleted_at IS NULL) AS total_fm,
            (SELECT COUNT(DISTINCT LOWER(SPLIT_PART(LOWER(TRIM(email)), '@', 1)))
             FROM faculty_members WHERE deleted_at IS NULL AND TRIM(email) != '') AS distinct_email_prefixes,
            (SELECT COUNT(*) FROM (
              SELECT LOWER(SPLIT_PART(LOWER(TRIM(email)), '@', 1))
              FROM faculty_members
              WHERE deleted_at IS NULL AND TRIM(email) != ''
              GROUP BY LOWER(SPLIT_PART(LOWER(TRIM(email)), '@', 1))
              HAVING COUNT(*) > 1
            ) x) AS duplicate_email_prefix_groups,
            (SELECT COUNT(*) FROM (
              SELECT LOWER(TRIM(name)), department_id
              FROM faculty_members
              WHERE deleted_at IS NULL AND TRIM(name) != ''
              GROUP BY LOWER(TRIM(name)), department_id
              HAVING COUNT(*) > 1
            ) x) AS duplicate_name_dept_groups`,
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
