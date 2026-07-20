// src/modules/internal/employee/employee.route.js
const express = require("express");
const controller = require("./employee.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const {
  createEmployeeSchema,
  updateEmployeeSchema,
  resetPasswordSchema,
  changeStatusSchema,
} = require("./employee.schema");

const router = express.Router();

// Chi cap quan ly tro len; pham vi cu the do tang service kiem soat.
const managerOnly = authorize("SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER");

router.use(requireAuth, managerOnly);

router.get("/roles", controller.listRoles);
router.get("/kitchen-types", controller.listKitchenTypes);
router.get("/", controller.listEmployees);
router.get("/:id", controller.getEmployee);
router.post("/", validate(createEmployeeSchema), controller.createEmployee);
router.put("/:id", validate(updateEmployeeSchema), controller.updateEmployee);
router.patch("/:id/status", validate(changeStatusSchema), controller.changeStatus);
router.post("/:id/reset-password", validate(resetPasswordSchema), controller.resetPassword);

module.exports = router;
