// src/modules/customer/payment/payment.repository.js
// PK customer_wallets.wallet_id, wallet_topups.wallet_topup_id.
const pool = require("../../../config/db");

exports.findWalletByCustomer = async (customerId) => {
  let r = await pool.query("SELECT wallet_id AS id, status FROM customer_wallets WHERE customer_id = $1", [customerId]);
  if (r.rowCount === 0) {
    r = await pool.query(
      "INSERT INTO customer_wallets (customer_id, balance) VALUES ($1, 0) RETURNING wallet_id AS id, 'ACTIVE' AS status",
      [customerId]
    );
  }
  return r.rows[0];
};

exports.insertTopup = (walletId, orderCode, amount) =>
  pool
    .query(
      `INSERT INTO wallet_topups (wallet_id, order_code, amount, status)
       VALUES ($1, $2, $3, 'PENDING') RETURNING wallet_topup_id AS id`,
      [walletId, orderCode, amount]
    )
    .then((r) => r.rows[0].id);

exports.updateTopupLink = (id, checkoutUrl, qrCode, linkId) =>
  pool.query(
    `UPDATE wallet_topups SET checkout_url = $1, qr_code = $2, payos_payment_link_id = $3 WHERE wallet_topup_id = $4`,
    [checkoutUrl || null, qrCode || null, linkId || null, id]
  );

exports.failPendingTopup = (orderCode) =>
  pool.query(
    "UPDATE wallet_topups SET status = 'FAILED' WHERE order_code = $1 AND status = 'PENDING'",
    [orderCode]
  );

// ---- Webhook (trong transaction) ----
exports.lockTopupByOrderCode = (client, orderCode) =>
  client
    .query("SELECT wallet_topup_id AS id, wallet_id, amount, status FROM wallet_topups WHERE order_code = $1 FOR UPDATE", [orderCode])
    .then((r) => r.rows[0]);

exports.failTopupById = (client, id) =>
  client.query("UPDATE wallet_topups SET status = 'FAILED' WHERE wallet_topup_id = $1 AND status = 'PENDING'", [id]);

exports.lockWalletById = (client, walletId) =>
  client
    .query("SELECT wallet_id AS id, balance, status FROM customer_wallets WHERE wallet_id = $1 FOR UPDATE", [walletId])
    .then((r) => r.rows[0]);

exports.updateWalletBalance = (client, walletId, balance) =>
  client.query("UPDATE customer_wallets SET balance = $1 WHERE wallet_id = $2", [balance, walletId]);

exports.markTopupSuccess = (client, id) =>
  client.query("UPDATE wallet_topups SET status = 'SUCCESS', paid_at = NOW() WHERE wallet_topup_id = $1", [id]);

exports.insertTopupTransaction = (client, t) =>
  client.query(
    `INSERT INTO wallet_transactions (
       wallet_id, transaction_code, transaction_type, amount,
       balance_before, balance_after, reference_type, reference_id, description, status
     ) VALUES ($1, $2, 'TOPUP', $3, $4, $5, 'TOPUP', $6, $7, 'SUCCESS')
     ON CONFLICT (transaction_code) DO NOTHING`,
    [t.walletId, t.code, t.amount, t.balanceBefore, t.balanceAfter, t.topupId, t.description]
  );
