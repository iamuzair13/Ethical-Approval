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

const email = "ramsha.qayyum@doim.uol.edu.pk";

const queries = [
  {
    label: "admin_users by email",
    sql: `SELECT id, email, role, status, sap_id, deleted_at FROM admin_users WHERE email = $1`,
    params: [email],
  },
  {
    label: "admin_users by email (case-insensitive)",
    sql: `SELECT id, email, role, status, sap_id, deleted_at FROM admin_users WHERE LOWER(email) = LOWER($1)`,
    params: [email],
  },
  {
    label: "faculty_members by email",
    sql: `SELECT id, email, name, sap_id, status, is_active, deleted_at FROM faculty_members WHERE email = $1`,
    params: [email],
  },
  {
    label: "faculty_members by email (case-insensitive)",
    sql: `SELECT id, email, name, sap_id, status, is_active, deleted_at FROM faculty_members WHERE LOWER(email) = LOWER($1)`,
    params: [email],
  },
  {
    label: "faculty_members by name (ramsha)",
    sql: `SELECT id, email, name, sap_id, status, is_active, deleted_at FROM faculty_members WHERE LOWER(name) LIKE '%ramsha%'`,
    params: [],
  },
];

for (const q of queries) {
  console.log(`\n=== ${q.label} ===`);
  const result = await pool.query(q.sql, q.params);
  console.log(`Rows: ${result.rows.length}`);
  if (result.rows.length > 0) {
    console.table(result.rows);
  }
}

await pool.end();
