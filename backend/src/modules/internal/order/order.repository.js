// src/modules/internal/order/order.repository.js
// PK: orders.order_id, order_items.order_item_id, dining_tables.table_id,
//     menu_items.menu_item_id, employees.employee_id, customers.customer_id.
const pool = require("../../../config/db");
const _pool = pool;

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED"];
exports.ACTIVE_STATUSES = ACTIVE_STATUSES;

exports.findTable = (db, tableId, branchId) =>
  db
    .query("SELECT table_id AS id, status FROM dining_tables WHERE table_id = $1 AND branch_id = $2", [
      tableId,
      branchId,
    ])
    .then((r) => r.rows[0]);

exports.checkinReservation = (db, tableId, waiterId) =>
  db.query(
    `UPDATE reservations
     SET status = 'CHECKED_IN', checked_in_by = $1, checked_in_at = NOW()
     WHERE table_id = $2 AND status = 'CONFIRMED'`,
    [waiterId, tableId]
  );

exports.findActiveOrderId = (db, tableId) =>
  db
    .query(
      `SELECT order_id AS id FROM orders
       WHERE table_id = $1 AND status = ANY($2::text[]) LIMIT 1`,
      [tableId, ACTIVE_STATUSES]
    )
    .then((r) => r.rows[0]);

exports.findMenuItems = (db, menuIds) =>
  db
    .query(
      "SELECT menu_item_id AS id, name, price, vat, status, is_available FROM menu_items WHERE menu_item_id = ANY($1::int[])",
      [menuIds]
    )
    .then((r) => r.rows);

exports.insertOrder = (db, o) =>
  db
    .query(
      `INSERT INTO orders (order_code, company_id, branch_id, table_id, waiter_id,
                           subtotal, vat_amount, total_amount, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *, order_id AS id`,
      [o.order_code, o.company_id, o.branch_id, o.table_id, o.waiter_id, o.subtotal, o.vat_amount, o.total_amount, o.note]
    )
    .then((r) => r.rows[0]);

// Don DAT TRUOC (pre-order): status=SCHEDULED, CHUA gan ban/nhan vien.
exports.insertPreOrder = (db, o) =>
  db
    .query(
      `INSERT INTO orders (order_code, company_id, branch_id, customer_id, reservation_id,
                           guest_count, subtotal, vat_amount, total_amount, note, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'SCHEDULED') RETURNING *, order_id AS id`,
      [o.order_code, o.company_id, o.branch_id, o.customer_id ?? null, o.reservation_id,
       o.guest_count ?? 1, o.subtotal, o.vat_amount, o.total_amount, o.note ?? null]
    )
    .then((r) => r.rows[0]);

exports.findScheduledByReservation = (db, reservationId) =>
  db
    .query("SELECT *, order_id AS id FROM orders WHERE reservation_id = $1 AND status = 'SCHEDULED' LIMIT 1", [reservationId])
    .then((r) => r.rows[0]);

// Kich hoat don dat truoc khi check-in: gan ban + nhan vien, chuyen SCHEDULED -> CONFIRMED.
exports.activateScheduledOrder = (db, reservationId, tableId, waiterId) =>
  db
    .query(
      `UPDATE orders SET table_id = $2, waiter_id = $3, status = 'CONFIRMED', updated_at = NOW()
       WHERE reservation_id = $1 AND status = 'SCHEDULED' RETURNING order_id AS id`,
      [reservationId, tableId, waiterId]
    )
    .then((r) => r.rows[0]);

// Gan bàn cho don dat truoc (khi le tan gan ban cho phieu) — van giu SCHEDULED.
exports.setScheduledOrderTable = (db, reservationId, tableId) =>
  db.query(
    "UPDATE orders SET table_id = $2, updated_at = NOW() WHERE reservation_id = $1 AND status = 'SCHEDULED'",
    [reservationId, tableId]
  );

// Huy don dat truoc (khi khach khong den).
exports.cancelScheduledOrder = (db, reservationId) =>
  db.query(
    "UPDATE orders SET status = 'CANCELLED', updated_at = NOW() WHERE reservation_id = $1 AND status = 'SCHEDULED'",
    [reservationId]
  );

