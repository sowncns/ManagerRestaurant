// src/modules/internal/checkout/checkout.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const { BadRequest } = require("../../../shared/errors/AppError");
const service = require("./checkout.service");
const audit = require("../../../shared/services/audit.service");

exports.voidItem = asyncHandler(async (req, res) => {
  const orderItemId = Number(req.params.order_item_id);
  if (!Number.isInteger(orderItemId) || orderItemId <= 0) throw new BadRequest("order item id không hợp lệ");
  const result = await service.voidItem(req.user, orderItemId, req.body);
  audit.record(audit.ctx(req), {
    action: "VOID_ITEM",
    entityType: "ORDER_ITEM",
    entityId: orderItemId,
    description: `Thu ngân void món khỏi bill (−${(result.voided_amount || 0).toLocaleString("vi-VN")}đ)`,
    metadata: { reason_code: result.reason_code, note: result.note, voided_amount: result.voided_amount },
  });
  res.json(result);
});

exports.discountItem = asyncHandler(async (req, res) => {
  const orderItemId = Number(req.params.order_item_id);
  if (!Number.isInteger(orderItemId) || orderItemId <= 0) throw new BadRequest("order item id không hợp lệ");
  const result = await service.discountItem(req.user, orderItemId, req.body);
  audit.record(audit.ctx(req), {
    action: "DISCOUNT_ITEM",
    entityType: "ORDER_ITEM",
    entityId: orderItemId,
    description: `Thu ngân giảm ${result.discount_percent}% cho món (−${(result.discounted_amount || 0).toLocaleString("vi-VN")}đ)`,
    metadata: { discount_percent: result.discount_percent, note: result.note, discounted_amount: result.discounted_amount },
  });
  res.json(result);
});

exports.reduceQuantity = asyncHandler(async (req, res) => {
  const orderItemId = Number(req.params.order_item_id);
  if (!Number.isInteger(orderItemId) || orderItemId <= 0) throw new BadRequest("order item id không hợp lệ");
  const result = await service.reduceQuantity(req.user, orderItemId, req.body);
  audit.record(audit.ctx(req), {
    action: "REDUCE_ITEM_QTY",
    entityType: "ORDER_ITEM",
    entityId: orderItemId,
    description: `Thu ngân giảm số lượng còn ${result.quantity} (−${(result.removed_amount || 0).toLocaleString("vi-VN")}đ)`,
    metadata: { removed_quantity: result.removed_quantity, removed_amount: result.removed_amount, note: result.note },
  });
  res.json(result);
});

exports.createInvoice = asyncHandler(async (req, res) => {
  const { tableId, paymentMethod, customerId } = req.body;
  const result = await service.createInvoice(req.user, tableId, paymentMethod, customerId);
  res.json(result);
});

exports.scanCustomerQR = asyncHandler(async (req, res) => {
  const { tableId, token } = req.body;
  const result = await service.scanCustomerQR(tableId, token);
  res.json({ message: "Quét mã thành công", data: result });
});

exports.getCheckoutIntent = asyncHandler(async (req, res) => {
  const result = await service.getCheckoutIntent(req.params.tableId);
  res.json(result);
});

exports.cancelCheckoutIntent = asyncHandler(async (req, res) => {
  await service.cancelCheckoutIntent(req.params.tableId);
  res.json({ message: "Đã hủy yêu cầu thanh toán thành công" });
});

exports.validateVoucher = asyncHandler(async (req, res) => {
  const { code, orderTotal, tableId, customerRef } = req.body;
  const result = await service.validateVoucher(code, orderTotal, tableId, customerRef);
  res.json({ message: "Áp dụng voucher thành công", data: result });
});

exports.getTableVoucher = asyncHandler(async (req, res) => {
  const result = await service.getTableVoucher(req.params.tableId);
  res.json(result);
});

exports.getLatestInvoice = asyncHandler(async (req, res) => {
  const result = await service.getLatestInvoice(req.params.tableId);
  res.json(result);
});

exports.getKiemMon = asyncHandler(async (req, res) => {
  const result = await service.getKiemMon(req.params.tableId);
  res.json(result);
});

exports.saveTableVat = asyncHandler(async (req, res) => {
  await service.saveTableVat(req.params.tableId, req.body);
  res.json({ message: "Lưu thông tin VAT thành công" });
});

exports.getTableVat = asyncHandler(async (req, res) => {
  const result = await service.getTableVat(req.params.tableId);
  res.json(result);
});

exports.listInvoices = asyncHandler(async (req, res) => {
  const result = await service.listInvoices(req.user, req.query);
  res.json(result);
});

exports.markInvoicePaid = asyncHandler(async (req, res) => {
  const result = await service.markInvoicePaid(req.params.invoiceId);
  res.json(result);
});
