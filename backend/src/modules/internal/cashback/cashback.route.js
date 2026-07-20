// src/modules/internal/cashback/cashback.route.js
// Mount tai /api/internal/cashback-rates. Chi SUPER_ADMIN.
const express = require("express");
const controller = require("./cashback.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const { updateRateSchema } = require("./cashback.schema");

const router = express.Router();
router.use(requireAuth, authorize("SUPER_ADMIN"));

router.get("/", controller.list);
router.put("/:rank", validate(updateRateSchema), controller.update);

module.exports = router;
