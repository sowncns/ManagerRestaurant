// src/modules/internal/procurement/procurement.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const { BadRequest } = require("../../../shared/errors/AppError");
const service = require("./procurement.service");
const audit = require("../../../shared/services/audit.service");
const { parseId } = require("../../../shared/utils/parseId");

// ---------- Suppliers ----------
exports.listSuppliers = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const suppliers = await service.listSuppliers(req.user.company_id, { status, search });
  res.json({ message: "Lấy danh sách nhà cung cấp thành công", suppliers });
});

exports.getSupplier = asyncHandler(async (req, res) => {
  const supplier = await service.getSupplier(parseId(req.params.id, "supplier id"), req.user.company_id);
  res.json({ message: "Lấy nhà cung cấp thành công", supplier });
});

exports.createSupplier = asyncHandler(async (req, res) => {
  const supplier = await service.createSupplier(req.user.company_id, req.body);
  res.status(201).json({ message: "Tạo nhà cung cấp thành công", supplier });
});

exports.updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await service.updateSupplier(parseId(req.params.id, "supplier id"), req.user.company_id, req.body);
  res.json({ message: "Cập nhật nhà cung cấp thành công", supplier });
});

exports.deleteSupplier = asyncHandler(async (req, res) => {
  await service.deleteSupplier(parseId(req.params.id, "supplier id"), req.user.company_id);
  res.json({ message: "Đã ngưng sử dụng nhà cung cấp" });
});

// ---------- Purchase receipts ----------
exports.listReceipts = asyncHandler(async (req, res) => {
  const { status, supplierId, limit } = req.query;
  const receipts = await service.listReceipts(req.user.company_id, {
    status,
    supplierId: supplierId ? Number(supplierId) : undefined,
    limit: limit ? Math.min(Number(limit), 500) : 100,
  });
  res.json({ message: "Lấy danh sách phiếu nhập thành công", receipts });
});

exports.getReceipt = asyncHandler(async (req, res) => {
  const receipt = await service.getReceipt(parseId(req.params.id, "receipt id"), req.user.company_id);
  res.json({ message: "Lấy phiếu nhập thành công", receipt });
});

exports.createReceipt = asyncHandler(async (req, res) => {
  const receipt = await service.createReceipt(req.user.company_id, req.user.id, req.body);
  res.status(201).json({ message: "Tạo phiếu nhập thành công", receipt });
});

exports.confirmReceipt = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, "receipt id");
  const receipt = await service.confirmReceipt(id, req.user.company_id, req.user.id);
  audit.record(audit.ctx(req), {
    action: "CONFIRM", entityType: "PURCHASE_RECEIPT", entityId: id,
    description: `Xác nhận phiếu nhập ${receipt.receipt_code} (NCC: ${receipt.supplier_name})`,
    metadata: { total_amount: receipt.total_amount },
  });
  res.json({ message: "Xác nhận phiếu nhập & cập nhật tồn kho thành công", receipt });
});

exports.cancelReceipt = asyncHandler(async (req, res) => {
  const receipt = await service.cancelReceipt(parseId(req.params.id, "receipt id"), req.user.company_id);
  res.json({ message: "Đã hủy phiếu nhập", receipt });
});
