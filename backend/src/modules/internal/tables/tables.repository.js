// src/modules/internal/tables/tables.repository.js
// PK: dining_tables.table_id, branch_sections.section_id, branches.branch_id,
//     reservations.reservation_id, employees.employee_id. (alias AS id cho mapper)
const pool = require("../../../config/db");
const { buildScopedBranchWhere } = require("../../../shared/utils/permission");

const ACTIVE_ORDER_STATUSES = "('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED')";

const UPCOMING_RES_JOIN = `
  LEFT JOIN (
    SELECT DISTINCT ON (table_id) table_id, reservation_id, customer_name, reservation_time, guest_count
    FROM reservations
    WHERE reservation_date = CURRENT_DATE AND status = 'CONFIRMED'
    ORDER BY table_id, reservation_time ASC
  ) upcoming_reservations ON upcoming_reservations.table_id = dt.table_id`;

const TABLE_SELECT = `
  SELECT dt.*, dt.table_id AS id, b.name AS branch_name, b.company_id, bs.name AS section_name,
         upcoming_reservations.reservation_id, upcoming_reservations.customer_name AS res_customer_name,
         upcoming_reservations.reservation_time AS res_time, upcoming_reservations.guest_count AS res_guest_count
  FROM dining_tables dt
  JOIN branches b ON b.branch_id = dt.branch_id
  LEFT JOIN branch_sections bs ON bs.section_id = dt.section_id
  ${UPCOMING_RES_JOIN}`;

const TABLE_ORDER_BY = `
  ORDER BY bs.name ASC NULLS LAST, LENGTH(dt.table_number) ASC, dt.table_number ASC, dt.created_at DESC`;

const SECTION_SELECT = `
  SELECT bs.*, bs.section_id AS id, b.name AS branch_name, b.company_id
  FROM branch_sections bs JOIN branches b ON b.branch_id = bs.branch_id`;

// ---------------- Branches ----------------
exports.findBranchById = (branchId) =>
  pool
    .query("SELECT branch_id AS id, company_id FROM branches WHERE branch_id = $1", [branchId])
    .then((r) => r.rows[0]);

// ---------------- Sections ----------------
exports.findSectionsScoped = (currentUser) => {
  const values = [];
  const where = buildScopedBranchWhere(currentUser, values, "b");
  return pool
    .query(`${SECTION_SELECT} ${where} ORDER BY bs.created_at DESC`, values)
    .then((r) => r.rows);
};

exports.findSectionsByBranch = (branchId) =>
  pool
    .query(`${SECTION_SELECT} WHERE bs.branch_id = $1 ORDER BY bs.created_at DESC`, [branchId])
    .then((r) => r.rows);

exports.findSectionById = (sectionId) =>
  pool.query(`${SECTION_SELECT} WHERE bs.section_id = $1`, [sectionId]).then((r) => r.rows[0]);

exports.insertSection = (branch_id, name, section_type) =>
  pool
    .query(
      `INSERT INTO branch_sections (branch_id, name, section_type, status)
       VALUES ($1, $2, $3, 'ACTIVE') RETURNING section_id AS id`,
      [branch_id, name, section_type || "area"]
    )
    .then((r) => r.rows[0].id);

exports.updateSectionFields = (sectionId, fields) => {
  const cols = Object.keys(fields);
  if (cols.length === 0) return Promise.resolve();
  const set = cols.map((c, i) => `${c} = $${i + 1}`);
  const values = cols.map((c) => fields[c]);
  values.push(new Date());
  set.push(`updated_at = $${values.length}`);
  values.push(sectionId);
  return pool.query(
    `UPDATE branch_sections SET ${set.join(", ")} WHERE section_id = $${values.length}`,
    values
  );
};

exports.updateSectionStatus = (sectionId, status) =>
  pool.query("UPDATE branch_sections SET status = $1, updated_at = $2 WHERE section_id = $3", [
    status,
    new Date(),
    sectionId,
  ]);

// ---------------- Tables ----------------
exports.findTablesScoped = (currentUser) => {
  const values = [];
  const where = buildScopedBranchWhere(currentUser, values, "b");
  return pool
    .query(
      `SELECT dt.*, dt.table_id AS id, b.name AS branch_name, b.company_id, bs.name AS section_name,
              e.full_name AS active_waiter_name, active_orders.total_amount AS active_order_amount, active_orders.order_id AS active_order_id,
              upcoming_reservations.reservation_id, upcoming_reservations.customer_name AS res_customer_name,
              upcoming_reservations.reservation_time AS res_time, upcoming_reservations.guest_count AS res_guest_count
       FROM dining_tables dt
       JOIN branches b ON b.branch_id = dt.branch_id
       LEFT JOIN branch_sections bs ON bs.section_id = dt.section_id
       LEFT JOIN (
         SELECT DISTINCT ON (table_id) table_id, waiter_id, total_amount, order_id
         FROM orders WHERE status IN ${ACTIVE_ORDER_STATUSES}
         ORDER BY table_id, created_at DESC
       ) active_orders ON active_orders.table_id = dt.table_id
       LEFT JOIN employees e ON e.employee_id = active_orders.waiter_id
       ${UPCOMING_RES_JOIN}
       ${where}
       ${TABLE_ORDER_BY}`,
      values
    )
    .then((r) => r.rows);
};

exports.findTablesByBranch = (branchId) =>
  pool
    .query(`${TABLE_SELECT} WHERE dt.branch_id = $1 ${TABLE_ORDER_BY}`, [branchId])
    .then((r) => r.rows);

exports.findTableById = (tableId) =>
  pool.query(`${TABLE_SELECT} WHERE dt.table_id = $1`, [tableId]).then((r) => r.rows[0]);

exports.findTablesBySection = (sectionId) =>
  pool
    .query(`${TABLE_SELECT} WHERE dt.section_id = $1 ORDER BY dt.created_at DESC`, [sectionId])
    .then((r) => r.rows);

exports.insertTable = ({ branch_id, section_id, table_number, table_name, capacity }) =>
  pool
    .query(
      `INSERT INTO dining_tables (branch_id, section_id, table_number, table_name, capacity, status)
       VALUES ($1, $2, $3, $4, $5, 'AVAILABLE') RETURNING table_id AS id`,
      [branch_id, section_id || null, table_number, table_name || null, capacity || 4]
    )
    .then((r) => r.rows[0].id);

exports.updateTableFields = (tableId, fields) => {
  const cols = Object.keys(fields);
  if (cols.length === 0) return Promise.resolve();
  const set = cols.map((c, i) => `${c} = $${i + 1}`);
  const values = cols.map((c) => fields[c]);
  values.push(new Date());
  set.push(`updated_at = $${values.length}`);
  values.push(tableId);
  return pool.query(
    `UPDATE dining_tables SET ${set.join(", ")} WHERE table_id = $${values.length}`,
    values
  );
};

exports.updateTableStatus = (tableId, status) =>
  pool.query("UPDATE dining_tables SET status = $1, updated_at = $2 WHERE table_id = $3", [
    status,
    new Date(),
    tableId,
  ]);

exports.completeOrdersForTable = (tableId) =>
  pool.query(
    `UPDATE orders SET status = 'COMPLETED' WHERE table_id = $1 AND status IN ${ACTIVE_ORDER_STATUSES}`,
    [tableId]
  );

exports.completeReservationsForTable = (tableId) =>
  pool.query(
    "UPDATE reservations SET status = 'COMPLETED' WHERE table_id = $1 AND status = 'CHECKED_IN'",
    [tableId]
  );
