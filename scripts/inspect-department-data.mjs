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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
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
    throw new Error("Set DATABASE_URL in .env.local (or DB_HOST, DB_USER, DB_PASSWORD).");
  }
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

loadEnvLocal();
const pool = new pg.Pool({ connectionString: getDatabaseUrl() });

const queries = [
  {
    label: "DEPARTMENTS TABLE (all rows)",
    sql: `SELECT id, faculty_id, name, is_active FROM departments ORDER BY id`,
  },
  {
    label: "FACULTY_MEMBERS department-related columns",
    sql: `SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'faculty_members'
            AND (column_name LIKE '%department%' OR column_name LIKE '%faculty%' OR column_name LIKE '%program%')
          ORDER BY ordinal_position`,
  },
  {
    label: "DISTINCT faculty_members.department (text) with counts",
    sql: `SELECT TRIM(department) AS department, COUNT(*) AS cnt
          FROM faculty_members
          WHERE deleted_at IS NULL AND TRIM(department) != ''
          GROUP BY TRIM(department)
          ORDER BY department`,
  },
  {
    label: "faculty_members.department_id distribution",
    sql: `SELECT department_id, COUNT(*) AS cnt
          FROM faculty_members
          WHERE deleted_at IS NULL
          GROUP BY department_id
          ORDER BY department_id`,
  },
  {
    label: "faculty_members with role=supervisor (via admin_users)",
    sql: `SELECT fm.id, fm.name, fm.department, fm.department_id, fm.faculty, fm.faculty_id,
                 au.role, au.status, au.id AS user_id
          FROM faculty_members fm
          INNER JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
          WHERE fm.deleted_at IS NULL AND au.role = 'supervisor'
          ORDER BY fm.name`,
  },
  {
    label: "admin_faculty_assignments (supervisor_primary, not deleted)",
    sql: `SELECT afa.admin_user_id, afa.faculty_id, afa.assignment_type,
                 au.role, au.status, au.email
          FROM admin_faculty_assignments afa
          INNER JOIN admin_users au ON au.id = afa.admin_user_id
          WHERE afa.deleted_at IS NULL
          ORDER BY afa.created_at DESC
          LIMIT 20`,
  },
  {
    label: "FK references to departments(id) across all tables",
    sql: `SELECT tc.table_name, kcu.column_name, rc.delete_rule
          FROM information_schema.referential_constraints rc
          INNER JOIN information_schema.key_column_usage kcu
            ON kcu.constraint_name = rc.constraint_name
          INNER JOIN information_schema.table_constraints tc
            ON tc.constraint_name = rc.constraint_name
          WHERE rc.unique_constraint_name = 'departments_pkey'
          ORDER BY tc.table_name`,
  },
  {
    label: "faculty_members joined to departments by department_id (sample 30)",
    sql: `SELECT fm.id, fm.name, TRIM(fm.department) AS fm_dept_text, fm.department_id,
                 d.name AS dept_table_name, d.id AS dept_table_id
          FROM faculty_members fm
          LEFT JOIN departments d ON d.id = fm.department_id
          WHERE fm.deleted_at IS NULL
          ORDER BY fm.name
          LIMIT 30`,
  },
  {
    label: "admin_department_assignments (not deleted)",
    sql: `SELECT ada.admin_user_id, ada.faculty_id, ada.department_id, ada.assignment_type,
                 au.role, au.email
          FROM admin_department_assignments ada
          INNER JOIN admin_users au ON au.id = ada.admin_user_id
          WHERE ada.deleted_at IS NULL
          ORDER BY ada.created_at DESC
          LIMIT 20`,
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
