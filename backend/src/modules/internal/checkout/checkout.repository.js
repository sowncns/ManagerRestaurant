// src/modules/internal/checkout/checkout.repository.js
// PK: dining_tables.table_id, orders.order_id, order_items.order_item_id,
//     invoices.invoice_id, menu_items.menu_item_id, voucher_templates.voucher_template_id,
//     customer_vouchers.customer_voucher_id.
const pool = require("../../../config/db");

const ACTIVE_STATUSES = "('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED')";

exports.lockTable = (client, tableId) =>
  client
    .query("SELECT *, table_id AS id FROM dining_tables WHERE table_id = $1 FOR UPDATE", [tableId])
    .then((r) => r.rows[0]);

// Chi cong mon con tinh tien: bo mon da huy (CANCELLED) va da void (VOIDED).
const BILLABLE = "oi.kitchen_status <> 'CANCELLED' AND oi.billing_status = 'BILLABLE'";

exports.sumOrderTotal = (client, tableId) =>
  client
    .query(
      `SELECT SUM(oi.unit_price * oi.quantity * (1 - oi.discount_percent / 100.0)) AS total
       FROM orders o JOIN order_items oi ON o.order_id = oi.order_id
       WHERE o.table_id = $1 AND o.status IN ${ACTIVE_STATUSES} AND ${BILLABLE}`,
      [tableId]
    )
    .then((r) => parseFloat(r.rows[0].total) || 0);

exports.fetchOrderItemsSnapshot = (client, tableId) =>
  client
    .query(
      `SELECT mi.name, oi.quantity, oi.unit_price AS price, oi.discount_percent,
              (oi.unit_price * oi.quantity * (1 - oi.discount_percent / 100.0)) AS line_total
       FROM orders o
       JOIN order_items oi ON o.order_id = oi.order_id
       JOIN menu_items mi ON oi.menu_item_id = mi.menu_item_id
       WHERE o.table_id = $1 AND o.status IN ${ACTIVE_STATUSES} AND ${BILLABLE}`,
      [tableId]
    )
    .then((r) => r.rows);

// ---- Kiem mon (pre-bill): mon con tinh tien + vat tung mon (tu menu_items) ----
exports.fetchKiemMonItems = (tableId) =>
  pool
    .query(
      `SELECT mi.name AS item_name, oi.quantity, oi.unit_price, oi.discount_percent,
              (oi.unit_price * oi.quantity * (1 - oi.discount_percent / 100.0)) AS line_total, mi.vat
       FROM orders o
       JOIN order_items oi ON o.order_id = oi.order_id
       JOIN menu_items mi ON oi.menu_item_id = mi.menu_item_id
       WHERE o.table_id = $1 AND o.status IN ${ACTIVE_STATUSES} AND ${BILLABLE}
       ORDER BY mi.name`,
      [tableId]
    )
    .then((r) => r.rows);

// ---- Void mon (nham lan) ----
exports.lockOrderItemForVoid = (client, orderItemId, companyId, branchId) =>
  client
    .query(
      `SELECT oi.order_item_id, oi.order_id, oi.item_name, oi.quantity, oi.total_price,
              oi.unit_price, oi.billing_status, oi.kitchen_status,
              o.status AS order_status, b.void_pin_threshold
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       JOIN branches b ON b.branch_id = o.branch_id
       WHERE oi.order_item_id = $1 AND o.company_id = $2 AND o.branch_id = $3
       FOR UPDATE OF oi`,
      [orderItemId, companyId, branchId]
    )
    .then((r) => r.rows[0]);

exports.setItemDiscount = (client, orderItemId, discountPercent) =>
  client.query(
    "UPDATE order_items SET discount_percent = $2 WHERE order_item_id = $1",
    [orderItemId, discountPercent]
  );

exports.setItemQuantity = (client, orderItemId, quantity, totalPrice) =>
  client.query(
    "UPDATE order_items SET quantity = $2, total_price = $3 WHERE order_item_id = $1",
    [orderItemId, quantity, totalPrice]
  );

exports.setItemVoided = (client, orderItemId, voidedBy) =>
  client.query(
    `UPDATE order_items SET billing_status = 'VOIDED', voided_by = $2, voided_at = NOW()
     WHERE order_item_id = $1`,
    [orderItemId, voidedBy]
  );

exports.insertInvoice = (client, inv) =>
  client
    .query(
      `INSERT INTO invoices (invoice_code, company_id, branch_id, table_id, amount, status, customer_id, items)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING invoice_id AS id, invoice_code, amount, status, customer_id`,
      [inv.invoice_code, inv.company_id, inv.branch_id, inv.table_id, inv.amount, inv.status, inv.customer_id, inv.items]
    )
    .then((r) => r.rows[0]);

exports.markCustomerVoucherUsed = (client, id) =>
  client.query("UPDATE customer_vouchers SET status = 'used', used_at = NOW() WHERE customer_voucher_id = $1", [id]);

// Tim phieu dat con giu coc (HELD) gan voi ban qua don dang mo.
exports.findHeldDepositByTable = (client, tableId) =>
  client
    .query(
      `SELECT DISTINCT r.reservation_id AS id, r.deposit_amount, r.customer_id
       FROM reservations r
       JOIN orders o ON o.reservation_id = r.reservation_id
       WHERE o.table_id = $1 AND o.status IN ${ACTIVE_STATUSES} AND r.deposit_status = 'HELD'
       LIMIT 1`,
      [tableId]
    )
    .then((r) => r.rows[0]);

exports.markDepositApplied = (client, reservationId) =>
  client.query(
    "UPDATE reservations SET deposit_status = 'APPLIED', updated_at = NOW() WHERE reservation_id = $1",
    [reservationId]
  );

