// src/modules/internal/combo/combo.route.js
// Mount tai /api/internal/combos
const express = require("express");
const controller = require("./combo.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const { createComboSchema, updateComboSchema } = require("./combo.schema");

const router = express.Router();

// Chi admin cong ty tao/sua/xoa combo. Nhan vien chi doc.
const companyAdminOnly = authorize("SUPER_ADMIN", "COMPANY_ADMIN");
const staffRead = authorize("SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER", "RECEPTIONIST", "WAITER", "CASHIER");

router.use(requireAuth);

router.get("/", staffRead, controller.list);
router.get("/:id", staffRead, controller.get);
router.post("/", companyAdminOnly, validate(createComboSchema), controller.create);
router.put("/:id", companyAdminOnly, validate(updateComboSchema), controller.update);
router.delete("/:id", companyAdminOnly, controller.remove);

module.exports = router;
