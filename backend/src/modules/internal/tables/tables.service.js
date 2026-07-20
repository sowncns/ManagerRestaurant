// src/modules/internal/tables/tables.service.js
const repo = require("./tables.repository");
const { NotFound, BadRequest } = require("../../../shared/errors/AppError");
const {
  SECTION_READ_ROLES,
  SECTION_WRITE_ROLES,
  SECTION_STATUSES,
  TABLE_STATUSES,
  normalizeStatus,
  assertStaffRole,
  assertBranchScope,
  canChangeTableStatus,
} = require("../../../shared/utils/permission");
const { AppError } = require("../../../shared/errors/AppError");

// ---------- Mappers ----------
function toSection(row) {
  return {
    id: row.id,
    branch_id: row.branch_id,
    branch_name: row.branch_name,
    company_id: row.company_id,
    name: row.name,
    section_type: row.section_type,
    status: normalizeStatus(row.status),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toTable(row) {
  return {
    id: row.id,
    branch_id: row.branch_id,
    branch_name: row.branch_name,
    company_id: row.company_id,
    section_id: row.section_id,
    section_name: row.section_name,
    table_number: row.table_number,
    table_name: row.table_name,
    capacity: row.capacity,
    status: normalizeStatus(row.status),
    active_waiter_name: row.active_waiter_name || null,
    active_order_amount: row.active_order_amount || 0,
    active_order_id: row.active_order_id || null,
    upcoming_reservation: row.reservation_id
      ? {
          id: row.reservation_id,
          customer_name: row.res_customer_name,
          reservation_time: row.res_time,
          guest_count: row.res_guest_count,
        }
      : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ---------- Helpers ----------
async function getBranchOrThrow(branchId) {
  const branch = await repo.findBranchById(branchId);
  if (!branch) throw new NotFound("Chi nhánh không tồn tại");
  return branch;
}

async function assertBranchAccess(currentUser, branchId, roles, message) {
  assertStaffRole(currentUser, roles, message);
  const branch = await getBranchOrThrow(branchId);
  assertBranchScope(currentUser, branch);
  return branch;
}

// ---------- Sections ----------
async function listSections(currentUser) {
  assertStaffRole(currentUser, SECTION_READ_ROLES, "Bạn không có quyền xem khu vực");
  const rows = await repo.findSectionsScoped(currentUser);
  return rows.map(toSection);
}

async function getBranchSections(currentUser, branchId) {
  if (!branchId) throw new BadRequest("Thiếu thông tin chi nhánh");
  await assertBranchAccess(currentUser, branchId, SECTION_READ_ROLES, "Bạn không có quyền xem khu vực");
  const rows = await repo.findSectionsByBranch(branchId);
  return rows.map(toSection);
}

async function getSectionById(currentUser, sectionId, roles = SECTION_READ_ROLES) {
  const row = await repo.findSectionById(sectionId);
  if (!row) throw new NotFound("Khu vực không tồn tại");
  assertStaffRole(
    currentUser,
    roles,
    roles === SECTION_READ_ROLES ? "Bạn không có quyền xem khu vực" : "Bạn không có quyền sửa khu vực"
  );
  assertBranchScope(currentUser, { id: row.branch_id, company_id: row.company_id });
  return toSection(row);
}

async function createSection(currentUser, data) {
  const { branch_id, name, section_type } = data;
  if (!branch_id || !name) throw new BadRequest("Vui lòng nhập chi nhánh và tên khu vực");
  await assertBranchAccess(currentUser, branch_id, SECTION_WRITE_ROLES, "Bạn không có quyền tạo khu vực");
  const id = await repo.insertSection(branch_id, name, section_type);
  return getSectionById(currentUser, id);
}

async function updateSection(currentUser, sectionId, data) {
  const existing = await getSectionById(currentUser, sectionId, SECTION_WRITE_ROLES);
  const nextBranchId = data.branch_id !== undefined ? data.branch_id : existing.branch_id;
  if (nextBranchId !== existing.branch_id) {
    await assertBranchAccess(currentUser, nextBranchId, SECTION_WRITE_ROLES, "Bạn không có quyền chuyển khu vực sang chi nhánh này");
  }

  const fields = {};
  if (data.branch_id !== undefined) fields.branch_id = data.branch_id;
  if (data.name !== undefined) fields.name = data.name;
  if (data.section_type !== undefined) fields.section_type = data.section_type;
  if (Object.keys(fields).length === 0) return existing;

  await repo.updateSectionFields(sectionId, fields);
  return getSectionById(currentUser, sectionId);
}

async function changeSectionStatus(currentUser, sectionId, status) {
  await getSectionById(currentUser, sectionId, SECTION_WRITE_ROLES);
  const nextStatus = normalizeStatus(status);
  if (!SECTION_STATUSES.includes(nextStatus)) throw new BadRequest("Trạng thái khu vực không hợp lệ");
  await repo.updateSectionStatus(sectionId, nextStatus);
  return getSectionById(currentUser, sectionId);
}

async function deleteSection(currentUser, sectionId) {
  return changeSectionStatus(currentUser, sectionId, "DELETED");
}

// ---------- Tables ----------
async function listTables(currentUser) {
  assertStaffRole(currentUser, SECTION_READ_ROLES, "Bạn không có quyền xem bàn");
  const rows = await repo.findTablesScoped(currentUser);
  return rows.map(toTable);
}

async function getBranchTables(currentUser, branchId) {
  if (!branchId) throw new BadRequest("Thiếu thông tin chi nhánh");
  await assertBranchAccess(currentUser, branchId, SECTION_READ_ROLES, "Bạn không có quyền xem bàn");
  const rows = await repo.findTablesByBranch(branchId);
  return rows.map(toTable);
}

async function getTableById(currentUser, tableId, roles = SECTION_READ_ROLES) {
  const row = await repo.findTableById(tableId);
  if (!row) throw new NotFound("Bàn không tồn tại");
  assertStaffRole(
    currentUser,
    roles,
    roles === SECTION_READ_ROLES ? "Bạn không có quyền xem bàn" : "Bạn không có quyền sửa bàn"
  );
  assertBranchScope(currentUser, { id: row.branch_id, company_id: row.company_id });
  return toTable(row);
}

async function getTablesBySection(currentUser, sectionId) {
  if (!sectionId) throw new BadRequest("Thiếu thông tin khu vực");
  await getSectionById(currentUser, sectionId, SECTION_READ_ROLES);
  const rows = await repo.findTablesBySection(sectionId);
  return rows.map(toTable);
}

async function createTable(currentUser, data) {
  const { branch_id, section_id, table_number, table_name, capacity } = data;
  if (!branch_id || !table_number) throw new BadRequest("Vui lòng nhập chi nhánh và số bàn");
  await assertBranchAccess(currentUser, branch_id, SECTION_WRITE_ROLES, "Bạn không có quyền tạo bàn");

  if (section_id) {
    const section = await getSectionById(currentUser, section_id, SECTION_WRITE_ROLES);
    if (section.branch_id !== Number(branch_id)) throw new BadRequest("Khu vực không thuộc chi nhánh của bàn");
  }

  const id = await repo.insertTable({ branch_id, section_id, table_number, table_name, capacity });
  return getTableById(currentUser, id);
}

async function updateTable(currentUser, tableId, data) {
  const existing = await getTableById(currentUser, tableId, SECTION_WRITE_ROLES);
  const nextBranchId = data.branch_id !== undefined ? data.branch_id : existing.branch_id;
  if (nextBranchId !== existing.branch_id) {
    await assertBranchAccess(currentUser, nextBranchId, SECTION_WRITE_ROLES, "Bạn không có quyền chuyển bàn sang chi nhánh này");
  }

  if (data.section_id) {
    const section = await getSectionById(currentUser, data.section_id, SECTION_WRITE_ROLES);
    if (section.branch_id !== Number(nextBranchId)) throw new BadRequest("Khu vực không thuộc chi nhánh của bàn");
  }

  const fields = {};
  if (data.branch_id !== undefined) fields.branch_id = data.branch_id;
  if (data.section_id !== undefined) fields.section_id = data.section_id;
  if (data.table_number !== undefined) fields.table_number = data.table_number;
  if (data.table_name !== undefined) fields.table_name = data.table_name;
  if (data.capacity !== undefined) fields.capacity = data.capacity;
  if (Object.keys(fields).length === 0) return existing;

  await repo.updateTableFields(tableId, fields);
  return getTableById(currentUser, tableId);
}

async function changeTableStatus(currentUser, tableId, status) {
  await getTableById(currentUser, tableId, SECTION_READ_ROLES);
  const nextStatus = normalizeStatus(status);
  if (!TABLE_STATUSES.includes(nextStatus)) throw new BadRequest("Trạng thái bàn không hợp lệ");
  if (!canChangeTableStatus(currentUser, nextStatus)) {
    throw new AppError("Bạn không có quyền đổi bàn sang trạng thái này", 403);
  }

  await repo.updateTableStatus(tableId, nextStatus);

  // Khi ban ve AVAILABLE -> dong order va reservation dang mo
  if (nextStatus === "AVAILABLE") {
    await repo.completeOrdersForTable(tableId);
    await repo.completeReservationsForTable(tableId);
  }

  return getTableById(currentUser, tableId);
}

async function deleteTable(currentUser, tableId) {
  await getTableById(currentUser, tableId, SECTION_WRITE_ROLES);
  await repo.updateTableStatus(tableId, "DELETED");
  return getTableById(currentUser, tableId);
}

module.exports = {
  listSections,
  getBranchSections,
  getSectionById,
  createSection,
  updateSection,
  changeSectionStatus,
  deleteSection,
  listTables,
  getBranchTables,
  getTableById,
  getTablesBySection,
  createTable,
  updateTable,
  changeTableStatus,
  deleteTable,
};
