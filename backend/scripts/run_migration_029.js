require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

(async () => {
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "src", "database", "migrations", "029_drop_void_pin_threshold.sql"),
    "utf8"
  );
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    await c.query(sql);
    console.log("029_drop_void_pin_threshold.sql: OK");
  } finally {
    await c.end();
  }
})().catch((e) => { console.error(e); process.exit(1); });
