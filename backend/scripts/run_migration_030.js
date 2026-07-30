require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

(async () => {
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "src", "database", "migrations", "030_dining_tables_section_not_null.sql"),
    "utf8"
  );
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    await c.query(sql);
    console.log("030_dining_tables_section_not_null.sql: OK");
  } finally {
    await c.end();
  }
})().catch((e) => { console.error(e); process.exit(1); });
