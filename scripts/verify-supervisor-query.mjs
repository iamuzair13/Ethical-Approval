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

// Run the EXACT query from listSupervisorsForDepartment for department_id = 1 (Audiology)
const result = await pool.query(`
  SELECT
    au.id AS user_id,
    fm.id AS faculty_member_id,
    fm.sap_id,
    fm.name,
    fm.email,
    fm.designation,
    fm.department,
    fm.faculty
  FROM faculty_members fm
  INNER JOIN admin_users au
    ON au.id = fm.user_id
    AND au.deleted_at IS NULL
  WHERE fm.deleted_at IS NULL
    AND fm.status = 'active'
    AND fm.is_active = TRUE
    AND au.role = 'supervisor'
    AND au.status = 'active'
    AND fm.department_id = $1
  ORDER BY fm.name ASC
`, [1]);

console.log(`Supervisors for Department of Audiology (id=1): ${result.rows.length}`);
console.table(result.rows);

// Also check a few other departments
for (const deptId of [19, 20, 32, 33]) {
  const r = await pool.query(`
    SELECT d.name, COUNT(fm.id) AS supervisor_count
    FROM departments d
    LEFT JOIN faculty_members fm ON fm.department_id = d.id AND fm.deleted_at IS NULL
    LEFT JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
      AND au.role = 'supervisor' AND au.status = 'active'
      AND fm.status = 'active' AND fm.is_active = TRUE
    WHERE d.id = $1
    GROUP BY d.name
  `, [deptId]);
  if (r.rows[0]) {
    console.log(`Department id=${deptId} (${r.rows[0].name}): ${r.rows[0].supervisor_count} supervisors`);
  }
}

await pool.end();
