// src/modules/internal/combo/combo.repository.js
// PK: combos.combo_id, combo_items.combo_item_id. Pham vi theo company_id (chung moi chi nhanh).
const pool = require("../../../config/db");

exports.findCombos = (companyId, { status, search } = {}) => {
  const values = [companyId];
  let where = "WHERE company_id = $1";
  if (status) { values.push(status); where += ` AND status = $${values.length}`; }
  if (search) {
    values.push(`%${search}%`);
    where += ` AND name ILIKE $${values.length}`;
  }
  return pool
    .query(`SELECT *, combo_id AS id FROM combos ${where} ORDER BY name`, values)
    .then((r) => r.rows);
};

exports.findComboById = (id, companyId) =>
  pool
    .query("SELECT *, combo_id AS id FROM combos WHERE combo_id = $1 AND company_id = $2", [id, companyId])
    .then((r) => r.rows[0]);

exports.findComboItems = (comboId) =>
  pool
    .query(
      `SELECT ci.combo_item_id AS id, ci.menu_item_id, ci.quantity,
              mi.name AS menu_item_name, mi.price AS menu_item_price, mi.image_url
       FROM combo_items ci
       JOIN menu_items mi ON mi.menu_item_id = ci.menu_item_id
       WHERE ci.combo_id = $1 ORDER BY mi.name`,
      [comboId]
    )
    .then((r) => r.rows);

// Kiem tra danh sach menu_item_id co thuoc cong ty khong -> tra ve so luong khop.
exports.countMenuItemsInCompany = (menuItemIds, companyId) =>
  pool
    .query(
      "SELECT COUNT(*)::int AS n FROM menu_items WHERE menu_item_id = ANY($1::int[]) AND company_id = $2",
      [menuItemIds, companyId]
    )
    .then((r) => r.rows[0].n);

exports.createWithItems = async (companyId, data, items) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const combo = (
      await client.query(
        `INSERT INTO combos (company_id, name, description, price)
         VALUES ($1,$2,$3,$4) RETURNING combo_id AS id`,
        [companyId, data.name, data.description ?? null, data.price]
      )
    ).rows[0];
    for (const it of items) {
      await client.query(
        "INSERT INTO combo_items (combo_id, menu_item_id, quantity) VALUES ($1,$2,$3)",
        [combo.id, it.menu_item_id, it.quantity ?? 1]
      );
    }
    await client.query("COMMIT");
    return combo.id;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

// Cap nhat cac cot header + (tuy chon) thay toan bo items, trong 1 transaction.
exports.updateWithItems = async (id, companyId, fields, items) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cols = [];
    const values = [];
    for (const [key, val] of Object.entries(fields)) {
      values.push(val);
      cols.push(`${key} = $${values.length}`);
    }
    if (cols.length) {
      values.push(id, companyId);
      const updated = await client.query(
        `UPDATE combos SET ${cols.join(", ")}, updated_at = NOW()
         WHERE combo_id = $${values.length - 1} AND company_id = $${values.length}
         RETURNING combo_id AS id`,
        values
      );
      if (updated.rowCount === 0) { await client.query("ROLLBACK"); return null; }
    }
    if (items) {
      await client.query("DELETE FROM combo_items WHERE combo_id = $1", [id]);
      for (const it of items) {
        await client.query(
          "INSERT INTO combo_items (combo_id, menu_item_id, quantity) VALUES ($1,$2,$3)",
          [id, it.menu_item_id, it.quantity ?? 1]
        );
      }
    }
    await client.query("COMMIT");
    return id;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

exports.deactivate = (id, companyId) =>
  pool
    .query(
      "UPDATE combos SET status = 'INACTIVE', updated_at = NOW() WHERE combo_id = $1 AND company_id = $2 RETURNING combo_id AS id",
      [id, companyId]
    )
    .then((r) => r.rows[0]);