// Danh sach don dat truoc DA GAN BAN (bep xem de duyet). Kem mon + gio hen + ban.
exports.findPreordersWithTable = (companyId, branchId) =>
  pool
    .query(
      `SELECT o.order_id, o.reservation_id, o.table_id,
              dt.table_number,
              r.reservation_date, r.reservation_time, r.customer_name,
              COALESCE(
                json_agg(
                  json_build_object('item_name', oi.item_name, 'quantity', oi.quantity, 'note', oi.note)
                  ORDER BY oi.order_item_id
                ) FILTER (WHERE oi.order_item_id IS NOT NULL),
                '[]'
              ) AS items
       FROM orders o
       JOIN reservations r ON r.reservation_id = o.reservation_id
       JOIN dining_tables dt ON dt.table_id = o.table_id
       LEFT JOIN order_items oi ON oi.order_id = o.order_id
       WHERE o.status = 'SCHEDULED' AND o.table_id IS NOT NULL
         AND o.company_id = $1 AND o.branch_id = $2
       GROUP BY o.order_id, dt.table_number, r.reservation_date, r.reservation_time, r.customer_name
       ORDER BY r.reservation_date, r.reservation_time`,
      [companyId, branchId]
    )
    .then((res) => res.rows);

exports.findTableName = (db, tableId) =>
  db
    .query("SELECT table_number, table_name FROM dining_tables WHERE table_id = $1", [tableId])
    .then((r) => r.rows[0]);

exports.findReservationTime = (db, reservationId) =>
  db
    .query("SELECT reservation_date, reservation_time FROM reservations WHERE reservation_id = $1", [reservationId])
    .then((r) => r.rows[0]);

// servedBy: nhan vien them cac mon nay (NULL cho don dat truoc chua gan nhan vien).
// Cung 1 lan goi thi tat ca mon do cung 1 nguoi phuc vu -> truyen scalar $10.
exports.bulkInsertOrderItems = (db, orderId, items, servedBy = null) =>
  db.query(
    `INSERT INTO order_items (order_id, menu_item_id, item_name, unit_price, quantity,
                              total_price, vat_rate, vat_amount, note, served_by, created_at)
     SELECT $1, m_id, item_name, unit_price, quantity, total_price, vat_rate, vat_amount, note, $10, NOW()
     FROM UNNEST($2::int[], $3::text[], $4::numeric[], $5::int[],
                 $6::numeric[], $7::numeric[], $8::numeric[], $9::text[])
       AS t(m_id, item_name, unit_price, quantity, total_price, vat_rate, vat_amount, note)`,
    [
      orderId,
      items.map((i) => i.menu_item_id),
      items.map((i) => i.item_name),
      items.map((i) => i.unit_price),
      items.map((i) => i.quantity),
      items.map((i) => i.total_price),
      items.map((i) => i.vat_rate),
      items.map((i) => i.vat_amount),
      items.map((i) => i.note),
      servedBy ?? null,
    ]
  );

exports.setTableStatus = (db, tableId, status) =>
  db.query("UPDATE dining_tables SET status = $1 WHERE table_id = $2", [status, tableId]);

exports.findOrderDetail = (db, orderId) =>
  db
    .query(
      `SELECT o.*, o.order_id AS id, dt.table_number, e.full_name AS waiter_name
       FROM orders o
       JOIN dining_tables dt ON dt.table_id = o.table_id
       JOIN employees e ON e.employee_id = o.waiter_id
       WHERE o.order_id = $1`,
      [orderId]
    )
    .then((r) => r.rows[0]);

exports.findOrderScoped = (db, orderId, companyId, branchId) =>
  db
    .query(
      `SELECT o.*, o.order_id AS id, dt.table_number, e.full_name AS waiter_name
       FROM orders o
       JOIN dining_tables dt ON dt.table_id = o.table_id
       JOIN employees e ON e.employee_id = o.waiter_id
       WHERE o.order_id = $1 AND o.company_id = $2 AND o.branch_id = $3`,
      [orderId, companyId, branchId]
    )
    .then((r) => r.rows[0]);

