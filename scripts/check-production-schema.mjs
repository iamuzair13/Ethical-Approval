#!/usr/bin/env node
/**
 * Diagnostic script: checks whether the production database has all the
 * tables/columns required by the latest code changes.
 *
 * Run with:  node scripts/check-production-schema.mjs
 *
 * It prints a checklist showing which migrations are likely missing.
 */
import { db } from "../src/lib/db.ts";

async function check() {
  const checks = [
    {
      label: "Table: admin_department_assignments (migration 003)",
      query: `SELECT to_regclass('public.admin_department_assignments') AS exists`,
    },
    {
      label: "Table: departments (migration 003)",
      query: `SELECT to_regclass('public.departments') AS exists`,
    },
    {
      label: "Column: submissions.supervisor_name_snapshot (migration 021)",
      query: `
        SELECT column_name AS exists
        FROM information_schema.columns
        WHERE table_name = 'submissions'
          AND column_name = 'supervisor_name_snapshot'
      `,
    },
    {
      label: "Column: submissions.supervisor_user_id (migration 021)",
      query: `
        SELECT column_name AS exists
        FROM information_schema.columns
        WHERE table_name = 'submissions'
          AND column_name = 'supervisor_user_id'
      `,
    },
    {
      label: "Column: departments.faculty_id is nullable (migration 023)",
      query: `
        SELECT is_nullable AS exists
        FROM information_schema.columns
        WHERE table_name = 'departments'
          AND column_name = 'faculty_id'
      `,
    },
    {
      label: "Constraint: admin_department_assignments allows 'supervisor_primary' (migration 011)",
      query: `
        SELECT cc.constraint_name AS exists
        FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_column_usage cu
          ON cc.constraint_name = cu.constraint_name
        WHERE cu.table_name = 'admin_department_assignments'
          AND cc.check_clause LIKE '%supervisor_primary%'
      `,
    },
    {
      label: "Table: admin_users (migration 018)",
      query: `SELECT to_regclass('public.admin_users') AS exists`,
    },
    {
      label: "Table: activity_events (migration 008)",
      query: `SELECT to_regclass('public.activity_events') AS exists`,
    },
  ];

  let allOk = true;
  for (const c of checks) {
    try {
      const result = await db.query(c.query);
      const row = result.rows[0];
      const exists = row && Object.values(row)[0] !== null;
      const status = exists ? "OK" : "MISSING";
      if (!exists) allOk = false;
      console.log(`  [${status}] ${c.label}`);
    } catch (err) {
      allOk = false;
      console.log(`  [ERROR] ${c.label}: ${err.message}`);
    }
  }

  console.log("");
  if (allOk) {
    console.log("All schema checks passed. The 500 error is NOT a missing-migration issue.");
    console.log("Check PM2 logs for the actual error: pm2 logs --lines 50 --nostream");
  } else {
    console.log("Some schema objects are MISSING. Run the pending migrations on production.");
    console.log("Migrations to run (in order):");
    console.log("  003_add_departments_and_admin_department_assignments.sql");
    console.log("  008_activity_events.sql");
    console.log("  011_rename_dean_to_supervisor.sql");
    console.log("  018_unify_users_and_faculty.sql");
    console.log("  021_supervisor_per_application.sql");
    console.log("  023_departments_independent.sql");
    console.log("");
    console.log("Run each with: node scripts/run-sql-migration.mjs migrations/<file>.sql");
  }

  process.exit(0);
}

check().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
