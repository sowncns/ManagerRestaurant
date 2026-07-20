
const express = require("express");
const controller = require("./auth.controller");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authLimiter } = require("../../../shared/middlewares/rateLimit.middleware");
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotSchema,
  resetSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} = require("./auth.schema");

const router = express.Router();

router.post("/register", authLimiter, validate(registerSchema), controller.register);
router.post("/login", authLimiter, validate(loginSchema), controller.login);
router.post("/refresh-token", controller.refresh);
router.post("/logout", controller.logout);
router.post("/forgot-password", authLimiter, validate(forgotSchema), controller.forgotPassword);
router.post("/reset-password", authLimiter, validate(resetSchema), controller.resetPassword);
router.get("/verify-email", controller.verifyEmail); // token qua query (link email)
router.post("/verify-email", validate(verifyEmailSchema), controller.verifyEmail);
router.post(
  "/resend-verification",
  authLimiter,
  validate(resendVerificationSchema),
  controller.resendVerification
);
router.post(
  "/change-password",
  requireAuth,
  validate(changePasswordSchema),
  controller.changePassword
);
// Khach da dang nhap yeu cau gui mail xac thuc (bam nut o trang Profile)
router.post("/request-verification", requireAuth, controller.requestVerification);
router.get("/test-mail", controller.testMail);

module.exports = router;
