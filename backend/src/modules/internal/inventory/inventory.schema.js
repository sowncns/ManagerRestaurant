// src/modules/internal/inventory/inventory.schema.js
const { z } = require("zod");

const createIngredientSchema = z.object({
  ingredient_code: z.string().min(1, "Thiếu mã nguyên liệu"),
  ingredient_name: z.string().min(1, "Thiếu tên nguyên liệu"),
  unit: z.string().min(1, "Thiếu đơn vị tính"),
  current_stock: z.coerce.number().min(0).optional(),
  minimum_stock: z.coerce.number().min(0).optional(),
  cost_price: z.coerce.number().min(0).optional(),
  note: z.string().optional(),
  companyId: z.coerce.number().optional(),
  branchId: z.coerce.number().optional(),
});

const updateIngredientSchema = z.object({
  ingredient_code: z.string().min(1).optional(),
  ingredient_name: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  minimum_stock: z.coerce.number().min(0).optional(),
  cost_price: z.coerce.number().min(0).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  note: z.string().optional(),
  companyId: z.coerce.number().optional(),
  branchId: z.coerce.number().optional(),
});

const recipeLineSchema = z.object({
  ingredient_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().positive("Định lượng phải > 0"),
  notes: z.string().optional(),
});

const setRecipeSchema = z.object({
  items: z.array(recipeLineSchema).min(1, "Công thức phải có ít nhất 1 nguyên liệu"),
});

const stockTransactionSchema = z.object({
  ingredientId: z.coerce.number().int().positive("Thiếu nguyên liệu"),
  type: z.enum(["PURCHASE", "INTERNAL_TRANSFER", "RETURN_SUPPLIER", "WASTE", "STOCK_ADJUSTMENT", "STOCK_COUNT"]),
  quantity: z.coerce.number().optional(),
  actualStock: z.coerce.number().min(0).optional(), // dung cho STOCK_COUNT
  referenceType: z.enum(["PURCHASE_RECEIPT", "STOCK_COUNT", "ADJUSTMENT"]).optional(),
  referenceId: z.coerce.number().int().optional(),
  note: z.string().optional(),
  companyId: z.coerce.number().optional(),
  branchId: z.coerce.number().optional(),
});

module.exports = {
  createIngredientSchema,
  updateIngredientSchema,
  setRecipeSchema,
  stockTransactionSchema,
};
