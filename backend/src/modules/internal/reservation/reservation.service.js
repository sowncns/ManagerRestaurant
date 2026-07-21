// src/modules/internal/reservation/reservation.service.js
// Tang nghiep vu dat ban. Pham vi theo chi nhanh/cong ty giong cac module noi bo khac.
//  - SUPER_ADMIN: moi chi nhanh. COMPANY_ADMIN: trong cong ty minh (phai chon branch_id).
//  - BRANCH_MANAGER / RECEPTIONIST: khoa theo chi nhanh cua minh.
const repo = require("./reservation.repository");
const pool = require("../../../config/db");
const env = require("../../../config/env");
const orderService = require("../order/order.service");
const orderRepo = require("../order/order.repository");
const depositService = require("../../../shared/services/deposit.service");
const { NotFound, BadRequest, Forbidden } = require("../../../shared/errors/AppError");
const { buildScopedBranchWhere, assertBranchScope } = require("../../../shared/utils/permission");

// Trang thai ban duoc coi la "dang su dung" (khong the don khach dat vao) -> canh bao doi ban.
const OCCUPIED_TABLE_STATUSES = ["SERVING", "WAIT_PAYMENT"];

// Chuyen trang thai hop le (may bay 1 chieu, khong quay lai tu trang thai ket thuc).
const TERMINAL = ["COMPLETED", "CANCELLED", "NO_SHOW"];

