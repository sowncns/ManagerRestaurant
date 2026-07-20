// src/modules/customer/auth/auth.repository.js
// Tang truy cap du lieu: CHI chua truy van DB, khong co logic nghiep vu.
// PK customers.customer_id, password_reset_tokens.reset_token_id (alias AS id cho tang tren).
const pool = require("../../../config/db");

exports.findByEmail = (email) =>
  pool
    .query(
      "SELECT customer_id AS id, full_name, email, password, rank, points, status, email_verified FROM customers WHERE email = $1",
      [email]
    )
    .then((r) => r.rows[0]);

exports.findById = (id) =>
  pool
    .query(
      "SELECT customer_id AS id, full_name, rank, points, status FROM customers WHERE customer_id = $1",
      [id]
    )
    .then((r) => r.rows[0]);

exports.existsEmail = (email) =>
  pool
    .query("SELECT customer_id FROM customers WHERE email = $1", [email])
    .then((r) => r.rowCount > 0);

exports.create = async ({ full_name, email, password }) => {
  // Vi (customer_wallets) do trigger trg_create_wallet_for_customer tu tao.
  const c = await pool.query(
    `INSERT INTO customers (full_name, email, password)
     VALUES ($1, $2, $3)
     RETURNING customer_id AS id, full_name, email, rank, points, created_at`,
    [full_name, email, password]
  );
  return c.rows[0];
};

// ---- Xac thuc email ---- (dung bang gop customer_tokens, purpose = VERIFY_EMAIL)
exports.createVerificationToken = (customerId, tokenHash, expiresAt) =>
  pool.query(
    `INSERT INTO customer_tokens (customer_id, purpose, token_hash, expires_at)
     VALUES ($1, 'VERIFY_EMAIL', $2, $3)`,
    [customerId, tokenHash, expiresAt]
  );

exports.findVerificationTokenForUpdate = (client, tokenHash) =>
  client
    .query(
      `SELECT token_id AS id, customer_id, expires_at, used_at
       FROM customer_tokens WHERE token_hash = $1 AND purpose = 'VERIFY_EMAIL' FOR UPDATE`,
      [tokenHash]
    )
    .then((r) => r.rows[0]);

exports.markVerificationUsed = (client, id) =>
  client.query("UPDATE customer_tokens SET used_at = NOW() WHERE token_id = $1", [id]);

exports.markCustomerVerified = (client, customerId) =>
  client.query(
    "UPDATE customers SET email_verified = TRUE, email_verified_at = NOW() WHERE customer_id = $1",
    [customerId]
  );

// Lay email + trang thai xac thuc theo customer_id (dung khi khach da dang nhap).
exports.findEmailStatusById = (id) =>
  pool
    .query(
      "SELECT customer_id AS id, email, email_verified FROM customers WHERE customer_id = $1",
      [id]
    )
    .then((r) => r.rows[0]);

// Tim khach de gui lai mail xac thuc (theo email - form cong khai).
exports.findForVerify = (email) =>
  pool
    .query(
      "SELECT customer_id AS id, email, email_verified FROM customers WHERE email = $1",
      [email]
    )
    .then((r) => r.rows[0]);

exports.getPassword = (id) =>
  pool
    .query("SELECT password, email FROM customers WHERE customer_id = $1", [id])
    .then((r) => r.rows[0]);

exports.updatePassword = (id, hashed) =>
  pool.query("UPDATE customers SET password = $1 WHERE customer_id = $2", [hashed, id]);

// exports.updateSupabaseUid removed

// exports.findSupabaseUidById removed

// ---- Quen / dat lai mat khau ----
exports.findForReset = (email) =>
  pool
    .query("SELECT customer_id AS id, email FROM customers WHERE email = $1", [email])
    .then((r) => r.rows[0]);

exports.createResetToken = (customerId, tokenHash, expiresAt) =>
  pool.query(
    `INSERT INTO customer_tokens (customer_id, purpose, token_hash, expires_at)
     VALUES ($1, 'RESET_PASSWORD', $2, $3)`,
    [customerId, tokenHash, expiresAt]
  );

exports.findResetTokenForUpdate = (client, tokenHash) =>
  client
    .query(
      `SELECT token_id AS id, customer_id, expires_at, used_at
       FROM customer_tokens WHERE token_hash = $1 AND purpose = 'RESET_PASSWORD' FOR UPDATE`,
      [tokenHash]
    )
    .then((r) => r.rows[0]);

exports.markResetTokenUsed = (client, id) =>
  client.query("UPDATE customer_tokens SET used_at = NOW() WHERE token_id = $1", [id]);

exports.updatePasswordTx = (client, id, hashed) =>
  client.query("UPDATE customers SET password = $1 WHERE customer_id = $2", [hashed, id]);
