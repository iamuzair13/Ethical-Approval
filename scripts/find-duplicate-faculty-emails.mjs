/**
 * Find duplicate emails in faculty_members.
 *
 * Usage: node scripts/find-duplicate-faculty-emails.mjs
 *
 * Prints three reports:
 *   1. Duplicate emails (excluding soft-deleted records)
 *   2. Duplicate emails (including soft-deleted records)
 *   3. Detail rows for each duplicate (excluding soft-deleted)
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
    label: "Duplicate emails (excluding soft-deleted)",
    sql: `SELECT
            LOWER(TRIM(email)) AS email,
            COUNT(*) AS record_count,
            COUNT(*) FILTER (WHERE status = 'active' AND is_active = TRUE) AS active_count,
            STRING_AGG(sap_id, ', ' ORDER BY sap_id) AS sap_ids,
            STRING_AGG(name, ' | ' ORDER BY name) AS names,
            STRING_AGG(id::text, ', ' ORDER BY id) AS member_ids
          FROM faculty_members
          WHERE deleted_at IS NULL AND TRIM(email) != ''
          GROUP BY LOWER(TRIM(email))
          HAVING COUNT(*) > 1
          ORDER BY record_count DESC, email`,
  },
  {
    label: "Duplicate emails (including soft-deleted)",
    sql: `SELECT
            LOWER(TRIM(email)) AS email,
            COUNT(*) AS record_count,
            COUNT(*) FILTER (WHERE status = 'active' AND is_active = TRUE) AS active_count,
            COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS soft_deleted_count,
            STRING_AGG(sap_id, ', ' ORDER BY sap_id) AS sap_ids,
            STRING_AGG(name, ' | ' ORDER BY name) AS names,
            STRING_AGG(id::text, ', ' ORDER BY id) AS member_ids
          FROM faculty_members
          WHERE TRIM(email) != ''
          GROUP BY LOWER(TRIM(email))
          HAVING COUNT(*) > 1
          ORDER BY record_count DESC, email`,
  },
  {
    label: "Detail rows for each duplicate (excluding soft-deleted)",
    sql: `SELECT
            fm.id,
            fm.sap_id,
            fm.name,
            fm.email,
            fm.department,
            fm.department_id,
            fm.faculty,
            fm.status,
            fm.is_active,
            fm.created_at,
            au.id AS admin_user_id,
            au.role AS admin_role,
            au.status AS admin_status
          FROM faculty_members fm
          LEFT JOIN admin_users au ON au.id = fm.user_id
          WHERE fm.deleted_at IS NULL
            AND TRIM(fm.email) != ''
            AND LOWER(TRIM(fm.email)) IN (
              SELECT LOWER(TRIM(email))
              FROM faculty_members
              WHERE deleted_at IS NULL AND TRIM(email) != ''
              GROUP BY LOWER(TRIM(email))
              HAVING COUNT(*) > 1
            )
          ORDER BY LOWER(TRIM(fm.email)), fm.name`,
  },
];

for (const q of queries) {
  console.log(`\n=== ${q.label} ===`);
  const result = await pool.query(q.sql);
  console.log(`Rows: ${result.rows.length}`);
  if (result.rows.length > 0) {
    console.table(result.rows);
  }
}

await pool.end();
