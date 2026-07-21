// src/modules/public/public.repository.js
// Tang truy cap du lieu cho API cong khai (khach chua dang nhap van xem duoc).
// PK: companies.company_id, branches.branch_id, menu_categories.category_id, menu_items.menu_item_id.
const pool = require("../../config/db");

// ---------------- Companies ----------------
exports.listCompanies = () =>
  pool
    .query(
      `SELECT company_id AS id, name, description, logo_url, phone, email
       FROM companies
       WHERE status = 'ACTIVE'
       ORDER BY name`
    )
    .then((r) => r.rows);

exports.findCompanyById = (companyId) =>
  pool
    .query(
      `SELECT company_id AS id, name, description, logo_url, phone, email
       FROM companies
       WHERE company_id = $1 AND status = 'ACTIVE'`,
      [companyId]
    )
    .then((r) => r.rows[0]);

// ---------------- Branches ----------------
exports.listBranchesByCompany = (companyId) =>
  pool
    .query(
      `SELECT branch_id AS id, company_id, name, code, phone, email,
              address, ward, district, city, opening_time, closing_time
       FROM branches
       WHERE company_id = $1 AND status = 'ACTIVE'
       ORDER BY name`,
      [companyId]
    )
    .then((r) => r.rows);

exports.findBranchById = (branchId) =>
  pool
    .query(
      `SELECT b.branch_id AS id, b.company_id, b.name, b.code, b.phone, b.email,
              b.address, b.ward, b.district, b.city, b.opening_time, b.closing_time,
              c.name AS company_name
       FROM branches b JOIN companies c ON c.company_id = b.company_id
       WHERE b.branch_id = $1 AND b.status = 'ACTIVE'`,
      [branchId]
    )
    .then((r) => r.rows[0]);

// ---------------- Menu ----------------
exports.listCategoriesByCompany = (companyId) =>
  pool
    .query(
      `SELECT category_id AS id, name, category_type, description
       FROM menu_categories
       WHERE company_id = $1 AND status = 'active'
       ORDER BY name`,
      [companyId]
    )
    .then((r) => r.rows);

exports.listMenuItemsByCompany = (companyId) =>
  pool
    .query(
      `SELECT mi.menu_item_id AS id, mi.category_id, mc.name AS category_name,
              mi.name, mi.description, mi.image_url, mi.price, mi.vat, mi.is_available
       FROM menu_items mi
       JOIN menu_categories mc ON mc.category_id = mi.category_id
       WHERE mi.company_id = $1 AND mi.status = 'active'
       ORDER BY mc.name, mi.name`,
      [companyId]
    )
    .then((r) => r.rows);


exports.findMenuItemById = (menuItemId) =>
  pool
    .query(
      `SELECT mi.menu_item_id AS id, mi.company_id, mi.category_id, mc.name AS category_name,
              mi.name, mi.description, mi.image_url, mi.price, mi.vat, mi.is_available
       FROM menu_items mi
       JOIN menu_categories mc ON mc.category_id = mi.category_id
       WHERE mi.menu_item_id = $1 AND mi.status = 'active'`,
      [menuItemId]
    )
    .then((r) => r.rows[0]);

// ---------------- Home banners (anh trang chu) ----------------
exports.listHomeBanners = () =>
  pool
    .query("SELECT banner_id AS id, image_url, type FROM home_banners ORDER BY type, sort_order, banner_id")
    .then((r) => r.rows);
