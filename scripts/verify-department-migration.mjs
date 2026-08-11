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
  if (!host || !user || !password) {
    throw new Error("Set DATABASE_URL in .env.local");
  }
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

loadEnvLocal();
const pool = new pg.Pool({ connectionString: getDatabaseUrl() });

const queries = [
  {
    label: "Total departments (active + inactive)",
    sql: `SELECT is_active, COUNT(*) AS cnt FROM departments GROUP BY is_active`,
  },
  {
    label: "Active departments count",
    sql: `SELECT COUNT(*) AS cnt FROM departments WHERE is_active = TRUE`,
  },
  {
    label: "faculty_members.department_id distribution after migration",
    sql: `SELECT CASE WHEN department_id IS NOT NULL THEN 'has_id' ELSE 'null' END AS status, COUNT(*) AS cnt
          FROM faculty_members WHERE deleted_at IS NULL GROUP BY CASE WHEN department_id IS NOT NULL THEN 'has_id' ELSE 'null' END`,
  },
  {
    label: "Supervisors with department_id set vs null",
    sql: `SELECT CASE WHEN fm.department_id IS NOT NULL THEN 'has_id' ELSE 'null' END AS status, COUNT(*) AS cnt
          FROM faculty_members fm
          INNER JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
          WHERE fm.deleted_at IS NULL AND au.role = 'supervisor'
          GROUP BY CASE WHEN fm.department_id IS NOT NULL THEN 'has_id' ELSE 'null' END`,
  },
  {
    label: "Sample: active departments with supervisor count",
    sql: `SELECT d.id, d.name, COUNT(fm.id) AS supervisor_cnt
          FROM departments d
          LEFT JOIN faculty_members fm ON fm.department_id = d.id AND fm.deleted_at IS NULL
          LEFT JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL AND au.role = 'supervisor'
          WHERE d.is_active = TRUE
          GROUP BY d.id, d.name
          HAVING COUNT(fm.id) > 0
          ORDER BY supervisor_cnt DESC
          LIMIT 15`,
  },
  {
    label: "Active departments (first 20)",
    sql: `SELECT id, name FROM departments WHERE is_active = TRUE ORDER BY name LIMIT 20`,
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
