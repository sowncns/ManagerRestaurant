// src/modules/internal/procurement/procurement.service.js
// Tang nghiep vu: Nha cung cap + Phieu nhap kho.
// Pham vi theo company_id (giong inventory). Xac nhan phieu -> cong ton kho & ghi
// inventory_transactions (PURCHASE, reference_type='PURCHASE_RECEIPT').
const repo = require("./procurement.repository");
const inventoryRepo = require("../inventory/inventory.repository");
const { NotFound, BadRequest, Conflict } = require("../../../shared/errors/AppError");

// ---------- Suppliers ----------
exports.listSuppliers = (companyId, filters) => repo.findSuppliers(companyId, filters);

exports.getSupplier = async (id, companyId) => {
  const supplier = await repo.findSupplierById(id, companyId);
  if (!supplier) throw new NotFound("Không tìm thấy nhà cung cấp");
  return supplier;
};

exports.createSupplier = (companyId, data) => repo.insertSupplier(companyId, data);

exports.updateSupplier = async (id, companyId, data) => {
  const supplier = await repo.updateSupplier(id, companyId, data);
  if (!supplier) throw new NotFound("Không tìm thấy nhà cung cấp");
  return supplier;
};

exports.deleteSupplier = async (id, companyId) => {
  const supplier = await repo.updateSupplier(id, companyId, { status: "INACTIVE" });
  if (!supplier) throw new NotFound("Không tìm thấy nhà cung cấp");
  return supplier;
};

// ---------- Purchase receipts ----------
exports.listReceipts = (companyId, filters) => repo.findReceipts(companyId, filters);

exports.getReceipt = async (id, companyId) => {
  const receipt = await repo.findReceiptById(id, companyId);
  if (!receipt) throw new NotFound("Không tìm thấy phiếu nhập");
  const items = await repo.findReceiptItems(id);
  return { ...receipt, items };
};

exports.createReceipt = async (companyId, createdBy, data) => {
  // NCC phai thuoc cong ty & con hoat dong
  const supplier = await repo.findSupplierById(data.supplier_id, companyId);
  if (!supplier) throw new BadRequest("Nhà cung cấp không tồn tại");
  if (supplier.status !== "ACTIVE") throw new BadRequest("Nhà cung cấp đã ngưng hoạt động");

  // Nguyen lieu phai thuoc cung cong ty; tinh line_amount.
  const items = [];
  for (const it of data.items) {
    const ing = await inventoryRepo.findIngredientById(it.ingredient_id, companyId);
    if (!ing) throw new BadRequest(`Nguyên liệu #${it.ingredient_id} không tồn tại hoặc không thuộc công ty`);
    const unitPrice = Number(it.unit_price ?? 0);
    items.push({
      ingredient_id: it.ingredient_id,
      quantity: Number(it.quantity),
      unit_price: unitPrice,
      line_amount: Number((Number(it.quantity) * unitPrice).toFixed(2)),
      note: it.note,
    });
  }

  const header = {
    supplier_id: data.supplier_id,
    branch_id: data.branch_id ?? null,
    receipt_code: data.receipt_code || `PN-${Date.now()}`,
    receipt_date: data.receipt_date ?? null,
    note: data.note ?? null,
    created_by: createdBy,
  };

  let id;
  try {
    id = await repo.createReceipt(companyId, header, items);
  } catch (e) {
    if (e.code === "23505") throw new Conflict("Mã phiếu nhập đã tồn tại");
    throw e;
  }
  return exports.getReceipt(id, companyId);
};

exports.confirmReceipt = async (id, companyId, staffId) => {
  const result = await repo.confirmReceipt(id, companyId, staffId);
  if (result.error === "NOT_FOUND") throw new NotFound("Không tìm thấy phiếu nhập");
  if (result.error === "NOT_DRAFT") throw new BadRequest(`Phiếu đã ở trạng thái ${result.status}, không thể xác nhận`);
  if (result.error === "INGREDIENT_NOT_FOUND") throw new BadRequest(`Nguyên liệu #${result.ingredientId} không hợp lệ`);
  return exports.getReceipt(id, companyId);
};

exports.cancelReceipt = async (id, companyId) => {
  const existing = await repo.findReceiptById(id, companyId);
  if (!existing) throw new NotFound("Không tìm thấy phiếu nhập");
  if (existing.status !== "DRAFT") throw new BadRequest("Chỉ hủy được phiếu ở trạng thái nháp (DRAFT)");
  await repo.cancelReceipt(id, companyId);
  return exports.getReceipt(id, companyId);
};
