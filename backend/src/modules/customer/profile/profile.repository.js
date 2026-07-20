
const pool = require("../../../config/db");

exports.getProfile = (customerId) =>
  pool
    .query(
      `SELECT c.customer_id AS id, c.full_name, c.email, c.phone, c.dob, c.gender, c.rank, c.points,
              c.address, c.avatar_url, cw.balance AS wallet_balance, c.email_verified,
              CASE WHEN c.payment_pin IS NOT NULL THEN true ELSE false END AS has_payment_pin
       FROM customers c
       LEFT JOIN customer_wallets cw ON c.customer_id = cw.customer_id
       WHERE c.customer_id = $1`,
      [customerId]
    )
    .then((r) => r.rows[0]);

exports.updateProfile = (customerId, { name, email, phone, dob, gender }) =>
  pool
    .query(
      `UPDATE customers
       SET full_name = $1, email = $2, phone = $3, dob = $4, gender = $5
       WHERE customer_id = $6
       RETURNING customer_id AS id, full_name, email, phone, dob, gender, rank, points, address`,
      [name, email, phone, dob, gender, customerId]
    )
    .then((r) => r.rows[0]);

exports.updateAddress = (customerId, address) =>
  pool
    .query(
      "UPDATE customers SET address = $1 WHERE customer_id = $2 RETURNING customer_id AS id, address",
      [address, customerId]
    )
    .then((r) => r.rows[0]);

exports.getTransactionHistory = (customerId) =>
  pool
    .query(
      `SELECT wt.*
       FROM wallet_transactions wt
       JOIN customer_wallets cw ON wt.wallet_id = cw.wallet_id
       WHERE cw.customer_id = $1
       ORDER BY wt.created_at DESC`,
      [customerId]
    )
    .then((r) => r.rows);

// ---- PIN thanh toan ----
exports.setPin = (customerId, hashedPin) =>
  pool.query("UPDATE customers SET payment_pin = $1 WHERE customer_id = $2", [hashedPin, customerId]);

exports.getPinInfo = (customerId) =>
  pool
    .query(
      "SELECT payment_pin, pin_failed_attempts, pin_locked_until FROM customers WHERE customer_id = $1",
      [customerId]
    )
    .then((r) => r.rows[0]);

exports.resetPinAttempts = (customerId) =>
  pool.query(
    "UPDATE customers SET pin_failed_attempts = 0, pin_locked_until = NULL WHERE customer_id = $1",
    [customerId]
  );

exports.setPinAttempts = (customerId, attempts, lockedUntil) =>
  pool.query(
    "UPDATE customers SET pin_failed_attempts = $1, pin_locked_until = $2 WHERE customer_id = $3",
    [attempts, lockedUntil, customerId]
  );

// ---- Diem / hang (chay trong transaction) ----
exports.lockCustomer = (client, customerId) =>
  client
    .query(
      "SELECT customer_id AS id, rank, points, rank_expired_at FROM customers WHERE customer_id = $1 FOR UPDATE",
      [customerId]
    )
    .then((r) => r.rows[0]);

exports.updateRankPoints = (client, customerId, points, rank, rankExpiredAt) =>
  client
    .query(
      `UPDATE customers SET points = $1, rank = $2, rank_expired_at = $3
       WHERE customer_id = $4 RETURNING customer_id AS id, points, rank, rank_expired_at`,
      [points, rank, rankExpiredAt, customerId]
    )
    .then((r) => r.rows[0]);
