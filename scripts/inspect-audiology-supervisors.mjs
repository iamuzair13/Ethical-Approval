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
    label: "Department of Audiology in departments table",
    sql: `SELECT id, faculty_id, name, is_active FROM departments WHERE name ILIKE '%audiology%'`,
  },
  {
    label: "faculty_members with department text 'Audiology' (any case)",
    sql: `SELECT fm.id, fm.name, fm.department, fm.department_id, fm.faculty, fm.faculty_id,
                 au.role, au.status, au.id AS user_id
          FROM faculty_members fm
          LEFT JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
          WHERE fm.deleted_at IS NULL AND fm.department ILIKE '%audiology%'
          ORDER BY fm.name`,
  },
  {
    label: "faculty_members with department_id = (Department of Audiology id)",
    sql: `SELECT fm.id, fm.name, fm.department, fm.department_id,
                 au.role, au.status, au.id AS user_id
          FROM faculty_members fm
          LEFT JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
          WHERE fm.deleted_at IS NULL AND fm.department_id IN (
            SELECT id FROM departments WHERE name ILIKE '%audiology%'
          )
          ORDER BY fm.name`,
  },
  {
    label: "Supervisors (role=supervisor) with department_id = audiology dept",
    sql: `SELECT fm.id, fm.name, fm.department, fm.department_id,
                 au.role, au.status, au.id AS user_id, au.email
          FROM faculty_members fm
          INNER JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
          WHERE fm.deleted_at IS NULL
            AND au.role = 'supervisor'
            AND au.status = 'active'
            AND fm.department_id IN (
              SELECT id FROM departments WHERE name ILIKE '%audiology%'
            )
          ORDER BY fm.name`,
  },
  {
    label: "admin_faculty_assignments for those supervisors (supervisor_primary)",
    sql: `SELECT afa.admin_user_id, afa.faculty_id, afa.assignment_type, afa.deleted_at,
                 au.role, au.status, au.email
          FROM admin_faculty_assignments afa
          INNER JOIN admin_users au ON au.id = afa.admin_user_id
          WHERE afa.admin_user_id IN (
            SELECT au.id FROM faculty_members fm
            INNER JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
            WHERE fm.deleted_at IS NULL AND au.role = 'supervisor'
              AND fm.department_id IN (SELECT id FROM departments WHERE name ILIKE '%audiology%')
          )
          ORDER BY afa.created_at DESC`,
  },
  {
    label: "admin_department_assignments for those supervisors",
    sql: `SELECT ada.admin_user_id, ada.faculty_id, ada.department_id, ada.assignment_type, ada.deleted_at,
                 au.role, au.status, au.email
          FROM admin_department_assignments ada
          INNER JOIN admin_users au ON au.id = ada.admin_user_id
          WHERE ada.admin_user_id IN (
            SELECT au.id FROM faculty_members fm
            INNER JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
            WHERE fm.deleted_at IS NULL AND au.role = 'supervisor'
              AND fm.department_id IN (SELECT id FROM departments WHERE name ILIKE '%audiology%')
          )
          ORDER BY ada.created_at DESC`,
  },
  {
    label: "ALL admin_faculty_assignments (supervisor_primary, not deleted) - full list",
    sql: `SELECT afa.admin_user_id, afa.faculty_id, afa.assignment_type,
                 au.role, au.status, au.email,
                 fm.name AS fm_name, fm.department, fm.department_id
          FROM admin_faculty_assignments afa
          INNER JOIN admin_users au ON au.id = afa.admin_user_id
          LEFT JOIN faculty_members fm ON fm.user_id = au.id AND fm.deleted_at IS NULL
          WHERE afa.deleted_at IS NULL AND afa.assignment_type = 'supervisor_primary'
          ORDER BY au.email`,
  },
  {
    label: "ALL admin_department_assignments (supervisor_primary, not deleted)",
    sql: `SELECT ada.admin_user_id, ada.faculty_id, ada.department_id, ada.assignment_type,
                 au.role, au.status, au.email,
                 fm.name AS fm_name, fm.department, fm.department_id
          FROM admin_department_assignments ada
          INNER JOIN admin_users au ON au.id = ada.admin_user_id
          LEFT JOIN faculty_members fm ON fm.user_id = au.id AND fm.deleted_at IS NULL
          WHERE ada.deleted_at IS NULL AND ada.assignment_type = 'supervisor_primary'
          ORDER BY au.email`,
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
