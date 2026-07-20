// src/modules/internal/audit/audit.route.js
// Mount tai /api/internal/audit-logs. Doc nhat ky he thong (quan ly tro len).
const express = require("express");
const controller = require("./audit.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");

const router = express.Router();

router.use(requireAuth, authorize("SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER"));

router.get("/", controller.list);

module.exports = router;
