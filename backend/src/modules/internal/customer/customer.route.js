// src/modules/internal/customer/customer.route.js
// Mount tai /api/internal/customers. Chinh diem/hang: chi quan ly cap cao.
const express = require("express");
const { z } = require("zod");
const controller = require("./customer.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");

const adjustPointsSchema = z.object({
  points: z
    .number({ invalid_type_error: "points phải là số" })
    .int("points phải là số nguyên")
    .min(0, "points không được âm"),
});

const router = express.Router();
router.use(requireAuth, authorize("COMPANY_ADMIN", "SUPER_ADMIN"));

router.post("/:id/points", validate(adjustPointsSchema), controller.adjustPoints);

module.exports = router;
