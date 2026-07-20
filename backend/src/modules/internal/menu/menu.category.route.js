// src/modules/internal/menu/menu.category.route.js
// Mount tai /api/internal/menu-categories
const express = require("express");
const controller = require("./menu.category.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const { createCategorySchema, updateCategorySchema } = require("./menu.schema");

const router = express.Router();

const adminOnly = authorize("SUPER_ADMIN", "COMPANY_ADMIN");
// Nhan vien van hanh duoc DOC nhom mon (goi mon, bep...), khong duoc sua.
const canRead = authorize("SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER", "WAITER", "CASHIER", "KITCHEN");

router.use(requireAuth);

router.get("/", canRead, controller.list);
router.get("/:id", canRead, controller.get);
router.post("/", adminOnly, validate(createCategorySchema), controller.create);
router.put("/:id", adminOnly, validate(updateCategorySchema), controller.update);
router.delete("/:id", adminOnly, controller.remove);

module.exports = router;
