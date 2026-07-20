// src/modules/internal/auth/auth.route.js
const express = require("express");
const controller = require("./auth.controller");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const { authLimiter } = require("../../../shared/middlewares/rateLimit.middleware");
const { loginSchema } = require("./auth.schema");

const router = express.Router();

router.post("/login", authLimiter, validate(loginSchema), controller.login);
router.post("/refresh-token", controller.refresh);
router.post("/logout", controller.logout);

module.exports = router;
