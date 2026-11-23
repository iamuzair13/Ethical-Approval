/**
 * PM2 process configuration for the IREB Ethical Approval app.
 *
 * PM2 natively loads .js/.cjs/.mjs ecosystem files — this file uses
 * `module.exports` (not `export default`) so it also works unchanged
 * when renamed to ecosystem.config.js / .cjs on the server.
 *
 * Usage (on the server, /root/ireb-system):
 *   pm2 start ecosystem.config.js
 *   pm2 restart ireb        # after git pull + npm run build
 *   pm2 logs ireb
 *   pm2 save                # persist for pm2 resurrect on reboot
 */

module.exports = {
  apps: [
    {
      name: "ireb",

      // Runs `npm start` → `next start -p 3004` (see package.json).
      script: "npm",
      args: "start",
      cwd: "/root/ireb-system",

      // One instance — Next.js serves SSR + API from a single port;
      // clustering needs sticky sessions, which the app isn't set up for.
      exec_mode: "fork",
      instances: 1,

      env: {
        NODE_ENV: "production",
        PORT: "3004",
      },

      // Restart policy
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 3000,
      min_uptime: "10s",
      max_memory_restart: "1G",

      // Startup/shutdown grace
      listen_timeout: 15000,
      kill_timeout: 5000,

      // Logs
      out_file: "/root/.pm2/logs/ireb-out.log",
      error_file: "/root/.pm2/logs/ireb-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      time: true,
    },
  ],
};
