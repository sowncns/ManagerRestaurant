// src/modules/internal/reservation/reservation.route.js
// Mount tai /api/internal/reservations
const express = require("express");
const controller = require("./reservation.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const {
  createReservationSchema,
  updateReservationSchema,
  changeStatusSchema,
  checkinSchema,
  assignTableSchema,
} = require("./reservation.schema");

const router = express.Router();

// Le tan + quan ly tro len thao tac dat ban.
const deskRoles = authorize("SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER", "RECEPTIONIST");
const readRoles = authorize("SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER", "RECEPTIONIST", "WAITER");

router.use(requireAuth);

router.get("/", readRoles, controller.list);
router.get("/alerts", deskRoles, controller.getAlerts); // truoc /:id de khong bi nuot
router.get("/stream", deskRoles, controller.stream); // SSE push, thay polling alerts
router.get("/:id", readRoles, controller.get);
router.get("/:id/suggest-table", deskRoles, controller.suggestTable);
router.post("/", deskRoles, validate(createReservationSchema), controller.create);
router.put("/:id", deskRoles, validate(updateReservationSchema), controller.update);
router.patch("/:id/status", deskRoles, validate(changeStatusSchema), controller.changeStatus);
router.post("/:id/assign-table", deskRoles, validate(assignTableSchema), controller.assignTable);
router.post("/:id/checkin", deskRoles, validate(checkinSchema), controller.checkin);
router.delete("/:id", deskRoles, controller.cancel);

module.exports = router;
