// src/modules/internal/procurement/procurement.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const { BadRequest } = require("../../../shared/errors/AppError");
const service = require("./procurement.service");
const audit = require("../../../shared/services/audit.service");
const { parseId } = require("../../../shared/utils/parseId");

const cid = (req) => {
  const override = Number(req.query.companyId ?? req.body?.companyId);
  return req.user.role === "SUPER_ADMIN" && override ? override : req.user.company_id;
};

// ---------- Suppliers ----------
exports.listSuppliers = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const suppliers = await service.listSuppliers(cid(req), { status, search });
  res.json({ message: "Lấy danh sách nhà cung cấp thành công", suppliers });
});

exports.getSupplier = asyncHandler(async (req, res) => {
  const supplier = await service.getSupplier(parseId(req.params.id, "supplier id"), cid(req));
  res.json({ message: "Lấy nhà cung cấp thành công", supplier });
});

exports.createSupplier = asyncHandler(async (req, res) => {
  const supplier = await service.createSupplier(cid(req), req.body);
  res.status(201).json({ message: "Tạo nhà cung cấp thành công", supplier });
});

exports.updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await service.updateSupplier(parseId(req.params.id, "supplier id"), cid(req), req.body);
  res.json({ message: "Cập nhật nhà cung cấp thành công", supplier });
});

exports.deleteSupplier = asyncHandler(async (req, res) => {
  await service.deleteSupplier(parseId(req.params.id, "supplier id"), cid(req));
  res.json({ message: "Đã ngưng sử dụng nhà cung cấp" });
});

// ---------- Purchase receipts ----------
exports.listReceipts = asyncHandler(async (req, res) => {
  const { status, supplierId, limit } = req.query;
  const receipts = await service.listReceipts(cid(req), {
    status,
    supplierId: supplierId ? Number(supplierId) : undefined,
    limit: limit ? Math.min(Number(limit), 500) : 100,
  });
  res.json({ message: "Lấy danh sách phiếu nhập thành công", receipts });
});

exports.getReceipt = asyncHandler(async (req, res) => {
  const receipt = await service.getReceipt(parseId(req.params.id, "receipt id"), cid(req));
  res.json({ message: "Lấy phiếu nhập thành công", receipt });
});

exports.createReceipt = asyncHandler(async (req, res) => {
  const receipt = await service.createReceipt(cid(req), req.user.id, req.body);
  res.status(201).json({ message: "Tạo phiếu nhập thành công", receipt });
});

exports.confirmReceipt = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, "receipt id");
  const receipt = await service.confirmReceipt(id, cid(req), req.user.id);
  audit.record(audit.ctx(req), {
    action: "CONFIRM", entityType: "PURCHASE_RECEIPT", entityId: id,
    description: `Xác nhận phiếu nhập ${receipt.receipt_code} (NCC: ${receipt.supplier_name})`,
    metadata: { total_amount: receipt.total_amount },
  });
  res.json({ message: "Xác nhận phiếu nhập & cập nhật tồn kho thành công", receipt });
});

exports.getReceiptByCode = asyncHandler(async (req, res) => {
  const { code } = req.params;
  if (!code) throw BadRequest("Thiếu mã phiếu");
  const receipt = await service.getReceiptByCode(code, cid(req));
  res.json({ message: "Lấy phiếu nhập theo mã thành công", receipt });
});

exports.importReceiptByCode = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) throw BadRequest("Thiếu mã phiếu");
  const branchId = req.body.branchId ? Number(req.body.branchId) : (req.user.branch_id || null);
  const result = await service.importReceiptByCode(code, cid(req), branchId, req.user.id);
  audit.record(audit.ctx(req), {
    action: "IMPORT", entityType: "PURCHASE_RECEIPT", entityId: result.receipt.id,
    description: `Nhập kho theo phiếu ${code}`,
    metadata: { itemCount: result.itemCount },
  });
  res.json({ message: "Nhập kho từ phiếu thành công", receipt: result.receipt });
});

exports.cancelReceipt = asyncHandler(async (req, res) => {
  const receipt = await service.cancelReceipt(parseId(req.params.id, "receipt id"), cid(req));
  res.json({ message: "Đã hủy phiếu nhập", receipt });
});
