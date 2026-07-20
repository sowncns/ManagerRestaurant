// src/modules/internal/tables/tables.route.js
const express = require("express");
const controller = require("./tables.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");

const router = express.Router();

const staffOnly = authorize("SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER", "WAITER", "RECEPTIONIST", "KITCHEN", "CASHIER");
const managerOnly = authorize("SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER");

router.use(requireAuth); // tat ca route deu can dang nhap

// Khu vuc
router.get("/sections", staffOnly, controller.listSections);
router.get("/sections/:sectionId", staffOnly, controller.getSectionById);
router.post("/sections", managerOnly, controller.createSection);
router.put("/sections/:sectionId", managerOnly, controller.updateSection);
router.patch("/sections/:sectionId/status", managerOnly, controller.changeSectionStatus);
router.delete("/sections/:sectionId", managerOnly, controller.deleteSection);

// Ban an
router.get("/tables", staffOnly, controller.listTables);
router.get("/tables/:tableId", staffOnly, controller.getTableById);
router.post("/tables", staffOnly, controller.createTable);
router.put("/tables/:tableId", staffOnly, controller.updateTable);
router.patch("/tables/:tableId/status", staffOnly, controller.changeTableStatus);
router.delete("/tables/:tableId", managerOnly, controller.deleteTable);

module.exports = router;
