// src/modules/internal/report/report.service.js
// Tang nghiep vu bao cao & dashboard. Chi quan ly tro len (assertManager).
const repo = require("./report.repository");
const { assertManager } = require("../../../shared/utils/permission");
const { Forbidden } = require("../../../shared/errors/AppError");

// yyyy-mm-dd theo gio dia phuong.
function ymd(date) {
  return date.toLocaleDateString("en-CA"); // format YYYY-MM-DD
}

exports.getRevenue = (currentUser, query = {}) => {
  assertManager(currentUser);
  const groupBy = query.groupBy === "month" ? "month" : "day";
  return repo.revenue(currentUser, { from: query.from, to: query.to, groupBy, company_id: query.company_id, branch_id: query.branch_id });
};

exports.getTopItems = (currentUser, query = {}) => {
  assertManager(currentUser);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
  return repo.topItems(currentUser, { from: query.from, to: query.to, limit, company_id: query.company_id, branch_id: query.branch_id });
};

// Dashboard: gom KPI hom nay + thang nay + mon ban chay + trang thai ban.
exports.getDashboard = async (currentUser, query = {}) => {
  assertManager(currentUser);
  const now = new Date();
  const today = ymd(now);
  const monthStart = ymd(new Date(now.getFullYear(), now.getMonth(), 1));

  const [revToday, revMonth, ordersToday, topItems, tableStatus, revenue7d] = await Promise.all([
    repo.revenueTotal(currentUser, { from: today, to: today, company_id: query.company_id, branch_id: query.branch_id }),
    repo.revenueTotal(currentUser, { from: monthStart, to: today, company_id: query.company_id, branch_id: query.branch_id }),
    repo.orderStats(currentUser, { from: today, to: today, company_id: query.company_id, branch_id: query.branch_id }),
    repo.topItems(currentUser, { from: monthStart, to: today, limit: 5, company_id: query.company_id, branch_id: query.branch_id }),
    repo.tableStatus(currentUser, query),
    repo.revenueDaily(currentUser, { days: 7, company_id: query.company_id, branch_id: query.branch_id }),
  ]);

  return {
    revenue_7d: revenue7d.map((d) => ({ period: d.period, revenue: Number(d.revenue) })),
    today: {
      date: today,
      revenue: Number(revToday.revenue),
      invoice_count: Number(revToday.invoice_count),
      total_orders: Number(ordersToday.total_orders),
      completed_orders: Number(ordersToday.completed_orders),
      total_guests: Number(ordersToday.total_guests),
    },
    month: {
      from: monthStart,
      revenue: Number(revMonth.revenue),
      invoice_count: Number(revMonth.invoice_count),
    },
    top_items: topItems,
    table_status: tableStatus,
  };
};

// Tong quan cap he thong: chi SUPER_ADMIN (dem toan bo + breakdown theo cong ty).
exports.getAdminOverview = async (currentUser) => {
  if (currentUser.role !== "SUPER_ADMIN") {
    throw new Forbidden("Chỉ quản trị hệ thống được xem tổng quan toàn hệ thống");
  }
  const [system, companies] = await Promise.all([repo.systemCounts(), repo.companyBreakdown()]);
  return {
    system: {
      companies: Number(system.companies),
      branches: Number(system.branches),
      employees: Number(system.employees),
    },
    companies: companies.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      branches: Number(c.branches),
      employees: Number(c.employees),
      revenue_month: Number(c.revenue_month),
      revenue_prev: Number(c.revenue_prev),
    })),
  };
};
