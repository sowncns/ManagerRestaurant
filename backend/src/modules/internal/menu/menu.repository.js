// src/modules/internal/menu/menu.repository.js
// PK: menu_categories.category_id, menu_items.menu_item_id. Pham vi theo company_id.
// Luu y: status dung chu THUONG 'active'/'inactive' (khac combos/branches dung chu HOA).
const pool = require("../../../config/db");

// ---------------- Categories ----------------
exports.findCategories = (companyId, { status } = {}) => {
  const values = [];
  const conditions = [];
  if (companyId != null) {
    values.push(companyId);
    conditions.push(`company_id = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return pool
    .query(`SELECT *, category_id AS id FROM menu_categories ${where} ORDER BY name`, values)
    .then((r) => r.rows);
};

exports.findCategoryById = (id, companyId) =>
  pool
    .query("SELECT *, category_id AS id FROM menu_categories WHERE category_id = $1 AND company_id = $2", [id, companyId])
    .then((r) => r.rows[0]);

exports.createCategory = (companyId, data) =>
  pool
    .query(
      `INSERT INTO menu_categories (company_id, name, category_type, description)
       VALUES ($1,$2,$3,$4) RETURNING *, category_id AS id`,
      [companyId, data.name, data.category_type ?? null, data.description ?? null]
    )
    .then((r) => r.rows[0]);

exports.updateCategory = (id, companyId, fields) => {
  const cols = [];
  const values = [];
  for (const [key, val] of Object.entries(fields)) {
    values.push(val);
    cols.push(`${key} = $${values.length}`);
  }
  values.push(id, companyId);
  return pool
    .query(
      `UPDATE menu_categories SET ${cols.join(", ")}
       WHERE category_id = $${values.length - 1} AND company_id = $${values.length}
       RETURNING *, category_id AS id`,
      values
    )
    .then((r) => r.rows[0]);
};

exports.deactivateCategory = (id, companyId) =>
  pool
    .query(
      "UPDATE menu_categories SET status = 'inactive' WHERE category_id = $1 AND company_id = $2 RETURNING *, category_id AS id",
      [id, companyId]
    )
    .then((r) => r.rows[0]);

// Dem so mon con 'active' thuoc danh muc -> chan xoa neu con.
exports.countActiveItemsInCategory = (categoryId, companyId) =>
  pool
    .query(
      "SELECT COUNT(*)::int AS n FROM menu_items WHERE category_id = $1 AND company_id = $2 AND status = 'active'",
      [categoryId, companyId]
    )
    .then((r) => r.rows[0].n);

// Kiem tra 1 category_id co thuoc cong ty khong.
exports.categoryExistsInCompany = (categoryId, companyId) =>
  pool
    .query(
      "SELECT 1 FROM menu_categories WHERE category_id = $1 AND company_id = $2",
      [categoryId, companyId]
    )
    .then((r) => r.rowCount > 0);

// Kiem tra kitchen_type_id co ton tai va dang active khong (lookup toan cuc, khong theo company).
exports.kitchenTypeExists = (kitchenTypeId) =>
  pool
    .query(
      "SELECT 1 FROM kitchen_types WHERE kitchen_type_id = $1 AND status = 'active'",
      [kitchenTypeId]
    )
    .then((r) => r.rowCount > 0);

// ---------------- Items ----------------
const ITEM_SELECT = `SELECT mi.*, mi.menu_item_id AS id,
        mc.name AS category_name, kt.name AS kitchen_type_name
 FROM menu_items mi
 JOIN menu_categories mc ON mc.category_id = mi.category_id
 LEFT JOIN kitchen_types kt ON kt.kitchen_type_id = mi.kitchen_type_id`;

exports.findItems = (companyId, { category_id, is_available, search } = {}) => {
  const values = [];
  const conditions = [];
  if (companyId != null) {
    values.push(companyId);
    conditions.push(`mi.company_id = $${values.length}`);
  }
  if (category_id) {
    values.push(category_id);
    conditions.push(`mi.category_id = $${values.length}`);
  }
  if (is_available !== undefined) {
    values.push(is_available);
    conditions.push(`mi.is_available = $${values.length}`);
  }
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`mi.name ILIKE $${values.length}`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return pool
    .query(`${ITEM_SELECT} ${where} ORDER BY mc.name, mi.name`, values)
    .then((r) => r.rows);
};

exports.findItemById = (id, companyId) =>
  pool
    .query(
      `${ITEM_SELECT} WHERE mi.menu_item_id = $1 AND mi.company_id = $2`,
      [id, companyId]
    )
    .then((r) => r.rows[0]);

exports.createItem = (companyId, data) =>
  pool
    .query(
      `INSERT INTO menu_items (company_id, category_id, kitchen_type_id, name, description, image_url, price, vat, is_available)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *, menu_item_id AS id`,
      [
        companyId, data.category_id, data.kitchen_type_id, data.name,
        data.description ?? null, data.image_url ?? null, data.price,
        data.vat ?? null, data.is_available ?? true,
      ]
    )
    .then((r) => r.rows[0]);

exports.updateItem = (id, companyId, fields) => {
  const cols = [];
  const values = [];
  for (const [key, val] of Object.entries(fields)) {
    values.push(val);
    cols.push(`${key} = $${values.length}`);
  }
  values.push(id, companyId);
  return pool
    .query(
      `UPDATE menu_items SET ${cols.join(", ")}
       WHERE menu_item_id = $${values.length - 1} AND company_id = $${values.length}
       RETURNING *, menu_item_id AS id`,
      values
    )
    .then((r) => r.rows[0]);
};

exports.deactivateItem = (id, companyId) =>
  pool
    .query(
      "UPDATE menu_items SET status = 'inactive' WHERE menu_item_id = $1 AND company_id = $2 RETURNING *, menu_item_id AS id",
      [id, companyId]
    )
    .then((r) => r.rows[0]);
