// src/modules/customer/voucher/voucher.route.js
const express = require("express");
const controller = require("./voucher.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireAuth, controller.getVouchers);

module.exports = router;
