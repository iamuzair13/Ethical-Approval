/**
 * Import programs from Excel file into the database.
 * Matches faculties and departments by name, then inserts programs.
 *
 * Usage: node scripts/import-programs.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

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

async function main() {
  loadEnvLocal();

  const excelPath = resolve(root, "..", "alumni-portal", "faculty-department-program.xlsx");
  if (!existsSync(excelPath)) {
    console.error(`Excel file not found at: ${excelPath}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  console.log(`Read ${rows.length} rows from Excel.`);

  // Build unique faculties, departments, and programs from Excel
  const excelFaculties = new Map(); // name -> { id, name }
  const excelDepartments = new Map(); // name -> { id, name, facultyName, code }
  const excelPrograms = []; // { name, abbreviation, departmentName, facultyName }

  for (const row of rows) {
    const facName = String(row["Faculty Name"] ?? "").trim();
    const depName = String(row["Department Name"] ?? "").trim();
    const progName = String(row["Program Name"] ?? "").trim();
    const progAbbr = String(row["Program Abbreviation"] ?? "").trim();
    const depCode = String(row["Department Code"] ?? "").trim();

    if (facName && !excelFaculties.has(facName)) {
      excelFaculties.set(facName, { name: facName });
    }
    if (depName && !excelDepartments.has(depName)) {
      excelDepartments.set(depName, { name: depName, facultyName: facName, code: depCode });
    }
    if (progName) {
      excelPrograms.push({
        name: progName,
        abbreviation: progAbbr,
        departmentName: depName,
        facultyName: facName,
      });
    }
  }

  console.log(`Excel: ${excelFaculties.size} faculties, ${excelDepartments.size} departments, ${excelPrograms.length} programs.`);

  const databaseUrl = getDatabaseUrl();
  const parsed = new URL(databaseUrl);
  const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  try {
    // --- Verify faculties ---
    const dbFaculties = await pool.query("SELECT id, code, name FROM faculties ORDER BY id");
    console.log(`\nDB has ${dbFaculties.rows.length} faculties.`);

    const dbFacultyMap = new Map();
    for (const f of dbFaculties.rows) {
      dbFacultyMap.set(f.name.trim().toLowerCase(), f);
    }

    // Check for missing faculties
    const missingFaculties = [];
    for (const [excelName] of excelFaculties) {
      if (!dbFacultyMap.has(excelName.toLowerCase())) {
        missingFaculties.push(excelName);
      }
    }
    if (missingFaculties.length > 0) {
      console.log("\n⚠ Inserting missing faculties:");
      for (const name of missingFaculties) {
        const code = name.toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 50);
        await pool.query(
          "INSERT INTO faculties (code, name, is_active) VALUES ($1, $2, TRUE)",
          [code, name],
        );
        console.log(`  + ${name} (code=${code})`);
      }
      // Refresh faculty map
      const refreshed = await pool.query("SELECT id, code, name FROM faculties ORDER BY id");
      dbFacultyMap.clear();
      for (const f of refreshed.rows) {
        dbFacultyMap.set(f.name.trim().toLowerCase(), f);
      }
    } else {
      console.log("✓ All Excel faculties exist in DB.");
    }

    // --- Verify departments ---
    const dbDepartments = await pool.query("SELECT id, faculty_id, name FROM departments ORDER BY id");
    console.log(`\nDB has ${dbDepartments.rows.length} departments.`);

    const dbDepartmentMap = new Map();
    for (const d of dbDepartments.rows) {
      dbDepartmentMap.set(d.name.trim().toLowerCase(), d);
    }

    // Check for missing departments
    const missingDepartments = [];
    for (const [excelName, info] of excelDepartments) {
      if (!dbDepartmentMap.has(excelName.toLowerCase())) {
        missingDepartments.push({ name: excelName, faculty: info.facultyName });
      }
    }
    if (missingDepartments.length > 0) {
      console.log("\n⚠ Inserting missing departments:");
      for (const dep of missingDepartments) {
        const facRow = dbFacultyMap.get(dep.faculty.toLowerCase());
        if (!facRow) {
          console.log(`  ✗ Cannot insert department "${dep.name}" - faculty "${dep.faculty}" not found`);
          continue;
        }
        const depInfo = excelDepartments.get(dep.name);
        await pool.query(
          "INSERT INTO departments (faculty_id, name, is_active) VALUES ($1, $2, TRUE)",
          [facRow.id, dep.name],
        );
        console.log(`  + ${dep.name} (faculty: ${dep.faculty})`);
      }
      // Refresh department map
      const refreshed = await pool.query("SELECT id, faculty_id, name FROM departments ORDER BY id");
      dbDepartmentMap.clear();
      for (const d of refreshed.rows) {
        dbDepartmentMap.set(d.name.trim().toLowerCase(), d);
      }
    } else {
      console.log("✓ All Excel departments exist in DB.");
    }

    // --- Insert programs ---
    // Check existing programs
    const existingPrograms = await pool.query("SELECT name, department_id FROM programs");
    const existingProgramSet = new Set();
    for (const p of existingPrograms.rows) {
      existingProgramSet.add(`${p.department_id}|${p.name.trim().toLowerCase()}`);
    }

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const prog of excelPrograms) {
      const depKey = prog.departmentName.toLowerCase();
      const dbDep = dbDepartmentMap.get(depKey);

      if (!dbDep) {
        console.error(`  ✗ Department not found in DB: "${prog.departmentName}" for program "${prog.name}"`);
        errors++;
        continue;
      }

      const progKey = `${dbDep.id}|${prog.name.toLowerCase()}`;
      if (existingProgramSet.has(progKey)) {
        skipped++;
        continue;
      }

      try {
        await pool.query(
          `INSERT INTO programs (department_id, name, is_active) VALUES ($1, $2, TRUE)`,
          [dbDep.id, prog.name],
        );
        existingProgramSet.add(progKey);
        inserted++;
      } catch (insertError) {
        console.error(`  ✗ Failed to insert program "${prog.name}" into department "${prog.departmentName}": ${insertError.message}`);
        errors++;
      }
    }

    console.log(`\n=== Import Summary ===`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Skipped (already existed): ${skipped}`);
    console.log(`Errors: ${errors}`);

    // Final count
    const finalCount = await pool.query("SELECT count(*)::int as cnt FROM programs");
    console.log(`Total programs in DB: ${finalCount.rows[0].cnt}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
