// src/config/db.js
const { Pool, types } = require("pg");
const env = require("./env");

types.setTypeParser(1114, function(stringValue) {
  return new Date(stringValue + "Z");
});

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("Unexpected PG pool error", err);
});

module.exports = pool;