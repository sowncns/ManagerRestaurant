// src/modules/internal/reservation/reservation.repository.js
// PK: reservations.reservation_id (alias AS id). Scope theo branches.company_id / branch_id.
const pool = require("../../../config/db");

const BASE_SELECT = `
  SELECT r.reservation_id AS id, r.reservation_code, r.branch_id, r.table_id, r.customer_id,
         r.customer_name, r.customer_phone, r.customer_email, r.guest_count,
         r.reservation_date, r.reservation_time, r.status, r.note, r.special_request,
         r.checked_in_by, r.checked_in_at, r.created_by, r.created_at, r.updated_at,
         r.deposit_amount, r.deposit_status,
         b.name AS branch_name, b.company_id,
         dt.table_number, dt.table_name
  FROM reservations r
  JOIN branches b ON b.branch_id = r.branch_id
  LEFT JOIN dining_tables dt ON dt.table_id = r.table_id
`;

// scopeWhere sinh boi buildScopedBranchWhere (alias "b"); filters bo sung noi tiep.
exports.list = (scopeWhere, values, extra = "") =>
  pool
    .query(
      `${BASE_SELECT} ${scopeWhere} ${extra}
       ORDER BY r.reservation_date DESC, r.reservation_time DESC, r.created_at DESC`,
      values
    )
    .then((r) => r.rows);

exports.findById = (id) =>
  pool.query(`${BASE_SELECT} WHERE r.reservation_id = $1`, [id]).then((r) => r.rows[0]);

exports.findBranch = (branchId) =>
  pool
    .query("SELECT branch_id AS id, company_id, name FROM branches WHERE branch_id = $1", [branchId])
    .then((r) => r.rows[0]);

// Lay gio mo/dong cua de validate gio dat ban.
exports.getOpenHours = (branchId) =>
  pool
    .query("SELECT opening_time, closing_time FROM branches WHERE branch_id = $1", [branchId])
    .then((r) => r.rows[0]);

exports.findTable = (tableId) =>
  pool
    .query("SELECT table_id AS id, branch_id, status, capacity FROM dining_tables WHERE table_id = $1", [tableId])
    .then((r) => r.rows[0]);

// Goi y 1 ban trong phu hop (du cho, khong trung phieu dat khac quanh gio hen).
const SLOT_MINUTES = 120; // 2 gio: 2 lich cung ban phai cach nhau >= 2h
exports.suggestFreeTable = (branchId, guestCount, date, time) =>
  pool
    .query(
      `SELECT dt.table_id AS id, dt.table_number, dt.capacity
       FROM dining_tables dt
       WHERE dt.branch_id = $1 AND dt.capacity >= $2
         AND dt.status NOT IN ('DISABLE','DELETED')
         AND NOT EXISTS (
           SELECT 1 FROM reservations r
           WHERE r.table_id = dt.table_id AND r.reservation_date = $3
             AND r.status IN ('PENDING','CONFIRMED','CHECKED_IN')
             AND ABS(EXTRACT(EPOCH FROM (r.reservation_time - $4::time))) < $5 * 60
         )
       ORDER BY dt.capacity ASC, dt.table_number ASC
       LIMIT 1`,
      [branchId, guestCount, date, time, SLOT_MINUTES]
    )
    .then((r) => r.rows[0]);

// Kiem tra ban da co phieu dat khac trung khung gio (+-90') cung ngay chua.
exports.hasReservationConflict = (tableId, date, time, excludeId = 0) =>
  pool
    .query(
      `SELECT 1 FROM reservations
       WHERE table_id = $1 AND reservation_date = $2
         AND status IN ('PENDING','CONFIRMED','CHECKED_IN')
         AND reservation_id <> $3
         AND ABS(EXTRACT(EPOCH FROM (reservation_time - $4::time))) < $5 * 60
       LIMIT 1`,
      [tableId, date, excludeId, time, SLOT_MINUTES]
    )
    .then((r) => r.rowCount > 0);

exports.assign = (id, tableId) =>
  pool
    .query(
      "UPDATE reservations SET table_id = $2, status = 'CONFIRMED', updated_at = NOW() WHERE reservation_id = $1 RETURNING reservation_id AS id",
      [id, tableId]
    )
    .then((r) => r.rows[0]);

// ----- Trong transaction (check-in) -----
exports.lockForCheckin = (db, id) =>
  db
    .query("SELECT reservation_id AS id, company_id, branch_id, table_id, status FROM reservations WHERE reservation_id = $1 FOR UPDATE", [id])
    .then((r) => r.rows[0]);

