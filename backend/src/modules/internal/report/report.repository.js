// src/modules/internal/report/report.repository.js
// CHI chua truy van tong hop cho bao cao & dashboard (doanh thu, mon ban chay, KPI).
// Loc theo pham vi: COMPANY_ADMIN -> company_id, BRANCH_MANAGER -> branch_id, SUPER_ADMIN -> toan bo.
const pool = require("../../../config/db");

// Sinh dieu kien pham vi (khong kem tu khoa WHERE) + day gia tri vao mang values.
function scopeCondition(currentUser, values, { company = "company_id", branch = "branch_id", query = {} } = {}) {
  let targetCompanyId = query.company_id;
  let targetBranchId = query.branch_id;

  if (currentUser.role === "COMPANY_ADMIN") {
    targetCompanyId = currentUser.company_id;
  } else if (currentUser.role !== "SUPER_ADMIN") {
    targetCompanyId = currentUser.company_id;
    targetBranchId = currentUser.branch_id;
  }

  const conds = [];
  if (targetCompanyId) {
    values.push(targetCompanyId);
    conds.push(`${company} = $${values.length}`);
  }
  if (targetBranchId) {
    values.push(targetBranchId);
    conds.push(`${branch} = $${values.length}`);
  }
  return conds.length ? conds.join(" AND ") : null;
}

function whereFrom(conditions) {
  const list = conditions.filter(Boolean);
  return list.length ? `WHERE ${list.join(" AND ")}` : "";
}

// ---- Doanh thu (tu hoa don da thanh toan) ----
exports.revenue = (currentUser, { from, to, groupBy, company_id, branch_id }) => {
  const values = [];
  const conds = [scopeCondition(currentUser, values, { branch: "i.branch_id", company: "i.company_id", query: { company_id, branch_id } }), "i.status = 'PAID'"];
  const paidAt = "COALESCE(i.paid_at, i.created_at)";
  if (from) { values.push(from); conds.push(`${paidAt} >= $${values.length}`); }
  if (to) { values.push(to); conds.push(`${paidAt} < ($${values.length}::date + INTERVAL '1 day')`); }

  const bucket = groupBy === "month" ? "YYYY-MM" : "YYYY-MM-DD";
  return pool
    .query(
      `SELECT to_char(${paidAt}, '${bucket}') AS period,
              COUNT(*) AS invoice_count,
              COALESCE(SUM(i.amount), 0) AS revenue
       FROM invoices i
       ${whereFrom(conds)}
       GROUP BY period
       ORDER BY period`,
      values
    )
    .then((r) => r.rows);
};

// ---- Tong doanh thu trong khoang (1 con so) ----
exports.revenueTotal = (currentUser, { from, to, company_id, branch_id }) => {
  const values = [];
  const conds = [scopeCondition(currentUser, values, { branch: "i.branch_id", company: "i.company_id", query: { company_id, branch_id } }), "i.status = 'PAID'"];
  const paidAt = "COALESCE(i.paid_at, i.created_at)";
  if (from) { values.push(from); conds.push(`${paidAt} >= $${values.length}`); }
  if (to) { values.push(to); conds.push(`${paidAt} < ($${values.length}::date + INTERVAL '1 day')`); }
  return pool
    .query(
      `SELECT COUNT(*) AS invoice_count, COALESCE(SUM(i.amount), 0) AS revenue
       FROM invoices i ${whereFrom(conds)}`,
      values
    )
    .then((r) => r.rows[0]);
};

// ---- Mon ban chay (tu order_items cua order da hoan tat) ----
exports.topItems = (currentUser, { from, to, limit = 10, company_id, branch_id }) => {
  const values = [];
  const conds = [scopeCondition(currentUser, values, { branch: "o.branch_id", company: "o.company_id", query: { company_id, branch_id } }), "o.status = 'COMPLETED'"];
  if (from) { values.push(from); conds.push(`o.ordered_at >= $${values.length}`); }
  if (to) { values.push(to); conds.push(`o.ordered_at < ($${values.length}::date + INTERVAL '1 day')`); }
  values.push(limit);
  const limitParam = `$${values.length}`;
  return pool
    .query(
      `SELECT oi.menu_item_id, oi.item_name,
              SUM(oi.quantity) AS total_quantity,
              COALESCE(SUM(oi.total_price), 0) AS total_revenue
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       ${whereFrom(conds)}
       GROUP BY oi.menu_item_id, oi.item_name
       ORDER BY total_quantity DESC
       LIMIT ${limitParam}`,
      values
    )
    .then((r) => r.rows);
};

