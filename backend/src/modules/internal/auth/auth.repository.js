// src/modules/internal/auth/auth.repository.js
// CHI chua truy van DB cho nhan vien (employees + roles + companies).
const pool = require("../../../config/db");

const BASE_SELECT = `
  SELECT e.employee_id AS id, e.full_name, e.username, e.password_hash, e.status,
         c.name AS company_name, e.company_id, e.branch_id, e.created_at,
         e.kitchen_type_id, kt.code AS kitchen_type_code, kt.name AS kitchen_type_name,
         r.code AS role
  FROM employees e
  JOIN roles r ON r.role_id = e.role_id
  LEFT JOIN kitchen_types kt ON kt.kitchen_type_id = e.kitchen_type_id
  LEFT JOIN companies c ON c.company_id = e.company_id
`;

exports.findByUsername = (username) =>
  pool.query(`${BASE_SELECT} WHERE e.username = $1`, [username]).then((r) => r.rows[0]);

exports.findById = (id) =>
  pool.query(`${BASE_SELECT} WHERE e.employee_id = $1`, [id]).then((r) => r.rows[0]);