// Hoan tien ve vi (dung khi coc thua so voi hoa don).
exports.refundToWallet = async (client, { customerId, amount, reservationId, description }) => {
  const w = await client.query(
    "SELECT wallet_id AS id, balance FROM customer_wallets WHERE customer_id = $1 FOR UPDATE",
    [customerId]
  );
  const wallet = w.rows[0];
  if (!wallet) return;
  const before = parseFloat(wallet.balance);
  const after = before + amount;
  await client.query("UPDATE customer_wallets SET balance = $1 WHERE customer_id = $2", [after, customerId]);
  await client.query(
    `INSERT INTO wallet_transactions
       (wallet_id, transaction_code, transaction_type, amount, balance_before, balance_after,
        reference_type, reference_id, description, status)
     VALUES ($1,$2,'REFUND',$3,$4,$5,'REFUND',$6,$7,'SUCCESS')`,
    [wallet.id, `REF-${Date.now()}`, amount, before, after, reservationId, description]
  );
};

exports.completeOrders = (client, tableId) =>
  client.query(
    `UPDATE orders SET status = 'COMPLETED' WHERE table_id = $1 AND status IN ${ACTIVE_STATUSES}`,
    [tableId]
  );

exports.setTableStatus = (client, tableId, status) =>
  client.query("UPDATE dining_tables SET status = $1, updated_at = NOW() WHERE table_id = $2", [
    status,
    tableId,
  ]);

// ---- Voucher ----
exports.findVoucherTemplate = (code) =>
  pool
    .query(
      `SELECT *, voucher_template_id AS id FROM voucher_templates
       WHERE code = $1 AND status = 'active' AND start_date <= NOW() AND end_date >= NOW()`,
      [code]
    )
    .then((r) => r.rows[0]);

exports.findCustomerVoucher = (customerId, templateId) =>
  pool
    .query(
      `SELECT *, customer_voucher_id AS id FROM customer_vouchers
       WHERE customer_id = $1 AND voucher_template_id = $2 AND status = 'unused'`,
      [customerId, templateId]
    )
    .then((r) => r.rows[0]);

// ---- PayOS doi soat hoa don (chuyen khoan) ----
exports.insertInvoicePayment = (client, { orderCode, invoiceId, amount }) =>
  client.query(
    `INSERT INTO invoice_payments (order_code, invoice_id, amount, status)
     VALUES ($1, $2, $3, 'PENDING')`,
    [orderCode, invoiceId, amount]
  );

exports.lockInvoicePaymentByOrderCode = (client, orderCode) =>
  client
    .query("SELECT * FROM invoice_payments WHERE order_code = $1 FOR UPDATE", [orderCode])
    .then((r) => r.rows[0]);

exports.setInvoicePaymentStatus = (client, orderCode, status) =>
  client.query(
    "UPDATE invoice_payments SET status = $1, updated_at = NOW() WHERE order_code = $2",
    [status, orderCode]
  );

exports.lockInvoiceById = (client, invoiceId) =>
  client
    .query(
      "SELECT invoice_id AS id, table_id, customer_id, amount, status FROM invoices WHERE invoice_id = $1 FOR UPDATE",
      [invoiceId]
    )
    .then((r) => r.rows[0]);

exports.markInvoicePaidById = (client, invoiceId) =>
  client.query("UPDATE invoices SET status = 'PAID', paid_at = NOW() WHERE invoice_id = $1", [invoiceId]);

// ---- Hoa don moi nhat ----
exports.findLatestPaidInvoice = (tableId) =>
  pool
    .query(
      `SELECT i.invoice_id AS id, i.invoice_code, i.amount, i.amount AS final_amount, i.status, i.created_at, i.paid_at,
              dt.table_number, dt.table_name
       FROM invoices i
       JOIN dining_tables dt ON i.table_id = dt.table_id
       WHERE i.table_id = $1 AND i.status = 'PAID'
       ORDER BY i.created_at DESC LIMIT 1`,
      [tableId]
    )
    .then((r) => r.rows[0]);

exports.findCompletedItems = (tableId) =>
  pool
    .query(
      `SELECT oi.item_name, oi.quantity, oi.unit_price, oi.total_price
       FROM orders o JOIN order_items oi ON o.order_id = oi.order_id
       WHERE o.table_id = $1 AND o.status = 'COMPLETED'
       ORDER BY oi.order_item_id ASC`,
      [tableId]
    )
    .then((r) => r.rows);

exports.listInvoices = (currentUser, filters = {}) => {
  let query = `
    SELECT i.invoice_id AS id, i.invoice_code, i.amount, i.status, i.created_at, i.customer_id,
           t.table_name, t.table_number, u.full_name AS customer_name, u.phone AS customer_phone
    FROM invoices i
    LEFT JOIN dining_tables t ON i.table_id = t.table_id
    LEFT JOIN users u ON i.customer_id = u.id
    WHERE i.company_id = $1
  `;
  let values = [currentUser.company_id];
  let idx = 2;
  
  if (currentUser.role === "BRANCH_MANAGER" || currentUser.role === "CASHIER" || currentUser.role === "WAITER") {
    query += ` AND i.branch_id = $${idx++}`;
    values.push(currentUser.branch_id);
  } else if (filters.branchId) {
    query += ` AND i.branch_id = $${idx++}`;
    values.push(filters.branchId);
  }
  
  if (filters.status) {
    query += ` AND i.status = $${idx++}`;
    values.push(filters.status);
  }
  
  query += ` ORDER BY i.created_at DESC LIMIT 100`;
  return pool.query(query, values).then(r => r.rows);
};

exports.markInvoicePaid = (invoiceId) => {
  return pool.query("UPDATE invoices SET status = 'PAID', updated_at = NOW() WHERE invoice_id = $1 RETURNING *", [invoiceId]);
};
