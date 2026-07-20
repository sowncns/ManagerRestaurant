// src/modules/internal/employee/employee.repository.js
// CHI chua truy van DB cho quan ly nhan vien (employees + roles + branches + companies).
// PK: employees.employee_id (alias AS id), roles.role_id, branches.branch_id.
const pool = require("../../../config/db");

const BASE_SELECT = `
  SELECT e.employee_id AS id, e.full_name, e.username, e.phone, e.status,
         e.company_id, e.branch_id, e.role_id, e.kitchen_type_id, e.supabase_uid,
         e.created_at, e.updated_at,
         r.code AS role, r.name AS role_name,
         kt.code AS kitchen_type_code, kt.name AS kitchen_type_name,
         c.name AS company_name, b.name AS branch_name
  FROM employees e
  JOIN roles r ON r.role_id = e.role_id
  LEFT JOIN kitchen_types kt ON kt.kitchen_type_id = e.kitchen_type_id
  LEFT JOIN companies c ON c.company_id = e.company_id
  LEFT JOIN branches b ON b.branch_id = e.branch_id
`;

// scopeWhere do buildScopedBranchWhere sinh ra (rong voi SUPER_ADMIN).
exports.list = (scopeWhere, values) =>
  pool.query(`${BASE_SELECT} ${scopeWhere} ORDER BY e.full_name`, values).then((r) => r.rows);

exports.findById = (id) =>
  pool.query(`${BASE_SELECT} WHERE e.employee_id = $1`, [id]).then((r) => r.rows[0]);

exports.existsUsername = (username) =>
  pool
    .query("SELECT employee_id FROM employees WHERE username = $1", [username])
    .then((r) => r.rowCount > 0);

exports.create = ({ full_name, username, phone, password_hash, role_id, company_id, branch_id, kitchen_type_id, status }) =>
  pool
    .query(
      `INSERT INTO employees (full_name, username, phone, password_hash, role_id, company_id, branch_id, kitchen_type_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'ACTIVE'))
       RETURNING employee_id AS id, full_name, username, phone, role_id, company_id, branch_id, kitchen_type_id, status, created_at`,
      [full_name, username, phone, password_hash, role_id, company_id, branch_id, kitchen_type_id ?? null, status]
    )
    .then((r) => r.rows[0]);

// Cap nhat dong: chi set cac cot duoc truyen vao.
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
      `UPDATE employees SET ${cols.join(", ")}, updated_at = NOW()
       WHERE employee_id = $${values.length}
       RETURNING employee_id AS id, full_name, username, phone, role_id, company_id, branch_id, kitchen_type_id, status`,
      values
    )
    .then((r) => r.rows[0]);
};

exports.updatePassword = (id, passwordHash) =>
  pool.query("UPDATE employees SET password_hash = $1, updated_at = NOW() WHERE employee_id = $2", [
    passwordHash,
    id,
  ]);

exports.updateSupabaseUid = (id, supabaseUid) =>
  pool.query("UPDATE employees SET supabase_uid = $1, updated_at = NOW() WHERE employee_id = $2", [
    supabaseUid,
    id,
  ]);

exports.findBySupabaseUid = (supabaseUid) =>
  pool.query(`${BASE_SELECT} WHERE e.supabase_uid = $1`, [supabaseUid]).then((r) => r.rows[0]);

// ---- Tra cuu phu tro ----
exports.listRoles = () =>
  pool
    .query("SELECT role_id AS id, code, name, description FROM roles ORDER BY role_id")
    .then((r) => r.rows);

exports.findRoleById = (roleId) =>
  pool
    .query("SELECT role_id AS id, code, name FROM roles WHERE role_id = $1", [roleId])
    .then((r) => r.rows[0]);

exports.findBranchById = (branchId) =>
  pool
    .query("SELECT branch_id AS id, company_id FROM branches WHERE branch_id = $1", [branchId])
    .then((r) => r.rows[0]);

exports.listKitchenTypes = () =>
  pool
    .query("SELECT kitchen_type_id AS id, code, name FROM kitchen_types WHERE status = 'active' ORDER BY kitchen_type_id")
    .then((r) => r.rows);

exports.findKitchenTypeById = (id) =>
  pool
    .query("SELECT kitchen_type_id AS id, code, name FROM kitchen_types WHERE kitchen_type_id = $1 AND status = 'active'", [id])
    .then((r) => r.rows[0]);
