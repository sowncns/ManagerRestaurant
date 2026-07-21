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

// Supabase free-tier pooler thinh thoang tu choi ket noi dau tien sau idle (cold start)
// -> query bung "econnrefused". Chi retry khi ket noi CHUA thanh lap (query chua chay),
// nen an toan ca voi write. Loi giua chung (ECONNRESET...) khong retry de tranh chay 2 lan.
const CONNECT_FAIL = /failed to connect|econnrefused|etimedout|enotfound/i;
const isConnectError = (e) =>
  ["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND"].includes(e && e.code) ||
  CONNECT_FAIL.test((e && e.message) || "");

const rawQuery = pool.query.bind(pool);
pool.query = async (...args) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await rawQuery(...args);
    } catch (e) {
      if (attempt >= 2 || !isConnectError(e)) throw e;
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
};

module.exports = pool;