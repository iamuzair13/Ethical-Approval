const { Pool } = require("pg");
const p = new Pool({
  connectionString: "postgresql://postgres:shan237426@localhost:5433/ireb",
  ssl: false,
});
const email = process.argv[2] || "aamir.hayat@phys.uol.edu.pk";
p.query("SELECT id, email, role, status FROM admin_users WHERE email = $1", [email])
  .then((r) => {
    console.log("rows:", r.rows.length, JSON.stringify(r.rows, null, 2));
    p.end();
  })
  .catch((e) => {
    console.error("ERROR:", e.message);
    p.end();
  });