exports.findOrderById = (db, orderId, companyId, branchId) =>
  db
    .query("SELECT *, order_id AS id FROM orders WHERE order_id = $1 AND company_id = $2 AND branch_id = $3", [
      orderId,
      companyId,
      branchId,
    ])
    .then((r) => r.rows[0]);

exports.findOrderItems = (db, orderId) =>
  db
    .query("SELECT *, order_item_id AS id FROM order_items WHERE order_id = $1 ORDER BY order_item_id", [orderId])
    .then((r) => r.rows);

exports.findOrderItemsWithMenu = (db, orderId) =>
  db
    .query(
      `SELECT oi.*, oi.order_item_id AS id, mi.name AS item_name,
              e.full_name AS served_by_name,
              EXISTS (
                SELECT 1 FROM cancel_requests cr 
                WHERE cr.order_item_id = oi.order_item_id 
                AND cr.status = 'PENDING'
              ) AS has_pending_cancel
       FROM order_items oi
       JOIN menu_items mi ON mi.menu_item_id = oi.menu_item_id
       LEFT JOIN employees e ON e.employee_id = oi.served_by
       WHERE oi.order_id = $1`,
      [orderId]
    )
    .then((r) => r.rows);

exports.updateOrderTotals = (db, orderId, addedAmount, addedVat) =>
  db.query(
    `UPDATE orders
     SET subtotal = subtotal + $1, vat_amount = vat_amount + $2,
         total_amount = total_amount + $1 + $2
     WHERE order_id = $3`,
    [addedAmount, addedVat, orderId]
  );

exports.findActiveOrderScoped = (tableId, companyId, branchId) =>
  _pool
    .query(
      `SELECT order_id AS id FROM orders
       WHERE table_id = $1 AND company_id = $2 AND branch_id = $3
         AND status = ANY($4::text[]) LIMIT 1`,
      [tableId, companyId, branchId, ACTIVE_STATUSES]
    )
    .then((r) => r.rows[0]);

// ---- Quet QR thanh vien ----
exports.findCustomerByQR = (code) =>
  _pool
    .query(
      `SELECT customer_id AS id, full_name, phone, rank, points
       FROM customers WHERE (customer_id::text = $1 OR phone = $1) AND status = 'active'`,
      [code]
    )
    .then((r) => r.rows[0]);

exports.findActiveWalletBalance = (customerId) =>
  _pool
    .query("SELECT balance FROM customer_wallets WHERE customer_id = $1 AND status = 'ACTIVE'", [
      customerId,
    ])
    .then((r) => (r.rowCount > 0 ? parseFloat(r.rows[0].balance) : 0));

exports.findOrderForScan = (orderId, companyId, branchId) =>
  _pool
    .query(
      `SELECT subtotal, total_amount, table_id, status
       FROM orders WHERE order_id = $1 AND company_id = $2 AND branch_id = $3`,
      [orderId, companyId, branchId]
    )
    .then((r) => r.rows[0]);

// ---- Bep (kitchen_status) ----
exports.lockOrderItemScoped = (client, orderItemId, companyId, branchId) =>
  client
    .query(
      `SELECT oi.order_item_id AS id, oi.order_id, oi.menu_item_id, oi.quantity,
              oi.kitchen_status, oi.item_name, mi.kitchen_type_id
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       LEFT JOIN menu_items mi ON mi.menu_item_id = oi.menu_item_id
       WHERE oi.order_item_id = $1 AND o.company_id = $2 AND o.branch_id = $3
       FOR UPDATE OF oi`,
      [orderItemId, companyId, branchId]
    )
    .then((r) => r.rows[0]);

exports.updateItemKitchenStatus = (client, orderItemId, status) => {
  if (status === 'READY') {
    return client.query("UPDATE order_items SET kitchen_status = $1, ready_at = NOW() WHERE order_item_id = $2", [status, orderItemId]);
  }
  return client.query("UPDATE order_items SET kitchen_status = $1 WHERE order_item_id = $2", [status, orderItemId]);
};

