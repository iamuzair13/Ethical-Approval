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

loadEnvLocal();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const queries = [
  {
    label: "All records with 'rimsha' or 'ramsha' in name/email",
    sql: `SELECT fm.id, fm.sap_id, fm.name, fm.email, fm.department, fm.department_id,
                 fm.status, fm.is_active, fm.deleted_at, fm.last_synced_at,
                 au.id AS admin_user_id, au.role, au.status AS admin_status, au.deleted_at AS au_deleted
          FROM faculty_members fm
          LEFT JOIN admin_users au ON au.id = fm.user_id
          WHERE (LOWER(fm.name) LIKE '%rimsha%' OR LOWER(fm.name) LIKE '%ramsha%'
                 OR LOWER(fm.email) LIKE '%rimsha%' OR LOWER(fm.email) LIKE '%ramsha%')
          ORDER BY fm.deleted_at IS NULL DESC, fm.name`,
  },
  {
    label: "SAP ID 22833 vs 00022833 — are these the same after zero-strip?",
    sql: `SELECT fm.id, fm.sap_id, TRIM(fm.sap_id) AS trimmed_sap,
                 REGEXP_REPLACE(TRIM(fm.sap_id), '^0+', '') AS sap_no_leading_zeros,
                 fm.name, fm.email, fm.deleted_at
          FROM faculty_members fm
          WHERE fm.sap_id IN ('22833', '00022833', ' 22833 ', ' 00022833 ')
             OR TRIM(fm.sap_id) IN ('22833', '00022833')
          ORDER BY fm.deleted_at IS NULL DESC`,
  },
  {
    label: "Check: AFAQ.ARSHAD email — who does it belong to?",
    sql: `SELECT fm.id, fm.sap_id, fm.name, fm.email, fm.deleted_at
          FROM faculty_members fm
          WHERE LOWER(TRIM(fm.email)) = 'afaq.arshad@cs.uol.edu.pk'
          ORDER BY fm.deleted_at IS NULL DESC`,
  },
  {
    label: "Check: rimsha.qayyum in admin_users",
    sql: `SELECT au.id, au.email, au.role, au.status, au.sap_id, au.deleted_at
          FROM admin_users au
          WHERE LOWER(au.email) LIKE '%rimsha%' OR LOWER(au.email) LIKE '%ramsha%'
          ORDER BY au.deleted_at IS NULL DESC`,
  },
  {
    label: "Check: are there SAP IDs that differ only by leading zeros?",
    sql: `SELECT
            REGEXP_REPLACE(TRIM(sap_id), '^0+', '') AS sap_normalized,
            COUNT(*) AS cnt,
            STRING_AGG(sap_id, ', ' ORDER BY sap_id) AS sap_variants,
            STRING_AGG(name, ' | ' ORDER BY name) AS names,
            STRING_AGG(email, ' | ' ORDER BY email) AS emails
          FROM faculty_members
          WHERE deleted_at IS NULL AND sap_id IS NOT NULL AND TRIM(sap_id) != ''
          GROUP BY REGEXP_REPLACE(TRIM(sap_id), '^0+', '')
          HAVING COUNT(DISTINCT TRIM(sap_id)) > 1
          ORDER BY cnt DESC
          LIMIT 20`,
  },
  {
    label: "How many leading-zero SAP ID duplicates exist?",
    sql: `SELECT COUNT(*) AS total_affected_records FROM (
            SELECT REGEXP_REPLACE(TRIM(sap_id), '^0+', '') AS sap_norm
            FROM faculty_members
            WHERE deleted_at IS NULL AND sap_id IS NOT NULL AND TRIM(sap_id) != ''
            GROUP BY REGEXP_REPLACE(TRIM(sap_id), '^0+', '')
            HAVING COUNT(DISTINCT TRIM(sap_id)) > 1
          ) x`,
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
