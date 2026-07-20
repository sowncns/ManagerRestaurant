// src/modules/internal/combo/combo.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const service = require("./combo.service");
const audit = require("../../../shared/services/audit.service");
const { parseId } = require("../../../shared/utils/parseId");

exports.list = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const combos = await service.list(req.user.company_id, { status, search });
  res.json({ message: "Lấy danh sách combo thành công", combos });
});

exports.get = asyncHandler(async (req, res) => {
  const combo = await service.get(parseId(req.params.id), req.user.company_id);
  res.json({ message: "Lấy combo thành công", combo });
});

exports.create = asyncHandler(async (req, res) => {
  const combo = await service.create(req.user.company_id, req.body);
  audit.record(audit.ctx(req), {
    action: "CREATE", entityType: "COMBO", entityId: combo.id,
    description: `Tạo combo "${combo.name}"`,
  });
  res.status(201).json({ message: "Tạo combo thành công", combo });
});

exports.update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const combo = await service.update(id, req.user.company_id, req.body);
  audit.record(audit.ctx(req), {
    action: "UPDATE", entityType: "COMBO", entityId: id,
    description: `Cập nhật combo "${combo.name}"`,
  });
  res.json({ message: "Cập nhật combo thành công", combo });
});

exports.remove = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  await service.remove(id, req.user.company_id);
  audit.record(audit.ctx(req), {
    action: "DELETE", entityType: "COMBO", entityId: id,
    description: `Ngưng sử dụng combo #${id}`,
  });
  res.json({ message: "Đã ngưng sử dụng combo" });
});
