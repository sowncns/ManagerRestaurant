// src/modules/internal/report/report.route.js
const express = require("express");
const controller = require("./report.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");

const router = express.Router();

const managerOnly = authorize("SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER");
router.use(requireAuth, managerOnly);

router.get("/dashboard", controller.getDashboard);
router.get("/admin-overview", controller.getAdminOverview); // service chan non-SUPER_ADMIN
router.get("/revenue", controller.getRevenue);
router.get("/top-items", controller.getTopItems);

module.exports = router;
