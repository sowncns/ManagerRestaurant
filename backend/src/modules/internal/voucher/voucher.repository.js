// src/modules/internal/voucher/voucher.repository.js
// Truy cap voucher_templates + customer_vouchers cho quan tri.
const pool = require("../../../config/db");

const BASE = `
  SELECT voucher_template_id AS id, company_id, code, name, name_en, description, description_en,
         discount_type, discount_value, min_order_amount, max_discount_amount,
         start_date, end_date, usage_limit, used_count, per_customer_limit,
         apply_scope, type, status, image_url, created_at, updated_at,
         (SELECT array_agg(branch_id) FROM voucher_branches WHERE voucher_template_id = voucher_templates.voucher_template_id) AS "branchIds"
  FROM voucher_templates
`;

exports.list = ({ companyId, status }) => {
  const vals = [];
  const where = [];
  if (companyId != null) { vals.push(companyId); where.push(`company_id = $${vals.length}`); }
  if (status) { vals.push(status); where.push(`status = $${vals.length}`); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return pool.query(`${BASE} ${clause} ORDER BY created_at DESC`, vals).then((r) => r.rows.map(row => ({
    ...row,
    branchIds: row.branchIds || []
  })));
};

exports.findById = (id) =>
  pool.query(`${BASE} WHERE voucher_template_id = $1`, [id]).then((r) => {
    if (!r.rows[0]) return null;
    return { ...r.rows[0], branchIds: r.rows[0].branchIds || [] };
  });

exports.create = async (d) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `INSERT INTO voucher_templates
         (company_id, code, name, name_en, description, description_en,
          discount_type, discount_value, min_order_amount, max_discount_amount,
          start_date, end_date, usage_limit, used_count, per_customer_limit,
          apply_scope, type, status, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0,$14,$15,$16,$17,$18)
       RETURNING voucher_template_id AS id`,
      [
        d.company_id, d.code, d.name, d.name_en ?? null, d.description ?? null, d.description_en ?? null,
        d.discount_type, d.discount_value, d.min_order_amount, d.max_discount_amount,
        d.start_date, d.end_date, d.usage_limit, d.per_customer_limit,
        d.apply_scope, d.type, d.status, d.image_url ?? null,
      ]
    );
    const id = res.rows[0].id;
    
    if (d.apply_scope === 'selected_branches' && Array.isArray(d.branchIds) && d.branchIds.length > 0) {
      for (const branchId of d.branchIds) {
        await client.query(`INSERT INTO voucher_branches (voucher_template_id, branch_id) VALUES ($1, $2)`, [id, branchId]);
      }
    }
    
    await client.query('COMMIT');
    return id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.update = async (id, d) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `UPDATE voucher_templates SET
         name               = COALESCE($2, name),
         name_en            = COALESCE($3, name_en),
         description        = COALESCE($4, description),
         description_en     = COALESCE($5, description_en),
         discount_type      = COALESCE($6, discount_type),
         discount_value     = COALESCE($7, discount_value),
         min_order_amount   = COALESCE($8, min_order_amount),
         max_discount_amount= COALESCE($9, max_discount_amount),
         start_date         = COALESCE($10, start_date),
         end_date           = COALESCE($11, end_date),
         usage_limit        = COALESCE($12, usage_limit),
         per_customer_limit = COALESCE($13, per_customer_limit),
         apply_scope        = COALESCE($14, apply_scope),
         type               = COALESCE($15, type),
         status             = COALESCE($16, status),
         image_url          = COALESCE($17, image_url),
         updated_at         = NOW()
       WHERE voucher_template_id = $1
       RETURNING voucher_template_id AS id`,
      [
        id, d.name ?? null, d.name_en ?? null, d.description ?? null, d.description_en ?? null,
        d.discount_type ?? null, d.discount_value ?? null, d.min_order_amount ?? null, d.max_discount_amount ?? null,
        d.start_date ?? null, d.end_date ?? null, d.usage_limit ?? null, d.per_customer_limit ?? null,
        d.apply_scope ?? null, d.type ?? null, d.status ?? null, d.image_url ?? null,
      ]
    );

    if (d.apply_scope !== undefined) {
      await client.query(`DELETE FROM voucher_branches WHERE voucher_template_id = $1`, [id]);
      if (d.apply_scope === 'selected_branches' && Array.isArray(d.branchIds) && d.branchIds.length > 0) {
        for (const branchId of d.branchIds) {
          await client.query(`INSERT INTO voucher_branches (voucher_template_id, branch_id) VALUES ($1, $2)`, [id, branchId]);
        }
      }
    }
    
    await client.query('COMMIT');
    return res.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.deactivate = (id) =>
  pool
    .query(
      "UPDATE voucher_templates SET status='inactive', updated_at=NOW() WHERE voucher_template_id=$1 RETURNING voucher_template_id AS id",
      [id]
    )
    .then((r) => r.rows[0]);

exports.stats = (templateId) =>
  pool
    .query(
      `SELECT
         COUNT(*)::int AS issued,
         COUNT(*) FILTER (WHERE status='used')::int AS used
       FROM customer_vouchers WHERE voucher_template_id = $1`,
      [templateId]
    )
    .then((r) => r.rows[0]);

exports.getCustomerIdsByRank = (rank) =>
  pool
    .query("SELECT customer_id FROM customers WHERE lower(rank) = lower($1)", [rank])
    .then((r) => r.rows.map((x) => x.customer_id));

exports.getCustomerIdsByBirthMonth = (month) =>
  pool
    .query("SELECT customer_id FROM customers WHERE EXTRACT(MONTH FROM dob) = $1", [month])
    .then((r) => r.rows.map((x) => x.customer_id));

exports.countUnusedForCustomer = (client, templateId, customerId) =>
  client
    .query(
      "SELECT COUNT(*)::int AS n FROM customer_vouchers WHERE voucher_template_id=$1 AND customer_id=$2 AND status='unused'",
      [templateId, customerId]
    )
    .then((r) => r.rows[0].n);

exports.insertCustomerVoucher = (client, { templateId, customerId, assignedBy, reason }) =>
  client.query(
    `INSERT INTO customer_vouchers
       (customer_id, voucher_template_id, status, assigned_by_employee_id, assign_reason, assigned_at)
     VALUES ($1,$2,'unused',$3,$4,NOW())`,
    [customerId, templateId, assignedBy ?? null, reason ?? null]
  );
