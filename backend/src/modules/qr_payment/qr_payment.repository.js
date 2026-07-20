// src/modules/qr_payment/qr_payment.repository.js
// SQL dung chung cho thanh toan QR (ca phia nhan vien va khach hang).
// PK: customers.customer_id, customer_wallets.wallet_id, invoices.invoice_id,
//     dining_tables.table_id, branches.branch_id, companies.company_id.
const pool = require("../../config/db");

const ACTIVE = "('PENDING','CONFIRMED','PREPARING','READY','SERVED')";

exports.findCustomerByIdOrPhone = (idOrPhone) =>
  pool
    .query("SELECT customer_id AS id FROM customers WHERE customer_id::text = $1 OR phone = $1", [String(idOrPhone)])
    .then((r) => r.rows[0]);

exports.findRestaurantName = (branchId) =>
  pool
    .query(
      `SELECT b.name AS branch_name, c.name AS company_name
       FROM branches b JOIN companies c ON b.company_id = c.company_id WHERE b.branch_id = $1`,
      [branchId]
    )
    .then((r) =>
      r.rows[0] ? `${r.rows[0].company_name} - ${r.rows[0].branch_name}` : "Nhà hàng iGourmet"
    );

// Lay voucher (chua dung) cua khach theo customer_voucher_id -> tra voucher code.
exports.findUnusedCustomerVoucher = (customerId, customerVoucherId) =>
  pool
    .query(
      `SELECT cv.customer_voucher_id AS id, vt.code
       FROM customer_vouchers cv
       JOIN voucher_templates vt ON cv.voucher_template_id = vt.voucher_template_id
       WHERE cv.customer_voucher_id = $1 AND cv.customer_id = $2 AND cv.status = 'unused'`,
      [customerVoucherId, customerId]
    )
    .then((r) => r.rows[0]);

// Ten khach (hien thi cho nhan vien sau khi quet).
exports.findCustomerName = (customerId) =>
  pool
    .query("SELECT full_name FROM customers WHERE customer_id = $1", [customerId])
    .then((r) => (r.rows[0] ? r.rows[0].full_name : null));

// ---- Trong transaction (nhan client) ----
exports.lockWallet = (client, customerId) =>
  client
    .query("SELECT wallet_id AS id, balance FROM customer_wallets WHERE customer_id = $1 FOR UPDATE", [customerId])
    .then((r) => r.rows[0]);

exports.updateBalance = (client, customerId, newBalance) =>
  client.query("UPDATE customer_wallets SET balance = $1 WHERE customer_id = $2", [
    newBalance,
    customerId,
  ]);

exports.insertPayTransaction = (client, t) =>
  client.query(
    `INSERT INTO wallet_transactions (
       wallet_id, transaction_code, transaction_type, amount,
       balance_before, balance_after, reference_type, reference_id,
       description, status
     ) VALUES ($1,$2,'PAY_INVOICE',$3,$4,$5,'INVOICE',$6,$7,'SUCCESS')`,
    [t.walletId, t.code, t.amount, t.balanceBefore, t.balanceAfter, t.invoiceId || 0, t.description]
  );

exports.markInvoicePaid = (client, invoiceId, customerId) =>
  client.query(
    "UPDATE invoices SET status = 'PAID', paid_at = NOW(), customer_id = $1 WHERE invoice_id = $2",
    [customerId, invoiceId]
  );

exports.completeOrders = (client, tableId) =>
  client.query(
    `UPDATE orders SET status = 'COMPLETED' WHERE table_id = $1 AND status IN ${ACTIVE}`,
    [tableId]
  );

exports.setTableStatus = (client, tableId, status) =>
  client.query("UPDATE dining_tables SET status = $1, updated_at = NOW() WHERE table_id = $2", [
    status,
    tableId,
  ]);

// ---- Lich su hoa don (khach hang) ----
exports.getInvoiceHistory = (customerId) =>
  pool
    .query(
      `SELECT i.invoice_id AS id, i.invoice_code, i.amount, i.status, i.created_at, i.paid_at,
              c.name AS company_name, b.name AS branch_name
       FROM invoices i
       LEFT JOIN companies c ON i.company_id = c.company_id
       LEFT JOIN branches b ON i.branch_id = b.branch_id
       WHERE i.customer_id = $1 AND i.status = 'PAID'
       ORDER BY i.created_at DESC`,
      [customerId]
    )
    .then((r) => r.rows);

exports.getInvoiceById = (customerId, invoiceId) =>
  pool
    .query(
      `SELECT i.invoice_id AS id, i.invoice_code, i.amount, i.status, i.created_at, i.paid_at, i.items,
              c.name AS company_name, b.name AS branch_name
       FROM invoices i
       LEFT JOIN companies c ON i.company_id = c.company_id
       LEFT JOIN branches b ON i.branch_id = b.branch_id
       WHERE i.customer_id = $1 AND i.invoice_id = $2`,
      [customerId, invoiceId]
    )
    .then((r) => r.rows[0]);