// Sinh ma phieu dat ban.
function generateReservationCode() {
  const d = new Date();
  const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return "RS" + datePart + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// "HH:mm" hoac "HH:mm:ss" -> so phut trong ngay
function toMinutes(t) {
  const [h, m] = String(t).split(":");
  return Number(h) * 60 + Number(m);
}
const hhmm = (t) => String(t).slice(0, 5);

// Chan gio dat ban ngoai khung mo cua chi nhanh (ho tro mo qua nua dem).
// Bo qua neu chi nhanh khong cau hinh gio.
async function assertWithinOpenHours(branchId, reservationTime) {
  if (!reservationTime) return;
  const hours = await repo.getOpenHours(branchId);
  if (!hours || !hours.opening_time || !hours.closing_time) return;

  const t = toMinutes(reservationTime);
  const open = toMinutes(hours.opening_time);
  const close = toMinutes(hours.closing_time);
  const ok = open <= close ? t >= open && t <= close : t >= open || t <= close;
  if (!ok) {
    throw new BadRequest(
      `Chi nhánh chỉ nhận khách từ ${hhmm(hours.opening_time)} đến ${hhmm(hours.closing_time)}.`
    );
  }
}

// Xac dinh chi nhanh + cong ty cho phieu dat theo vai tro nguoi thao tac.
async function resolveBranch(currentUser, requestedBranchId) {
  if (["BRANCH_MANAGER", "RECEPTIONIST", "WAITER"].includes(currentUser.role)) {
    return { branchId: currentUser.branch_id, companyId: currentUser.company_id };
  }
  // SUPER_ADMIN / COMPANY_ADMIN phai chi dinh chi nhanh
  if (!requestedBranchId) throw new BadRequest("Vui lòng chọn chi nhánh");
  const branch = await repo.findBranch(requestedBranchId);
  if (!branch) throw new BadRequest("Chi nhánh không tồn tại");
  assertBranchScope(currentUser, branch);
  return { branchId: branch.id, companyId: branch.company_id };
}

// Kiem tra ban (neu co) thuoc dung chi nhanh.
async function assertTableInBranch(tableId, branchId) {
  if (tableId == null) return;
  const table = await repo.findTable(tableId);
  if (!table) throw new BadRequest("Bàn không tồn tại");
  if (table.branch_id !== branchId) throw new BadRequest("Bàn không thuộc chi nhánh của phiếu đặt");
}

exports.list = (currentUser, filters = {}) => {
  const values = [];
  let where = buildScopedBranchWhere(currentUser, values, "b");
  const conds = [];
  if (filters.date) { values.push(filters.date); conds.push(`r.reservation_date = $${values.length}`); }
  if (filters.status) { values.push(filters.status); conds.push(`r.status = $${values.length}`); }
  if (filters.branch_id) { values.push(filters.branch_id); conds.push(`r.branch_id = $${values.length}`); }
  if (filters.search) {
    values.push(`%${filters.search}%`);
    conds.push(`(r.customer_name ILIKE $${values.length} OR r.customer_phone ILIKE $${values.length})`);
  }
  if (conds.length) {
    where = where ? `${where} AND ${conds.join(" AND ")}` : `WHERE ${conds.join(" AND ")}`;
  }
  return repo.list(where, values);
};

exports.get = async (currentUser, id) => {
  const reservation = await repo.findById(id);
  if (!reservation) throw new NotFound("Không tìm thấy phiếu đặt bàn");
  assertBranchScope(currentUser, { id: reservation.branch_id, company_id: reservation.company_id });
  return reservation;
};

exports.create = async (currentUser, data) => {
  const { branchId, companyId } = await resolveBranch(currentUser, data.branch_id);
  await assertWithinOpenHours(branchId, data.reservation_time);
  await assertTableInBranch(data.table_id, branchId);
  if (data.table_id) {
    const conflict = await repo.hasReservationConflict(
      data.table_id, data.reservation_date, data.reservation_time
    );
    if (conflict) {
      throw new BadRequest("Bàn này đã có phiếu đặt khác trong khung giờ, vui lòng chọn bàn khác.");
    }
  }
  const id = await repo.create({
    ...data,
    reservation_code: generateReservationCode(),
    company_id: companyId,
    branch_id: branchId,
    created_by: currentUser.id,
  });

  // Đặt bàn kèm đặt món -> đơn SCHEDULED gắn phiếu đặt (không gán bàn, không trừ kho).
  // Bếp duyệt sau khi khách check-in. Không thu cọc (khách vãng lai/gọi điện).
  if (data.order_items && data.order_items.length) {
    try {
      await orderService.createScheduledPreorder({
        company_id: companyId,
        branch_id: branchId,
        customer_id: data.customer_id,
        reservation_id: id,
        guest_count: data.guest_count,
        items: data.order_items,
      });
    } catch (err) {
      await repo.remove(id); // món không hợp lệ -> gỡ phiếu đặt, không để rác
      throw err;
    }
  }

  return repo.findById(id);
};

exports.update = async (currentUser, id, data) => {
  const reservation = await repo.findById(id);
  if (!reservation) throw new NotFound("Không tìm thấy phiếu đặt bàn");
  assertBranchScope(currentUser, { id: reservation.branch_id, company_id: reservation.company_id });
  if (TERMINAL.includes(reservation.status)) {
    throw new BadRequest("Phiếu đặt đã kết thúc, không thể sửa");
  }
  if (data.reservation_time !== undefined) {
    await assertWithinOpenHours(reservation.branch_id, data.reservation_time);
  }
  if (data.table_id !== undefined && data.table_id !== null) {
    await assertTableInBranch(data.table_id, reservation.branch_id);
  }
  // Doi ngay/gio hen -> danh dau de bep thay canh bao tren don dat mon truoc.
  // Co tu clear khi bep duyet/huy (don roi khoi danh sach SCHEDULED).
  if (data.reservation_date !== undefined || data.reservation_time !== undefined) {
    data.rescheduled_at = new Date();
  }
  await repo.update(id, data);
  return repo.findById(id);
};

exports.changeStatus = async (currentUser, id, status) => {
  const reservation = await repo.findById(id);
  if (!reservation) throw new NotFound("Không tìm thấy phiếu đặt bàn");
  assertBranchScope(currentUser, { id: reservation.branch_id, company_id: reservation.company_id });
  if (reservation.status === status) return reservation;
  if (TERMINAL.includes(reservation.status)) {
    throw new BadRequest("Phiếu đặt đã kết thúc, không thể đổi trạng thái");
  }
  await repo.update(id, { status });
  // Xu ly coc theo trang thai ket thuc: NO_SHOW -> mat coc, CANCELLED -> hoan coc.
  if (status === "NO_SHOW") await depositService.forfeitDeposit(id);
  else if (status === "CANCELLED") await depositService.refundDeposit(id);
  return repo.findById(id);
};

// Goi y ban trong cho 1 phieu dat (le tan/quan ly xac nhan).
exports.suggestTable = async (currentUser, id) => {
  const reservation = await repo.findById(id);
  if (!reservation) throw new NotFound("Không tìm thấy phiếu đặt bàn");
  assertBranchScope(currentUser, { id: reservation.branch_id, company_id: reservation.company_id });
  const t = await repo.suggestFreeTable(
    reservation.branch_id, reservation.guest_count, reservation.reservation_date, reservation.reservation_time
  );
  return t || null;
};

// Gan ban giu cho (SUPER/COMPANY/BRANCH manager + RECEPTIONIST).
exports.assignTable = async (currentUser, id, tableId) => {
  const reservation = await repo.findById(id);
  if (!reservation) throw new NotFound("Không tìm thấy phiếu đặt bàn");
  assertBranchScope(currentUser, { id: reservation.branch_id, company_id: reservation.company_id });
  if (TERMINAL.includes(reservation.status)) throw new BadRequest("Phiếu đặt đã kết thúc");
  const table = await repo.findTable(tableId);
  if (!table) throw new BadRequest("Bàn không tồn tại");
  if (table.branch_id !== reservation.branch_id) throw new BadRequest("Bàn không thuộc chi nhánh của phiếu đặt");
  if (Number(table.capacity) < Number(reservation.guest_count)) {
    throw new BadRequest(`Bàn chỉ ${table.capacity} chỗ, không đủ cho ${reservation.guest_count} khách`);
  }
  const conflict = await repo.hasReservationConflict(
    tableId, reservation.reservation_date, reservation.reservation_time, reservation.id
  );
  if (conflict) {
    throw new BadRequest("Bàn này đã có phiếu đặt khác trong khung giờ, vui lòng chọn bàn khác.");
  }
  await repo.assign(id, tableId);
  // Neu phieu co dat mon truoc (order SCHEDULED) -> gan luon ban do de bep thay & duyet.
  await orderRepo.setScheduledOrderTable(pool, id, tableId);
  return repo.findById(id);
};

// Danh sach canh bao truoc gio hen: tinh trang thai READY / CONFLICT / NO_TABLE / OVERDUE.
exports.getAlerts = async (currentUser) => {
  const rows = await repo.findAlerts(currentUser, env.RESERVATION_ALERT_MINUTES);
  return rows.map((r) => {
    let state, message;
    if (r.table_id == null) {
      state = "NO_TABLE";
      message = `Chưa gán bàn cho "${r.customer_name}" (${r.guest_count} khách, ${r.reservation_time}). Còn ${r.free_tables} bàn trống đủ chỗ.`;
    } else if (OCCUPIED_TABLE_STATUSES.includes(r.table_status)) {
      state = "CONFLICT";
      message = `Bàn ${r.table_number} còn khách nhưng có đặt lúc ${r.reservation_time}. Cần đổi bàn (còn ${r.free_tables} bàn trống đủ chỗ).`;
    } else {
      state = "READY";
      message = `Bàn ${r.table_number} sẵn sàng cho "${r.customer_name}" lúc ${r.reservation_time}.`;
    }
    if (r.minutes_until < 0) state = state === "READY" ? "READY" : "OVERDUE";
    return { ...r, state, message };
  });
};

exports.checkin = async (currentUser, id, tableId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const reservation = await repo.lockForCheckin(client, id);
    if (!reservation) throw new NotFound("Không tìm thấy phiếu đặt bàn");
    assertBranchScope(currentUser, { id: reservation.branch_id, company_id: reservation.company_id });
    if (TERMINAL.includes(reservation.status)) throw new BadRequest("Phiếu đặt đã kết thúc, không thể check-in");

    const finalTableId = tableId ?? reservation.table_id;
    if (finalTableId == null) throw new BadRequest("Cần chọn bàn để check-in");
    const table = await repo.findTable(finalTableId);
    if (!table || table.branch_id !== reservation.branch_id) throw new BadRequest("Bàn không thuộc chi nhánh của phiếu đặt");
    if (table.status === "SERVING" || table.status === "WAIT_PAYMENT") {
      throw new BadRequest("Bàn này đang có khách, không thể nhận khách đặt trước. Vui lòng thanh toán hoặc chuyển bàn cho khách cũ trước.");
    }

    await repo.checkinTx(client, id, finalTableId, currentUser.id);
    // Kich hoat don dat truoc (neu co): gan ban + nhan vien, SCHEDULED -> CONFIRMED
    const preorderId = await orderService.activatePreorder(client, id, finalTableId, currentUser.id);
    if (!preorderId) {
      const d = new Date();
      const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      const orderCode = "OD" + datePart + Math.random().toString(36).slice(2, 8).toUpperCase();
      await orderRepo.insertOrder(client, {
        order_code: orderCode,
        company_id: reservation.company_id,
        branch_id: reservation.branch_id,
        table_id: finalTableId,
        waiter_id: currentUser.id,
        subtotal: 0,
        vat_amount: 0,
        total_amount: 0,
        note: `Nhận khách từ phiếu đặt của: ${reservation.customer_name}`,
      });
    }
    // Ban chuyen sang dang phuc vu
    await repo.setTableStatus(client, finalTableId, "SERVING");

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  return repo.findById(id);
};

exports.cancel = async (currentUser, id) => {
  const reservation = await repo.findById(id);
  if (!reservation) throw new NotFound("Không tìm thấy phiếu đặt bàn");
  assertBranchScope(currentUser, { id: reservation.branch_id, company_id: reservation.company_id });
  if (reservation.status === "CHECKED_IN" || reservation.status === "COMPLETED") {
    throw new BadRequest("Khách đã đến, không thể hủy phiếu đặt");
  }
  await repo.update(id, { status: "CANCELLED", cancelled_by: currentUser.id, cancelled_at: new Date() });
  await depositService.refundDeposit(id); // hoan coc ve vi khach
  return repo.findById(id);
};
