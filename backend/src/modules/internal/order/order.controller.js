// src/modules/internal/order/order.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const { BadRequest } = require("../../../shared/errors/AppError");
const service = require("./order.service");
const { parseId } = require("../../../shared/utils/parseId");
const realtime = require("../../../shared/services/realtime.service");

exports.createOrder = asyncHandler(async (req, res) => {
  const order = await service.createOrder({
    ...req.body,
    company_id: req.user.company_id,
    branch_id: req.user.branch_id,
    waiter_id: req.user.employee_id || req.user.id,
  });
  res.status(201).json(order);
});

exports.getOrder = asyncHandler(async (req, res) => {
  const orderId = parseId(req.params.id, "order id");
  const order = await service.getOrder(orderId, req.user.company_id, req.user.branch_id);
  res.json(order);
});

exports.addOrderItems = asyncHandler(async (req, res) => {
  const orderId = parseId(req.params.id, "order id");
  const order = await service.addOrderItems(orderId, {
    ...req.body,
    company_id: req.user.company_id,
    branch_id: req.user.branch_id,
    waiter_id: req.user.employee_id,
  });
  res.json(order);
});

exports.getActiveOrderForTable = asyncHandler(async (req, res) => {
  const tableId = parseId(req.params.tableId, "table id");
  const order = await service.getActiveOrderForTable(tableId, req.user.company_id, req.user.branch_id);
  res.json(order || { message: "No active order for this table" });
});

exports.scanMemberQR = asyncHandler(async (req, res) => {
  const orderId = parseId(req.params.id, "order id");
  const result = await service.scanMemberQR(
    orderId,
    req.body.qrCode,
    req.user.company_id,
    req.user.branch_id
  );
  res.json(result);
});

// ---- Bep (Kitchen) ----
exports.getKitchenHistory = asyncHandler(async (req, res) => {
  const items = await service.getKitchenHistory(req.user);
  res.json({ message: "Lịch sử bếp", items });
});

exports.getKitchenQueue = asyncHandler(async (req, res) => {
  const items = await service.getKitchenQueue(req.user);
  res.json({ message: "Hàng chờ bếp", items });
});

exports.startCooking = asyncHandler(async (req, res) => {
  const orderId = parseId(req.params.id, "order id");
  const result = await service.startCookingOrder(req.user, orderId);
  res.json(result);
});

exports.updateItemKitchenStatus = asyncHandler(async (req, res) => {
  const itemId = parseId(req.params.itemId, "order item id");
  const result = await service.updateItemKitchenStatus(req.user, itemId, req.body.status);
  res.json({ message: "Cập nhật trạng thái bếp thành công", ...result });
});

// ---- Don dat truoc (bep duyet) ----
exports.getPreorders = asyncHandler(async (req, res) => {
  const items = await service.listPreorders(req.user);
  res.json({ message: "Món đặt trước", items });
});

exports.confirmPreorder = asyncHandler(async (req, res) => {
  const reservationId = parseId(req.params.reservationId, "reservation id");
  const result = await service.confirmPreorder(req.user, reservationId);
  res.json({ message: "Đã duyệt đơn đặt trước, món xuống bếp", ...result });
});

exports.cancelPreorder = asyncHandler(async (req, res) => {
  const reservationId = parseId(req.params.reservationId, "reservation id");
  await service.cancelPreorder(req.user, reservationId);
  res.json({ message: "Đã hủy đơn đặt trước và hoàn cọc cho khách" });
});

// Quet QR phieu mon -> danh dau nau xong (READY).
exports.completeItemByQr = asyncHandler(async (req, res) => {
  const result = await service.completeItemByQr(req.user, req.body.qrCode);
  res.json({ message: "Đã báo nấu xong món", ...result });
});

// SSE: push thay doi order_items xuong bep ngay (thay polling kitchen/queue).
exports.streamKitchen = (req, res) => realtime.stream("order_items", req, res);
