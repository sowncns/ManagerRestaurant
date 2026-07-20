// src/modules/internal/reservation/reservation.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const { BadRequest } = require("../../../shared/errors/AppError");
const service = require("./reservation.service");
const audit = require("../../../shared/services/audit.service");
const { parseId } = require("../../../shared/utils/parseId");
const realtime = require("../../../shared/services/realtime.service");

exports.list = asyncHandler(async (req, res) => {
  const { date, status, branch_id, search } = req.query;
  const reservations = await service.list(req.user, {
    date,
    status,
    branch_id: branch_id ? Number(branch_id) : undefined,
    search,
  });
  res.json({ message: "Lấy danh sách đặt bàn thành công", reservations });
});

exports.get = asyncHandler(async (req, res) => {
  const reservation = await service.get(req.user, parseId(req.params.id, "reservation id"));
  res.json({ message: "Lấy phiếu đặt bàn thành công", reservation });
});

exports.create = asyncHandler(async (req, res) => {
  const reservation = await service.create(req.user, req.body);
  audit.record(audit.ctx(req), {
    action: "CREATE", entityType: "RESERVATION", entityId: reservation.id,
    description: `Tạo phiếu đặt bàn cho "${reservation.customer_name}" (${reservation.reservation_date} ${reservation.reservation_time})`,
  });
  res.status(201).json({ message: "Tạo phiếu đặt bàn thành công", reservation });
});

exports.update = asyncHandler(async (req, res) => {
  const reservation = await service.update(req.user, parseId(req.params.id, "reservation id"), req.body);
  res.json({ message: "Cập nhật phiếu đặt bàn thành công", reservation });
});

exports.changeStatus = asyncHandler(async (req, res) => {
  const reservation = await service.changeStatus(req.user, parseId(req.params.id, "reservation id"), req.body.status);
  res.json({ message: "Cập nhật trạng thái đặt bàn thành công", reservation });
});

exports.checkin = asyncHandler(async (req, res) => {
  const reservation = await service.checkin(req.user, parseId(req.params.id, "reservation id"), req.body.table_id);
  res.json({ message: "Check-in phiếu đặt bàn thành công", reservation });
});

exports.getAlerts = asyncHandler(async (req, res) => {
  const alerts = await service.getAlerts(req.user);
  res.json({ message: "Cảnh báo đặt bàn sắp tới", alerts });
});

exports.suggestTable = asyncHandler(async (req, res) => {
  const table = await service.suggestTable(req.user, parseId(req.params.id, "reservation id"));
  res.json({ message: table ? "Gợi ý bàn phù hợp" : "Không còn bàn trống phù hợp", table });
});

exports.assignTable = asyncHandler(async (req, res) => {
  const reservation = await service.assignTable(req.user, parseId(req.params.id, "reservation id"), req.body.table_id);
  audit.record(audit.ctx(req), {
    action: "ASSIGN_TABLE", entityType: "RESERVATION", entityId: reservation.id,
    description: `Gán bàn cho phiếu đặt #${reservation.id}`,
  });
  res.json({ message: "Gán bàn thành công", reservation });
});

exports.cancel = asyncHandler(async (req, res) => {
  const reservation = await service.cancel(req.user, parseId(req.params.id, "reservation id"));
  res.json({ message: "Đã hủy phiếu đặt bàn", reservation });
});

// SSE: push thay doi reservations xuong le tan ngay (thay polling alerts).
exports.stream = (req, res) => realtime.stream("reservations", req, res);
