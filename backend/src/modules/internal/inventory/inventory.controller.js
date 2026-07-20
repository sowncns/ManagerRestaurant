// src/modules/internal/inventory/inventory.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const { BadRequest } = require("../../../shared/errors/AppError");
const service = require("./inventory.service");
const { parseId } = require("../../../shared/utils/parseId");

// Helper to get company and branch context
function getInventoryContext(req) {
  const { companyId, branchId } = req.query;
  const cId = req.user.role === "SUPER_ADMIN" && companyId ? Number(companyId) : req.user.company_id;
  const bId = (req.user.role === "SUPER_ADMIN" || req.user.role === "COMPANY_ADMIN") && branchId 
    ? Number(branchId) 
    : req.user.branch_id;
  return { cId, bId };
}

// ---------- Ingredients ----------
exports.listIngredients = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const { cId, bId } = getInventoryContext(req);
  if (!cId) return res.json({ message: "Chưa chọn công ty", ingredients: [] });
  const ingredients = await service.listIngredients(cId, bId, { status, search });
  res.json({ message: "Lấy danh sách nguyên liệu thành công", ingredients });
});

exports.listLowStock = asyncHandler(async (req, res) => {
  const { cId, bId } = getInventoryContext(req);
  if (!cId) return res.json({ message: "Chưa chọn công ty", ingredients: [] });
  const ingredients = await service.listLowStock(cId, bId);
  res.json({ message: "Danh sách nguyên liệu dưới mức tối thiểu", ingredients });
});

exports.getIngredient = asyncHandler(async (req, res) => {
  const { cId, bId } = getInventoryContext(req);
  const ingredient = await service.getIngredient(parseId(req.params.id, "ingredient id"), cId, bId);
  res.json({ message: "Lấy nguyên liệu thành công", ingredient });
});

exports.createIngredient = asyncHandler(async (req, res) => {
  // Use body for creation params instead of query since it's a POST
  const cId = req.user.role === "SUPER_ADMIN" && req.body.companyId ? Number(req.body.companyId) : req.user.company_id;
  const bId = (req.user.role === "SUPER_ADMIN" || req.user.role === "COMPANY_ADMIN") && req.body.branchId 
    ? Number(req.body.branchId) 
    : req.user.branch_id;
  
  if (!cId) throw new BadRequest("Thiếu công ty");
  const ingredient = await service.createIngredient(cId, bId, req.body);
  res.status(201).json({ message: "Tạo nguyên liệu thành công", ingredient });
});

exports.updateIngredient = asyncHandler(async (req, res) => {
  const cId = req.user.role === "SUPER_ADMIN" && req.body.companyId ? Number(req.body.companyId) : req.user.company_id;
  const bId = (req.user.role === "SUPER_ADMIN" || req.user.role === "COMPANY_ADMIN") && req.body.branchId 
    ? Number(req.body.branchId) 
    : req.user.branch_id;
  const ingredient = await service.updateIngredient(parseId(req.params.id, "ingredient id"), cId, bId, req.body);
  res.json({ message: "Cập nhật nguyên liệu thành công", ingredient });
});

exports.deleteIngredient = asyncHandler(async (req, res) => {
  const { cId } = getInventoryContext(req);
  await service.deleteIngredient(parseId(req.params.id, "ingredient id"), cId);
  res.json({ message: "Đã ngưng sử dụng nguyên liệu" });
});

// ---------- Recipes ----------
exports.getRecipe = asyncHandler(async (req, res) => {
  const { cId } = getInventoryContext(req);
  const data = await service.getRecipeByMenuItem(parseId(req.params.menuItemId, "menu item id"), cId);
  res.json({ message: "Lấy công thức thành công", ...data });
});

exports.setRecipe = asyncHandler(async (req, res) => {
  const { cId } = getInventoryContext(req);
  const data = await service.setRecipe(parseId(req.params.menuItemId, "menu item id"), cId, req.body.items);
  res.json({ message: "Cập nhật công thức thành công", ...data });
});

exports.deleteRecipeLine = asyncHandler(async (req, res) => {
  await service.deleteRecipeLine(parseId(req.params.id, "recipe id"));
  res.json({ message: "Đã xóa dòng công thức" });
});

// ---------- Phieu kho + lich su ----------
exports.createStockTransaction = asyncHandler(async (req, res) => {
  const cId = req.user.role === "SUPER_ADMIN" && req.body.companyId ? Number(req.body.companyId) : req.user.company_id;
  const bId = (req.user.role === "SUPER_ADMIN" || req.user.role === "COMPANY_ADMIN") && req.body.branchId 
    ? Number(req.body.branchId) 
    : req.user.branch_id;
  
  if (!bId) throw new BadRequest("Phải chọn chi nhánh để tạo phiếu kho");
  
  const result = await service.createStockTransaction(cId, bId, req.user.id, req.body);
  res.status(201).json({ message: "Ghi phiếu kho thành công", ...result });
});

exports.getTransactions = asyncHandler(async (req, res) => {
  const { ingredientId, type, limit } = req.query;
  const { cId, bId } = getInventoryContext(req);
  const transactions = await service.getTransactions(cId, bId, {
    ingredientId: ingredientId ? Number(ingredientId) : undefined,
    type,
    limit: limit ? Math.min(Number(limit), 500) : 100,
  });
  res.json({ message: "Lấy lịch sử kho thành công", transactions });
});

// ---------- Tinh nguyen lieu cho order ----------
exports.estimateForOrder = asyncHandler(async (req, res) => {
  const needs = await service.estimateForOrder(
    parseId(req.params.orderId, "order id"),
    req.user.company_id,
    req.user.branch_id
  );
  res.json({ message: "Ước tính nguyên liệu cần dùng", needs });
});
