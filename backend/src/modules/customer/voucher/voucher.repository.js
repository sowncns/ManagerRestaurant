// src/modules/customer/voucher/voucher.repository.js
// PK customer_vouchers.customer_voucher_id, voucher_templates.voucher_template_id.
const pool = require("../../../config/db");

exports.findUsableByCustomer = (customerId) =>
  pool
    .query(
      `SELECT cv.customer_voucher_id, cv.status AS customer_voucher_status,
              vt.voucher_template_id, vt.code, vt.name, vt.name_en,
              vt.description, vt.description_en, vt.discount_type, vt.discount_value,
              vt.min_order_amount, vt.max_discount_amount, vt.start_date, vt.end_date,
              vt.apply_scope, vt.type
       FROM customer_vouchers cv
       JOIN voucher_templates vt ON cv.voucher_template_id = vt.voucher_template_id
       WHERE cv.customer_id = $1
         AND cv.status = 'unused'
         AND vt.status = 'active'
         AND NOW() BETWEEN vt.start_date AND vt.end_date
       ORDER BY vt.end_date ASC`,
      [customerId]
    )
    .then((r) => r.rows);