// ---- KPI so luong order trong khoang ----
exports.orderStats = (currentUser, { from, to, company_id, branch_id }) => {
  const values = [];
  const conds = [scopeCondition(currentUser, values, { branch: "branch_id", company: "company_id", query: { company_id, branch_id } })];
  if (from) { values.push(from); conds.push(`ordered_at >= $${values.length}`); }
  if (to) { values.push(to); conds.push(`ordered_at < ($${values.length}::date + INTERVAL '1 day')`); }
  return pool
    .query(
      `SELECT COUNT(*) AS total_orders,
              COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_orders,
              COALESCE(SUM(guest_count), 0) AS total_guests
       FROM orders ${whereFrom(conds)}`,
      values
    )
    .then((r) => r.rows[0]);
};

// ---- Trang thai ban an (cho dashboard) ----
exports.tableStatus = (currentUser, query = {}) => {
  const values = [];
  const cond = scopeCondition(currentUser, values, { branch: "dt.branch_id", company: "b.company_id", query });
  return pool
    .query(
      `SELECT UPPER(dt.status) AS status, COUNT(*) AS count
       FROM dining_tables dt
       JOIN branches b ON b.branch_id = dt.branch_id
       ${cond ? `WHERE ${cond}` : ""}
       GROUP BY UPPER(dt.status)`,
      values
    )
    .then((r) => r.rows);
};

// ---- Chuoi doanh thu theo ngay (N ngay gan nhat, tinh ca ngay khong co doanh thu) ----
exports.revenueDaily = (currentUser, { days = 7, company_id, branch_id } = {}) => {
  const values = [];
  const scope = scopeCondition(currentUser, values, { branch: "i.branch_id", company: "i.company_id", query: { company_id, branch_id } });
  const paidAt = "COALESCE(i.paid_at, i.created_at)";
  const joinConds = [scope, "i.status = 'PAID'"].filter(Boolean).join(" AND ");
  values.push(days);
  const daysParam = `$${values.length}`;
  return pool
    .query(
      `WITH d AS (
         SELECT generate_series(CURRENT_DATE - (${daysParam}::int - 1), CURRENT_DATE, INTERVAL '1 day')::date AS day
       )
       SELECT to_char(d.day, 'YYYY-MM-DD') AS period,
              COALESCE(SUM(i.amount), 0) AS revenue
       FROM d
       LEFT JOIN invoices i ON ${paidAt}::date = d.day AND ${joinConds}
       GROUP BY d.day
       ORDER BY d.day`,
      values
    )
    .then((r) => r.rows);
};

// ---- Tong quan toan he thong (SUPER_ADMIN) ----
exports.systemCounts = () =>
  pool
    .query(
      `SELECT
         (SELECT COUNT(*) FROM companies WHERE status = 'ACTIVE') AS companies,
         (SELECT COUNT(*) FROM branches  WHERE status = 'ACTIVE') AS branches,
         (SELECT COUNT(*) FROM employees WHERE UPPER(status) = 'ACTIVE') AS employees`
    )
    .then((r) => r.rows[0]);

// ---- Breakdown theo cong ty: chi nhanh, nhan vien, doanh thu thang nay & thang truoc ----
exports.companyBreakdown = () =>
  pool
    .query(
      `SELECT c.company_id AS id, c.name, c.status,
         (SELECT COUNT(*) FROM branches b WHERE b.company_id = c.company_id AND b.status = 'ACTIVE') AS branches,
         (SELECT COUNT(*) FROM employees e WHERE e.company_id = c.company_id AND UPPER(e.status) = 'ACTIVE') AS employees,
         COALESCE((SELECT SUM(i.amount) FROM invoices i
                   WHERE i.company_id = c.company_id AND i.status = 'PAID'
                     AND COALESCE(i.paid_at, i.created_at) >= date_trunc('month', CURRENT_DATE)), 0) AS revenue_month,
         COALESCE((SELECT SUM(i.amount) FROM invoices i
                   WHERE i.company_id = c.company_id AND i.status = 'PAID'
                     AND COALESCE(i.paid_at, i.created_at) >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
                     AND COALESCE(i.paid_at, i.created_at) <  date_trunc('month', CURRENT_DATE)), 0) AS revenue_prev
       FROM companies c
       WHERE c.status = 'ACTIVE'
       ORDER BY revenue_month DESC, c.name`
    )
    .then((r) => r.rows);
