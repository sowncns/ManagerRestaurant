// src/modules/internal/cancel/cancel.route.js
// Mount tai /api/internal/cancel-requests
const express = require("express");
const controller = require("./cancel.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const { rejectSchema } = require("./cancel.schema");

const router = express.Router();

// Bep quyet dinh; quan ly co the xem/xu ly.
const canDecide = authorize("KITCHEN", "BRANCH_MANAGER", "COMPANY_ADMIN", "SUPER_ADMIN");
// Phuc vu + bep + quan ly deu xem duoc danh sach (loc theo pham vi o service).
const canView = authorize("WAITER", "KITCHEN", "CASHIER", "BRANCH_MANAGER", "COMPANY_ADMIN", "SUPER_ADMIN");
const canRequest = authorize("WAITER", "BRANCH_MANAGER", "COMPANY_ADMIN", "SUPER_ADMIN");

router.use(requireAuth);

router.get("/", canView, controller.list);
router.patch("/:cancel_request_id/accept", canDecide, controller.accept);
router.patch("/:cancel_request_id/reject", canDecide, validate(rejectSchema), controller.reject);
router.patch("/:cancel_request_id/withdraw", canRequest, controller.withdraw);

module.exports = router;
