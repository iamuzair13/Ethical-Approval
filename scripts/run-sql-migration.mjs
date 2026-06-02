/**
 * Run a SQL migration file against DATABASE_URL from .env.local
 * Usage: node scripts/run-sql-migration.mjs migrations/008_activity_events.sql
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
  const relPath = process.argv[2];
  if (!relPath) {
    console.error("Usage: node scripts/run-sql-migration.mjs <path-to.sql>");
    process.exit(1);
  }

  loadEnvLocal();
  const sqlPath = resolve(root, relPath);
  const sql = readFileSync(sqlPath, "utf8");
  const databaseUrl = getDatabaseUrl();
  const parsed = new URL(databaseUrl);
  const isLocal =
    parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  try {
    console.log(`Running ${relPath} on ${parsed.hostname}/${parsed.pathname.slice(1)}...`);
    await pool.query(sql);
    console.log("Done.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
