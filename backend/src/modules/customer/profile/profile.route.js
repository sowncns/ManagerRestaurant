// src/modules/customer/profile/profile.route.js
const express = require("express");
const controller = require("./profile.controller");
const {
  requireAuth,
  requireVerifiedEmail,
  requirePaymentPin,
} = require("../../../shared/middlewares/auth.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const { updateProfileSchema, pinSchema, addPointsSchema } = require("./profile.schema");

const router = express.Router();

router.use(requireAuth); // tat ca route profile deu can dang nhap

// Xem ho so co ban: khong yeu cau xac thuc email
router.get("/me", controller.getProfile);
router.post("/verify-pin", validate(pinSchema), controller.verifyPin);

// Xem lich su giao dich VI: phai co PIN
router.get("/transactions", requirePaymentPin, controller.getTransactions);

// Thao tac: yeu cau da xac thuc email
router.put("/me", requireVerifiedEmail, validate(updateProfileSchema), controller.updateProfile);
router.post("/setup-pin", requireVerifiedEmail, validate(pinSchema), controller.setupPin);
router.post("/add-points", requireVerifiedEmail, validate(addPointsSchema), controller.addPoints);

module.exports = router;
