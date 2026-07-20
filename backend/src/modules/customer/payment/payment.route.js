// src/modules/customer/payment/payment.route.js
const express = require("express");
const controller = require("./payment.controller");
const {
  requireAuth,
  requireVerifiedEmail,
  requirePaymentPin,
} = require("../../../shared/middlewares/auth.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const { createLinkSchema } = require("./payment.schema");

const router = express.Router();

// Khach tao link nap vi (nap tien): da xac thuc email + da co PIN
router.post(
  "/create",
  requireAuth,
  requireVerifiedEmail,
  requirePaymentPin,
  validate(createLinkSchema),
  controller.createPaymentLink
);

module.exports = router;
