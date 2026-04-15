import { Pool } from "pg";

function getDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL;
  if (rawUrl) {
    // Validate early so API returns a clear setup issue.
    new URL(rawUrl);
    return rawUrl;
  }

  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT ?? "5432";
  const database = process.env.DB_NAME ?? "postgres";
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  if (!host || !user || !password) {
    throw new Error(
      "DATABASE_URL is not set (or set DB_HOST, DB_USER, DB_PASSWORD)",
    );
  }

  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}`;
}

const databaseUrl = getDatabaseUrl();
const parsedDatabaseUrl = new URL(databaseUrl);
const isLocalDatabase =
  parsedDatabaseUrl.hostname === "localhost" ||
  parsedDatabaseUrl.hostname === "127.0.0.1";
const sslConfig = isLocalDatabase
  ? false
  : {
      rejectUnauthorized: false,
    };

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

const isProduction = process.env.NODE_ENV === "production";

export const db =
  global.pgPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl: sslConfig,
  });

if (!isProduction) {
  global.pgPool = db;
}
