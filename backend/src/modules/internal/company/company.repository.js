// src/modules/internal/company/company.repository.js
// Truy cap bang companies cho quan tri (SUPER_ADMIN / COMPANY_ADMIN).
const pool = require("../../../config/db");

const BASE_SELECT = `
  SELECT company_id AS id, name, description, logo_url, phone, email, status, created_at, updated_at
  FROM companies
`;

exports.listAll = () =>
  pool.query(`${BASE_SELECT} ORDER BY name`).then((r) => r.rows);

exports.findById = (id) =>
  pool.query(`${BASE_SELECT} WHERE company_id = $1`, [id]).then((r) => r.rows[0]);

exports.create = (d) =>
  pool
    .query(
      `INSERT INTO companies (name, description, logo_url, phone, email, status)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,'ACTIVE'))
       RETURNING company_id AS id, name, description, logo_url, phone, email, status, created_at`,
      [d.name, d.description ?? null, d.logo_url ?? null, d.phone ?? null, d.email ?? null, d.status ?? null]
    )
    .then((r) => r.rows[0]);

exports.update = (id, d) =>
  pool
    .query(
      `UPDATE companies SET
         name        = COALESCE($2, name),
         description = COALESCE($3, description),
         logo_url    = COALESCE($4, logo_url),
         phone       = COALESCE($5, phone),
         email       = COALESCE($6, email),
         status      = COALESCE($7, status),
         updated_at  = NOW()
       WHERE company_id = $1
       RETURNING company_id AS id, name, description, logo_url, phone, email, status, updated_at`,
      [id, d.name ?? null, d.description ?? null, d.logo_url ?? null, d.phone ?? null, d.email ?? null, d.status ?? null]
    )
    .then((r) => r.rows[0]);