exports.checkinTx = (db, id, tableId, staffId) =>
  db.query(
    `UPDATE reservations SET table_id = $2, status = 'CHECKED_IN',
       checked_in_by = $3, checked_in_at = NOW(), updated_at = NOW()
     WHERE reservation_id = $1`,
    [id, tableId, staffId]
  );

exports.setTableStatus = (db, tableId, status) =>
  db.query("UPDATE dining_tables SET status = $1, updated_at = NOW() WHERE table_id = $2", [status, tableId]);

// ----- Canh bao truoc gio hen -----
exports.findAlerts = (currentUser, windowMinutes) => {
  const values = [windowMinutes];
  let scope = "";
  if (currentUser.role === "COMPANY_ADMIN") { values.push(currentUser.company_id); scope = `AND b.company_id = $${values.length}`; }
  else if (currentUser.role !== "SUPER_ADMIN") { values.push(currentUser.branch_id); scope = `AND b.branch_id = $${values.length}`; }
  return pool
    .query(
      `SELECT r.reservation_id AS id, r.reservation_code, r.customer_name, r.customer_phone,
              r.guest_count, r.reservation_date, r.reservation_time, r.status, r.table_id,
              b.branch_id, b.name AS branch_name, b.company_id,
              dt.table_number, dt.status AS table_status,
              ROUND(EXTRACT(EPOCH FROM (r.reservation_time - LOCALTIME)) / 60)::int AS minutes_until,
              (SELECT COUNT(*) FROM dining_tables f
                 WHERE f.branch_id = r.branch_id AND f.status = 'AVAILABLE' AND f.capacity >= r.guest_count)::int AS free_tables
       FROM reservations r
       JOIN branches b ON b.branch_id = r.branch_id
       LEFT JOIN dining_tables dt ON dt.table_id = r.table_id
       WHERE r.reservation_date = CURRENT_DATE
         AND r.status IN ('PENDING','CONFIRMED')
         AND r.reservation_time <= (LOCALTIME + make_interval(mins => $1))
         AND r.reservation_time >= (LOCALTIME - interval '60 minutes')
         ${scope}
       ORDER BY r.reservation_time ASC`,
      values
    )
    .then((r) => r.rows);
};

exports.create = (data) =>
  pool
    .query(
      `INSERT INTO reservations
         (reservation_code, company_id, branch_id, table_id, customer_id,
          customer_name, customer_phone, customer_email,
          guest_count, reservation_date, reservation_time, status, note, special_request, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12,'CONFIRMED'),$13,$14,$15)
       RETURNING reservation_id AS id`,
      [
        data.reservation_code, data.company_id, data.branch_id, data.table_id ?? null, data.customer_id ?? null,
        data.customer_name, data.customer_phone, data.customer_email ?? null,
        data.guest_count ?? 1, data.reservation_date, data.reservation_time, data.status ?? null,
        data.note ?? null, data.special_request ?? null, data.created_by ?? null,
      ]
    )
    .then((r) => r.rows[0].id);

exports.remove = (id) =>
  pool.query("DELETE FROM reservations WHERE reservation_id = $1", [id]);

exports.update = (id, fields) => {
  const cols = [];
  const values = [];
  for (const [key, val] of Object.entries(fields)) {
    values.push(val);
    cols.push(`${key} = $${values.length}`);
  }
  if (cols.length === 0) return exports.findById(id);
  values.push(id);
  return pool
    .query(
      `UPDATE reservations SET ${cols.join(", ")}, updated_at = NOW()
       WHERE reservation_id = $${values.length} RETURNING reservation_id AS id`,
      values
    )
    .then((r) => r.rows[0]);
};

// Check-in: gan ban (neu co) + chuyen CHECKED_IN, ghi nguoi/thoi diem.
exports.checkin = (id, tableId, staffId) => {
  const values = [staffId];
  let setTable = "";
  if (tableId != null) {
    values.push(tableId);
    setTable = `table_id = $${values.length},`;
  }
  values.push(id);
  return pool
    .query(
      `UPDATE reservations
       SET ${setTable} status = 'CHECKED_IN', checked_in_by = $1, checked_in_at = NOW(), updated_at = NOW()
       WHERE reservation_id = $${values.length} RETURNING reservation_id AS id`,
      values
    )
    .then((r) => r.rows[0]);
};
