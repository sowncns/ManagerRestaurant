// src/modules/internal/voucher/voucher.route.js
// Mount tai /api/internal/vouchers. SUPER_ADMIN + COMPANY_ADMIN (siet theo cong ty o service).
const express = require("express");
const controller = require("./voucher.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const { createVoucherSchema, updateVoucherSchema, assignSchema } = require("./voucher.schema");

const router = express.Router();
router.use(requireAuth, authorize("SUPER_ADMIN", "COMPANY_ADMIN"));

router.get("/", controller.list);
router.get("/:id", controller.get);
router.post("/", validate(createVoucherSchema), controller.create);
router.put("/:id", validate(updateVoucherSchema), controller.update);
router.delete("/:id", controller.remove);
router.post("/:id/assign", validate(assignSchema), controller.assign);

module.exports = router;
