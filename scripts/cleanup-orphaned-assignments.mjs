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

// Show orphaned assignments
const r = await pool.query(`
  SELECT ada.id, ada.admin_user_id, ada.faculty_id, ada.department_id, ada.assignment_type,
         au.email, au.deleted_at AS au_deleted
  FROM admin_department_assignments ada
  INNER JOIN admin_users au ON au.id = ada.admin_user_id
  WHERE ada.deleted_at IS NULL AND au.deleted_at IS NOT NULL
`);
console.log("Orphaned admin_department_assignments:");
console.table(r.rows);

// Soft-delete them
const del = await pool.query(`
  UPDATE admin_department_assignments ada
  SET deleted_at = NOW()
  FROM admin_users au
  WHERE ada.admin_user_id = au.id
    AND ada.deleted_at IS NULL
    AND au.deleted_at IS NOT NULL
  RETURNING ada.id
`);
console.log(`\nSoft-deleted ${del.rows.length} orphaned admin_department_assignments`);

// Verify
const check = await pool.query(`
  SELECT COUNT(*) AS orphaned_ada
  FROM admin_department_assignments ada
  INNER JOIN admin_users au ON au.id = ada.admin_user_id
  WHERE ada.deleted_at IS NULL AND au.deleted_at IS NOT NULL
`);
console.log("Remaining orphaned admin_department_assignments:", check.rows[0].orphaned_ada);

await pool.end();
