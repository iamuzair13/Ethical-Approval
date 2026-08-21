// PM2 ecosystem config for the IREB Ethical Approval system.
//
// Usage:
//   pm2 start ecosystem.config.cjs
//   pm2 restart ecosystem.config.cjs
//   pm2 reload ecosystem.config.cjs
//
// This ensures the .env file is loaded into the process environment
// before `next start` runs, so NEXTAUTH_SECRET, DATABASE_URL, etc.
// are available at runtime (Next.js does NOT auto-load .env in production).

const fs = require("fs");
const path = require("path");

// Load .env manually so PM2 passes the vars to the Next.js process.
const envPath = path.join(__dirname, ".env");
const envVars = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (key) envVars[key] = value;
  }
}

module.exports = {
  apps: [
    {
      name: "ireb",
      script: "npm",
      args: "start",
      cwd: __dirname,
      env: envVars,
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
      watch: false,
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
