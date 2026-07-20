// src/modules/internal/branch/branch.repository.js
// CHI chua truy van DB cho quan ly chi nhanh (branches + companies).
// PK: branches.branch_id (alias AS id). Rang buoc UNIQUE (company_id, code).
const pool = require("../../../config/db");

const BASE_SELECT = `
  SELECT b.branch_id AS id, b.company_id, b.name, b.code, b.phone, b.email,
         b.address, b.ward, b.district, b.city, b.opening_time, b.closing_time,
         b.status, b.image_url, b.created_at, b.updated_at, c.name AS company_name
  FROM branches b
  LEFT JOIN companies c ON c.company_id = b.company_id
`;

// scopeWhere sinh boi buildScopedBranchWhere (rong voi SUPER_ADMIN).
exports.list = (scopeWhere, values) =>
  pool.query(`${BASE_SELECT} ${scopeWhere} ORDER BY b.name`, values).then((r) => r.rows);

exports.findById = (id) =>
  pool.query(`${BASE_SELECT} WHERE b.branch_id = $1`, [id]).then((r) => r.rows[0]);

exports.companyExists = (companyId) =>
  pool
    .query("SELECT company_id FROM companies WHERE company_id = $1", [companyId])
    .then((r) => r.rowCount > 0);

exports.create = (data) =>
  pool
    .query(
      `INSERT INTO branches (company_id, name, code, phone, email, address, ward, district, city, opening_time, closing_time, status, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12, 'ACTIVE'), $13)
       RETURNING branch_id AS id, company_id, name, code, phone, email, address, ward, district, city, opening_time, closing_time, status, image_url, created_at`,
      [
        data.company_id, data.name, data.code, data.phone ?? null, data.email ?? null,
        data.address, data.ward ?? null, data.district ?? null, data.city ?? null,
        data.opening_time ?? null, data.closing_time ?? null, data.status ?? null, data.image_url ?? null,
      ]
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
      `UPDATE branches SET ${cols.join(", ")}, updated_at = NOW()
       WHERE branch_id = $${values.length}
       RETURNING branch_id AS id, company_id, name, code, phone, email, address, ward, district, city, opening_time, closing_time, status`,
      values
    )
    .then((r) => r.rows[0]);
};
