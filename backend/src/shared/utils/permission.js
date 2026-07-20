// src/shared/utils/permission.js
// Phan quyen theo vai tro (role) va pham vi chi nhanh/cong ty (scope).
const { AppError } = require("../errors/AppError");

const SECTION_READ_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER", "RECEPTIONIST", "WAITER", "CASHIER"];
const SECTION_WRITE_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER"];
const MANAGER_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER"];

// Thu bac vai tro: cang cao cang nhieu quyen. Dung de kiem soat viec cap role cho nhan vien.
const ROLE_RANK = {
  SUPER_ADMIN: 100,
  COMPANY_ADMIN: 80,
  BRANCH_MANAGER: 60,
  RECEPTIONIST: 40,
  WAITER: 40,
  CASHIER: 40,
  KITCHEN: 40,
};
const SECTION_STATUSES = ["ACTIVE", "INACTIVE", "DELETED"];
const TABLE_STATUSES = ["AVAILABLE", "RESERVED", "SERVING", "WAIT_PAYMENT", "DISABLE", "DELETED"];
const LIMITED_TABLE_STATUS_BY_ROLE = {
  RECEPTIONIST: ["AVAILABLE", "RESERVED", "SERVING", "WAIT_PAYMENT"],
  WAITER: ["SERVING", "WAIT_PAYMENT", "AVAILABLE"],
  CASHIER: ["WAIT_PAYMENT", "AVAILABLE"],
};

function normalizeStatus(status) {
  return String(status || "").trim().toUpperCase();
}

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

function assertStaffRole(currentUser, roles, message) {
  if (!currentUser || currentUser.type !== "staff" || !roles.includes(currentUser.role)) {
    throw new AppError(message, 403);
  }
}

function assertManager(currentUser) {
  assertStaffRole(currentUser, MANAGER_ROLES, "Bạn không có quyền quản lý nhân viên");
}

function assertBranchScope(currentUser, branch, message = "Bạn chỉ được thao tác dữ liệu trong phạm vi của mình") {
  if (currentUser.role === "SUPER_ADMIN") return;
  if (currentUser.role === "COMPANY_ADMIN") {
    if (branch.company_id !== currentUser.company_id) throw new AppError(message, 403);
    return;
  }
  if (branch.id !== currentUser.branch_id) throw new AppError(message, 403);
}

// Sinh menh de WHERE gioi han pham vi theo vai tro (rong voi SUPER_ADMIN).
// Dung chung cho branch/table/reservation (alias "b") va employee (alias "e").
function buildScopedBranchWhere(currentUser, values, alias = "b") {
  if (currentUser.role === "SUPER_ADMIN") return "";
  if (currentUser.role === "COMPANY_ADMIN") {
    values.push(currentUser.company_id);
    return `WHERE ${alias}.company_id = $${values.length}`;
  }
  values.push(currentUser.branch_id);
  return `WHERE ${alias}.branch_id = $${values.length}`;
}

function assertEmployeeScope(currentUser, employee) {
  assertManager(currentUser);
  if (currentUser.role === "SUPER_ADMIN") return;
  if (currentUser.role === "COMPANY_ADMIN") {
    if (employee.company_id !== currentUser.company_id) {
      throw new AppError("Bạn chỉ được quản lý nhân viên trong công ty của mình", 403);
    }
    return;
  }
  if (employee.branch_id !== currentUser.branch_id) {
    throw new AppError("Bạn chỉ được quản lý nhân viên trong chi nhánh của mình", 403);
  }
}

// Chi duoc cap/quan ly nhan vien co vai tro THAP hon minh; rieng SUPER_ADMIN toan quyen.
function assertCanAssignRole(currentUser, targetRoleCode) {
  const target = normalizeRole(targetRoleCode);
  if (currentUser.role === "SUPER_ADMIN") return;
  const actorRank = ROLE_RANK[currentUser.role] || 0;
  const targetRank = ROLE_RANK[target];
  if (targetRank === undefined) throw new AppError("Vai trò không hợp lệ", 400);
  if (targetRank >= actorRank) {
    throw new AppError("Bạn không được cấp vai trò ngang hoặc cao hơn mình", 403);
  }
}

// Xac dinh pham vi (company_id, branch_id) khi tao/sua nhan vien theo vai tro nguoi thao tac.
// SUPER_ADMIN: tu chon; COMPANY_ADMIN: khoa theo cong ty minh; BRANCH_MANAGER: khoa theo chi nhanh minh.
function resolveEmployeeScope(currentUser, { company_id, branch_id }) {
  if (currentUser.role === "SUPER_ADMIN") {
    return { company_id: company_id ?? null, branch_id: branch_id ?? null };
  }
  if (currentUser.role === "COMPANY_ADMIN") {
    return { company_id: currentUser.company_id, branch_id: branch_id ?? null };
  }
  // BRANCH_MANAGER
  return { company_id: currentUser.company_id, branch_id: currentUser.branch_id };
}

function canChangeTableStatus(currentUser, status) {
  const nextStatus = normalizeStatus(status);
  if (SECTION_WRITE_ROLES.includes(currentUser.role)) return true;
  return (LIMITED_TABLE_STATUS_BY_ROLE[currentUser.role] || []).includes(nextStatus);
}

module.exports = {
  SECTION_READ_ROLES,
  SECTION_WRITE_ROLES,
  MANAGER_ROLES,
  ROLE_RANK,
  SECTION_STATUSES,
  TABLE_STATUSES,
  normalizeStatus,
  normalizeRole,
  assertStaffRole,
  assertManager,
  assertBranchScope,
  buildScopedBranchWhere,
  assertEmployeeScope,
  assertCanAssignRole,
  resolveEmployeeScope,
  canChangeTableStatus,
};
