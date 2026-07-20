// src/modules/internal/voucher/voucher.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const { parseId } = require("../../../shared/utils/parseId");
const service = require("./voucher.service");

exports.list = asyncHandler(async (req, res) => {
  const vouchers = await service.list(req.user, {
    company_id: req.query.company_id != null ? parseId(req.query.company_id, "company id") : undefined,
    status: req.query.status,
  });
  res.json({ message: "Lấy danh sách voucher thành công", vouchers });
});

exports.get = asyncHandler(async (req, res) => {
  const voucher = await service.get(req.user, parseId(req.params.id, "voucher id"));
  res.json({ message: "Lấy voucher thành công", voucher });
});

exports.create = asyncHandler(async (req, res) => {
  const voucher = await service.create(req.user, req.body);
  res.status(201).json({ message: "Tạo voucher thành công", voucher });
});

exports.update = asyncHandler(async (req, res) => {
  const voucher = await service.update(req.user, parseId(req.params.id, "voucher id"), req.body);
  res.json({ message: "Cập nhật voucher thành công", voucher });
});

exports.remove = asyncHandler(async (req, res) => {
  await service.deactivate(req.user, parseId(req.params.id, "voucher id"));
  res.json({ message: "Đã ngừng sử dụng voucher" });
});

exports.assign = asyncHandler(async (req, res) => {
  const result = await service.assign(req.user, parseId(req.params.id, "voucher id"), req.body);
  res.json({ message: `Đã cấp ${result.issued} voucher, bỏ qua ${result.skipped}`, ...result });
});
