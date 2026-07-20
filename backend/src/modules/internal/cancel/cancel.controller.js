// src/modules/internal/cancel/cancel.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const { BadRequest } = require("../../../shared/errors/AppError");
const service = require("./cancel.service");
const audit = require("../../../shared/services/audit.service");
const { parseId } = require("../../../shared/utils/parseId");

// POST /internal/orders/:order_id/items/:order_item_id/cancel-request
exports.createRequest = asyncHandler(async (req, res) => {
  const orderId = parseId(req.params.order_id, "order id");
  const orderItemId = parseId(req.params.order_item_id, "order item id");
  const result = await service.createRequest({
    orderId,
    orderItemId,
    user: req.user,
    reason_code: req.body.reason_code,
    reason_note: req.body.reason_note,
    requested_qty: req.body.requested_qty,
  });
  audit.record(audit.ctx(req), {
    action: result.is_mistake ? "CANCEL_REQUEST_MISTAKE" : "CANCEL_REQUEST",
    entityType: "ORDER_ITEM",
    entityId: orderItemId,
    description: `Yêu cầu hủy món (order #${orderId})`,
    metadata: {
      cancel_request_id: result.cancel_request_id,
      status: result.status,
      reason_code: req.body.reason_code,
      is_mistake: result.is_mistake,
    },
  });
  res.status(201).json(result);
});

// GET /internal/cancel-requests?status=PENDING
exports.list = asyncHandler(async (req, res) => {
  const items = await service.list(req.user, { status: req.query.status });
  res.json({ items });
});

// PATCH /internal/cancel-requests/:cancel_request_id/accept
exports.accept = asyncHandler(async (req, res) => {
  const id = parseId(req.params.cancel_request_id, "cancel request id");
  const result = await service.accept({ cancelRequestId: id, user: req.user });
  audit.record(audit.ctx(req), {
    action: "CANCEL_ACCEPT",
    entityType: "ORDER_ITEM",
    entityId: result.order_item_id,
    description: `Bếp chấp nhận hủy (yêu cầu #${id})`,
    metadata: { cancel_request_id: id, to_status: "CANCELLED", stock_effect: "NONE" },
  });
  res.json(result);
});

// PATCH /internal/cancel-requests/:cancel_request_id/reject
exports.reject = asyncHandler(async (req, res) => {
  const id = parseId(req.params.cancel_request_id, "cancel request id");
  const result = await service.reject({
    cancelRequestId: id,
    user: req.user,
    decision_note: req.body.decision_note,
  });
  audit.record(audit.ctx(req), {
    action: "CANCEL_REJECT",
    entityType: "ORDER_ITEM",
    entityId: result.order_item_id,
    description: `Bếp từ chối hủy → nhầm lẫn (yêu cầu #${id})`,
    metadata: { cancel_request_id: id, is_mistake: true, stock_effect: "WASTE" },
  });
  res.json(result);
});

// PATCH /internal/cancel-requests/:cancel_request_id/withdraw
exports.withdraw = asyncHandler(async (req, res) => {
  const id = parseId(req.params.cancel_request_id, "cancel request id");
  const result = await service.withdraw({ cancelRequestId: id, user: req.user });
  audit.record(audit.ctx(req), {
    action: "CANCEL_WITHDRAW",
    entityType: "CANCEL_REQUEST",
    entityId: id,
    description: `Phục vụ rút yêu cầu hủy #${id}`,
  });
  res.json(result);
});