exports.findWaitingItems = (client, orderId, companyId, branchId) =>
  client
    .query(
      `SELECT oi.order_item_id AS id, oi.menu_item_id, oi.quantity
       FROM order_items oi JOIN orders o ON o.order_id = oi.order_id
       WHERE oi.order_id = $1 AND o.company_id = $2 AND o.branch_id = $3 AND oi.kitchen_status = 'WAITING'
       FOR UPDATE OF oi`,
      [orderId, companyId, branchId]
    )
    .then((r) => r.rows);

exports.findKitchenHistory = (companyId, branchId, kitchenTypeId = null, limit = 50) =>
  pool
    .query(
      `SELECT oi.order_item_id AS id, oi.order_id, oi.menu_item_id, oi.item_name,
              oi.quantity, oi.kitchen_status, oi.note, oi.created_at, oi.ready_at,
              o.order_code, dt.table_number,
              mi.kitchen_type_id, kt.code AS kitchen_type_code, kt.name AS kitchen_type_name
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       JOIN dining_tables dt ON dt.table_id = o.table_id
       LEFT JOIN menu_items mi ON mi.menu_item_id = oi.menu_item_id
       LEFT JOIN kitchen_types kt ON kt.kitchen_type_id = mi.kitchen_type_id
       WHERE o.company_id = $1 AND o.branch_id = $2 
         AND oi.kitchen_status IN ('READY', 'SERVED')
         AND oi.created_at >= NOW() - INTERVAL '24 HOURS'
         AND ($3::int IS NULL OR mi.kitchen_type_id = $3)
       ORDER BY oi.created_at DESC LIMIT $4`,
      [companyId, branchId, kitchenTypeId, limit]
    )
    .then((r) => r.rows);

// Hang doi bep. Neu truyen kitchenTypeId (nhan vien bep gan 1 loai) -> chi lay mon
// dung loai bep do. Managers khong gan loai -> null -> thay tat ca.
// Lay ca WAITING (cho nau) va READY (da xong, cho phuc vu bung).
exports.findKitchenQueue = (companyId, branchId, kitchenTypeId = null) =>
  pool
    .query(
      `SELECT oi.order_item_id AS id, oi.order_id, oi.menu_item_id, oi.item_name,
              oi.quantity, oi.kitchen_status, oi.note, oi.created_at, oi.ready_at,
              o.order_code, dt.table_number,
              mi.kitchen_type_id, kt.code AS kitchen_type_code, kt.name AS kitchen_type_name
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       JOIN dining_tables dt ON dt.table_id = o.table_id
       LEFT JOIN menu_items mi ON mi.menu_item_id = oi.menu_item_id
       LEFT JOIN kitchen_types kt ON kt.kitchen_type_id = mi.kitchen_type_id
       WHERE o.company_id = $1 AND o.branch_id = $2 AND o.status = ANY($3::text[])
         AND oi.kitchen_status IN ('WAITING','READY')
         AND ($4::int IS NULL OR mi.kitchen_type_id = $4)
       ORDER BY oi.created_at ASC`,
      [companyId, branchId, ACTIVE_STATUSES, kitchenTypeId]
    )
    .then((r) => r.rows);

exports.findUnusedVouchers = (customerId) =>
  _pool
    .query(
      `SELECT cv.customer_voucher_id, vt.voucher_template_id AS template_id, vt.code, vt.name,
              vt.description, vt.discount_type, vt.discount_value, vt.min_order_amount,
              vt.max_discount_amount, vt.end_date
       FROM customer_vouchers cv
       JOIN voucher_templates vt ON cv.voucher_template_id = vt.voucher_template_id
       WHERE cv.customer_id = $1 AND cv.status = 'unused' AND vt.status = 'active'
         AND vt.start_date <= NOW() AND vt.end_date >= NOW()`,
      [customerId]
    )
    .then((r) => r.rows);
