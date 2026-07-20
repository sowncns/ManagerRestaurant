// src/modules/internal/menu/menu.category.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const { BadRequest } = require("../../../shared/errors/AppError");
const service = require("./menu.service");
const audit = require("../../../shared/services/audit.service");
const { parseId } = require("../../../shared/utils/parseId");
const { resolveCompanyId } = require("../../../shared/utils/resolveCompanyId");

exports.list = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const categories = await service.listCategories(resolveCompanyId(req), { status });
  res.json({ message: "Lấy danh sách danh mục thành công", categories });
});

exports.get = asyncHandler(async (req, res) => {
  const category = await service.getCategory(parseId(req.params.id), resolveCompanyId(req));
  res.json({ message: "Lấy danh mục thành công", category });
});

exports.create = asyncHandler(async (req, res) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) throw new BadRequest("Thiếu thông tin công ty");
  const category = await service.createCategory(companyId, req.body);
  audit.record(audit.ctx(req), {
    action: "CREATE", entityType: "MENU_CATEGORY", entityId: category.id,
    description: `Tạo danh mục "${category.name}"`,
  });
  res.status(201).json({ message: "Tạo danh mục thành công", category });
});

exports.update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const companyId = resolveCompanyId(req);
  if (!companyId) throw new BadRequest("Thiếu thông tin công ty");
  const category = await service.updateCategory(id, companyId, req.body);
  audit.record(audit.ctx(req), {
    action: "UPDATE", entityType: "MENU_CATEGORY", entityId: id,
    description: `Cập nhật danh mục "${category.name}"`,
  });
  res.json({ message: "Cập nhật danh mục thành công", category });
});

exports.remove = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const companyId = resolveCompanyId(req);
  if (!companyId) throw new BadRequest("Thiếu thông tin công ty");
  await service.removeCategory(id, companyId);
  audit.record(audit.ctx(req), {
    action: "DELETE", entityType: "MENU_CATEGORY", entityId: id,
    description: `Ngưng sử dụng danh mục #${id}`,
  });
  res.json({ message: "Đã ngưng sử dụng danh mục" });
});
