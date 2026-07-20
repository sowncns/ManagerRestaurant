// src/modules/internal/inventory/inventory.service.js
// Gom 4 service theo spec: IngredientService, RecipeService,
// InventoryService (phieu kho), InventoryTransactionService (lich su).
// (OrderConsumptionService nam o shared/services/consumption.service.js
//  vi duoc dung chung boi checkout va qr_payment.)
const repo = require("./inventory.repository");
const { calculateNeeds } = require("../../../shared/services/consumption.service");
const pool = require("../../../config/db");
const { BadRequest, NotFound } = require("../../../shared/errors/AppError");

// Loai phieu kho thu cong -> chieu cua delta
// (SALE_CONSUMPTION khong nam day: chi duoc sinh tu dong khi thanh toan)
const MANUAL_TYPES = {
  PURCHASE: +1,          // phieu nhap kho
  INTERNAL_TRANSFER: -1, // phieu xuat kho noi bo
  RETURN_SUPPLIER: -1,   // phieu tra nha cung cap
  WASTE: -1,             // huy hao
  STOCK_ADJUSTMENT: 0,   // dieu chinh (delta tu do, am hoac duong)
  STOCK_COUNT: 0,        // kiem ke (nhap ton thuc te -> he thong tinh delta)
};

// ---------- IngredientService ----------
exports.listIngredients = (companyId, branchId, filters) => repo.findIngredients(companyId, branchId, filters);
exports.listLowStock = (companyId, branchId) => repo.findLowStock(companyId, branchId);

exports.getIngredient = async (id, companyId, branchId) => {
  const ing = await repo.findIngredientById(id, companyId, branchId);
  if (!ing) throw new NotFound("Không tìm thấy nguyên liệu");
  return ing;
};

exports.createIngredient = (companyId, branchId, data) => repo.insertIngredient(companyId, branchId, data);

exports.updateIngredient = async (id, companyId, branchId, data) => {
  const ing = await repo.updateIngredient(id, companyId, branchId, data);
  if (!ing) throw new NotFound("Không tìm thấy nguyên liệu");
  return ing;
};

exports.deleteIngredient = async (id, companyId) => {
  // Soft delete: chuyen INACTIVE (giu lich su ton kho)
  const ing = await repo.deactivateIngredient(id, companyId);
  if (!ing) throw new NotFound("Không tìm thấy nguyên liệu");
  return ing;
};

// ---------- RecipeService ----------
exports.getRecipeByMenuItem = async (menuItemId, companyId) => {
  const menuItem = await repo.findMenuItem(menuItemId, companyId);
  if (!menuItem) throw new NotFound("Không tìm thấy món ăn");
  const items = await repo.findRecipeByMenuItem(menuItemId);
  return { menu_item: menuItem, recipe: items };
};

exports.setRecipe = async (menuItemId, companyId, items) => {
  const menuItem = await repo.findMenuItem(menuItemId, companyId);
  if (!menuItem) throw new NotFound("Không tìm thấy món ăn");
  // Xac thuc nguyen lieu thuoc cung cong ty
  for (const it of items) {
    const ing = await repo.findIngredientById(it.ingredient_id, companyId);
    if (!ing) throw new BadRequest(`Nguyên liệu #${it.ingredient_id} không tồn tại hoặc không thuộc công ty`);
  }
  await repo.replaceRecipe(menuItemId, items);
  return exports.getRecipeByMenuItem(menuItemId, companyId);
};

exports.deleteRecipeLine = async (recipeId) => {
  const del = await repo.deleteRecipeLine(recipeId);
  if (!del) throw new NotFound("Không tìm thấy dòng công thức");
};

// ---------- InventoryService (phieu kho thu cong) ----------
exports.createStockTransaction = async (companyId, branchId, createdBy, data) => {
  const { ingredientId, type, quantity, actualStock, referenceType, referenceId, note } = data;

  const direction = MANUAL_TYPES[type];
  if (direction === undefined) {
    throw new BadRequest(`Loại phiếu không hợp lệ. Cho phép: ${Object.keys(MANUAL_TYPES).join(", ")}`);
  }

  let delta;
  if (type === "STOCK_COUNT") {
    // Kiem ke: nguoi dung nhap ton THUC TE -> delta = thuc te - he thong
    if (actualStock === undefined) throw new BadRequest("Kiểm kê cần truyền actualStock (tồn thực tế)");
    const ing = await repo.findIngredientById(ingredientId, companyId, branchId);
    if (!ing) throw new NotFound("Không tìm thấy nguyên liệu");
    delta = Number(actualStock) - (Number(ing.current_stock) || 0);
    if (delta === 0) return { message: "Tồn kho khớp, không cần điều chỉnh", transaction: null };
  } else if (type === "STOCK_ADJUSTMENT") {
    if (!quantity || Number(quantity) === 0) throw new BadRequest("Điều chỉnh cần quantity khác 0 (âm hoặc dương)");
    delta = Number(quantity);
  } else {
    if (!quantity || Number(quantity) <= 0) throw new BadRequest("quantity phải > 0");
    delta = direction * Number(quantity);
  }

  const result = await repo.applyStockChange({
    ingredientId, companyId, branchId, delta, type,
    referenceType, referenceId, note, createdBy,
  });
  if (!result) throw new NotFound("Không tìm thấy nguyên liệu");
  return result;
};

// ---------- InventoryTransactionService (lich su) ----------
exports.getTransactions = (companyId, branchId, filters) => repo.findTransactions(companyId, branchId, filters);

// ---------- Tinh nguyen lieu can cho 1 order (KHONG tru kho) ----------
exports.estimateForOrder = async (orderId, companyId, branchId) => {
  const dishes = await repo.findOrderDishes(orderId, companyId, branchId);
  if (!dishes.length) throw new NotFound("Order không tồn tại hoặc không có món");
  const needs = await calculateNeeds(pool, dishes);
  return needs.map((n) => ({
    ...n,
    sufficient: n.current_stock >= n.required,
  }));
};
