// src/modules/customer/reservation/reservation.repository.js
// Dat ban phia khach hang. Pham vi theo customer_id.
const pool = require("../../../config/db");

const BASE_SELECT = `
  SELECT r.reservation_id AS id, r.reservation_code, r.company_id, r.branch_id, r.table_id,
         r.customer_name, r.customer_phone, r.guest_count,
         r.reservation_date, r.reservation_time, r.status, r.note, r.created_at,
         r.deposit_amount, r.deposit_status,
         b.name AS branch_name, dt.table_number
  FROM reservations r
  JOIN branches b ON b.branch_id = r.branch_id
  LEFT JOIN dining_tables dt ON dt.table_id = r.table_id
`;

exports.findBranch = (branchId) =>
  pool
    .query(
      "SELECT branch_id AS id, company_id, name, opening_time, closing_time FROM branches WHERE branch_id = $1 AND status = 'ACTIVE'",
      [branchId]
    )
    .then((r) => r.rows[0]);

exports.getContact = (customerId) =>
  pool
    .query("SELECT full_name, phone, email FROM customers WHERE customer_id = $1", [customerId])
    .then((r) => r.rows[0]);

exports.create = (d) =>
  pool
    .query(
      `INSERT INTO reservations
         (reservation_code, company_id, branch_id, customer_id, customer_name, customer_phone,
          customer_email, guest_count, reservation_date, reservation_time, status, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDING',$11)
       RETURNING reservation_id AS id`,
      [d.reservation_code, d.company_id, d.branch_id, d.customer_id, d.customer_name, d.customer_phone,
       d.customer_email ?? null, d.guest_count, d.reservation_date, d.reservation_time, d.note ?? null]
    )
    .then((r) => r.rows[0].id);

exports.listByCustomer = (customerId) =>
  pool
    .query(`${BASE_SELECT} WHERE r.customer_id = $1 ORDER BY r.reservation_date DESC, r.reservation_time DESC`, [customerId])
    .then((r) => r.rows);

exports.findByIdForCustomer = (id, customerId) =>
  pool
    .query(`${BASE_SELECT} WHERE r.reservation_id = $1 AND r.customer_id = $2`, [id, customerId])
    .then((r) => r.rows[0]);

// Tra ve phieu theo id, khong gioi han theo customer (dung cho dat ban khach vang lai).
exports.findById = (id) =>
  pool
    .query(`${BASE_SELECT} WHERE r.reservation_id = $1`, [id])
    .then((r) => r.rows[0]);

// Xoa sach phieu dat + don dat truoc khi tru coc that bai (tranh de lai rac).
exports.cleanupReservation = async (id) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "DELETE FROM order_items WHERE order_id IN (SELECT order_id FROM orders WHERE reservation_id = $1)",
      [id]
    );
    await client.query("DELETE FROM orders WHERE reservation_id = $1", [id]);
    await client.query("DELETE FROM reservations WHERE reservation_id = $1", [id]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

exports.cancel = (id, customerId) =>
  pool
    .query(
      `UPDATE reservations SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW()
       WHERE reservation_id = $1 AND customer_id = $2 RETURNING reservation_id AS id`,
      [id, customerId]
    )
    .then((r) => r.rows[0]);
