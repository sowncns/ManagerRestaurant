// src/modules/qr_payment/qr_payment.customer.route.js
const express = require("express");
const controller = require("./qr_payment.customer.controller");
const {
  requireAuth,
  requireVerifiedEmail,
  requirePaymentPin,
} = require("../../shared/middlewares/auth.middleware");
const { validate } = require("../../shared/middlewares/validate.middleware");
const { confirmSchema, scanTokenSchema } = require("./qr_payment.schema");

const router = express.Router();
router.use(requireAuth);

// Xem yeu cau thanh toan cho / hoa don: phai co PIN (lien quan vi)
router.get("/pending", requirePaymentPin, controller.getPendingPayment);
router.get("/stream", requirePaymentPin, controller.streamPending); // SSE push, thay polling
router.get("/invoices", requirePaymentPin, controller.getInvoiceHistory);
router.get("/invoices/:id", requirePaymentPin, controller.getInvoiceById);

// Thao tac thanh toan bang vi: da xac thuc email + da co PIN
router.post("/confirm", requireVerifiedEmail, requirePaymentPin, validate(confirmSchema), controller.confirmPayment);
router.post("/generate-token", requireVerifiedEmail, requirePaymentPin, controller.generatePaymentToken);

// Sinh QR (voucher/thanh vien) de nhan vien quet. Khong dong toi vi -> chi can dang nhap.
router.post("/scan-token", validate(scanTokenSchema), controller.generateScanToken);

module.exports = router;
