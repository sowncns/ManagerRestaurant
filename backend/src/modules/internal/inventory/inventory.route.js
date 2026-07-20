// src/modules/internal/inventory/inventory.route.js
// Mount tai /api/internal/inventory
const express = require("express");
const controller = require("./inventory.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const {
  createIngredientSchema,
  updateIngredientSchema,
  setRecipeSchema,
  stockTransactionSchema,
} = require("./inventory.schema");

const router = express.Router();

const managerOnly = authorize("SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER");
const staffRead = authorize("SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER", "KITCHEN", "CASHIER", "WAITER");

// Kho scoped theo company_id. SUPER_ADMIN khong thuoc cong ty nao -> cho phep
// chi dinh cong ty qua ?companyId (doc) hoac companyId trong body (ghi).
function resolveCompanyScope(req, _res, next) {
  if (req.user.role === "SUPER_ADMIN") {
    const cid = Number(req.query.companyId ?? req.body?.companyId);
    if (cid) req.user.company_id = cid;
  }
  next();
}

router.use(requireAuth, resolveCompanyScope);

// ---- Nguyen lieu ----
router.get("/ingredients", staffRead, controller.listIngredients);
router.get("/ingredients/low-stock", staffRead, controller.listLowStock);
router.get("/ingredients/:id", staffRead, controller.getIngredient);
router.post("/ingredients", managerOnly, validate(createIngredientSchema), controller.createIngredient);
router.put("/ingredients/:id", managerOnly, validate(updateIngredientSchema), controller.updateIngredient);
router.delete("/ingredients/:id", managerOnly, controller.deleteIngredient);

// ---- Cong thuc mon an ----
router.get("/recipes/menu-item/:menuItemId", staffRead, controller.getRecipe);
router.put("/recipes/menu-item/:menuItemId", managerOnly, validate(setRecipeSchema), controller.setRecipe);
router.delete("/recipes/:id", managerOnly, controller.deleteRecipeLine);

// ---- Phieu kho (nhap / xuat noi bo / tra NCC / kiem ke / dieu chinh / huy hao) ----
router.post("/transactions", managerOnly, validate(stockTransactionSchema), controller.createStockTransaction);
router.get("/transactions", staffRead, controller.getTransactions);

// ---- Uoc tinh nguyen lieu cho 1 order ----
router.get("/estimate/order/:orderId", staffRead, controller.estimateForOrder);

module.exports = router;
