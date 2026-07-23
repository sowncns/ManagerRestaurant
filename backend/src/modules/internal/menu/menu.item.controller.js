// src/modules/internal/menu/menu.item.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const { BadRequest } = require("../../../shared/errors/AppError");
const service = require("./menu.service");
const audit = require("../../../shared/services/audit.service");
const { parseId } = require("../../../shared/utils/parseId");
const { resolveCompanyId } = require("../../../shared/utils/resolveCompanyId");

exports.list = asyncHandler(async (req, res) => {
  const { category_id, is_available, search } = req.query;
  const items = await service.listItems(resolveCompanyId(req), {
    category_id: category_id ? Number(category_id) : undefined,
    is_available: is_available !== undefined ? is_available === "true" : undefined,
    search,
    branchId: req.user.branch_id ?? null,
  });
  res.json({ message: "Lấy danh sách món thành công", items });
});

exports.get = asyncHandler(async (req, res) => {
  const item = await service.getItem(parseId(req.params.id), resolveCompanyId(req), req.user.branch_id ?? null);
  res.json({ message: "Lấy món ăn thành công", item });
});

exports.create = asyncHandler(async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) throw new BadRequest("Thiếu thông tin công ty");
  const item = await service.createItem(companyId, req.body);
  audit.record(audit.ctx(req), {
    action: "CREATE", entityType: "MENU_ITEM", entityId: item.id,
    description: `Tạo món "${item.name}"`,
  });
  res.status(201).json({ message: "Tạo món ăn thành công", item });
});

exports.update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const companyId = resolveCompanyId(req);
  if (!companyId) throw new BadRequest("Thiếu thông tin công ty");
  const item = await service.updateItem(id, companyId, req.body);
  audit.record(audit.ctx(req), {
    action: "UPDATE", entityType: "MENU_ITEM", entityId: id,
    description: `Cập nhật món "${item.name}"`,
  });
  res.json({ message: "Cập nhật món ăn thành công", item });
});

exports.setAvailability = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const companyId = resolveCompanyId(req);
  if (!companyId) throw new BadRequest("Thiếu thông tin công ty");
  const item = await service.setAvailability(id, companyId, req.body.is_available, req.user.branch_id ?? null);
  const scope = req.user.branch_id ? " tại chi nhánh" : "";
  audit.record(audit.ctx(req), {
    action: "UPDATE", entityType: "MENU_ITEM", entityId: id,
    description: `${req.body.is_available ? "Bật" : "Tắt"} phục vụ món "${item.name}"${scope}`,
  });
  res.json({ message: "Cập nhật trạng thái phục vụ thành công", item });
});

exports.remove = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const companyId = resolveCompanyId(req);
  if (!companyId) throw new BadRequest("Thiếu thông tin công ty");
  await service.removeItem(id, companyId);
  audit.record(audit.ctx(req), {
    action: "DELETE", entityType: "MENU_ITEM", entityId: id,
    description: `Ngưng sử dụng món #${id}`,
  });
  res.json({ message: "Đã ngưng sử dụng món ăn" });
});
