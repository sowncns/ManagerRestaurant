// src/modules/internal/cashback/cashback.repository.js
const pool = require("../../../config/db");

exports.getAll = () =>
  pool
    .query("SELECT rank, rate, updated_at FROM cashback_rates ORDER BY rate ASC")
    .then((r) => r.rows);

// Chi cap nhat hang da ton tai (seed tu migration). Tra row moi hoac undefined neu khong co.
exports.updateRate = (rank, rate) =>
  pool
    .query(
      "UPDATE cashback_rates SET rate = $2, updated_at = NOW() WHERE rank = $1 RETURNING rank, rate, updated_at",
      [rank, rate]
    )
    .then((r) => r.rows[0]);
