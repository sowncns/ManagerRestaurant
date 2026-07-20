// src/modules/qr_payment/qr_payment.internal.route.js
const express = require("express");
const controller = require("./qr_payment.internal.controller");
const { requireAuth } = require("../../shared/middlewares/auth.middleware");
const { authorize } = require("../../shared/middlewares/role.middleware");
const { validate } = require("../../shared/middlewares/validate.middleware");
const { requestSchema, cancelSchema } = require("./qr_payment.schema");

const router = express.Router();
const staff = authorize("BRANCH_MANAGER", "CASHIER", "WAITER", "RECEPTIONIST", "COMPANY_ADMIN", "SUPER_ADMIN");

router.use(requireAuth, staff);

router.post("/request", validate(requestSchema), controller.requestPayment);
router.get("/status/:requestId", controller.getPaymentStatus);
router.post("/cancel", validate(cancelSchema), controller.cancelPayment);

module.exports = router;
