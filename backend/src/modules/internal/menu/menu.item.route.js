// src/modules/internal/menu/menu.item.route.js
// Mount tai /api/internal/menu-items
const express = require("express");
const controller = require("./menu.item.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const { createItemSchema, updateItemSchema, availabilitySchema } = require("./menu.schema");

const router = express.Router();

const adminOnly = authorize("SUPER_ADMIN", "COMPANY_ADMIN");
// BRANCH_MANAGER được bật/tắt trạng thái món (hết/còn) nhưng không được tạo/sửa/xóa.
const canToggle = authorize("SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER");
// Nhan vien van hanh duoc DOC thuc don (goi mon, bep...), khong duoc sua.
const canRead = authorize("SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER", "WAITER", "CASHIER", "KITCHEN");

router.use(requireAuth);

router.get("/", canRead, controller.list);
router.get("/:id", canRead, controller.get);
router.post("/", adminOnly, validate(createItemSchema), controller.create);
router.put("/:id", adminOnly, validate(updateItemSchema), controller.update);
router.patch("/:id/availability", canToggle, validate(availabilitySchema), controller.setAvailability);
router.delete("/:id", adminOnly, controller.remove);

module.exports = router;
