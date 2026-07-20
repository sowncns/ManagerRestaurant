// src/modules/customer/reservation/reservation.route.js
// Mount tai /api/customer/reservations
const express = require("express");
const controller = require("./reservation.controller");
const { requireAuth, requireVerifiedEmail } = require("../../../shared/middlewares/auth.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const { createReservationSchema } = require("./reservation.schema");

const router = express.Router();

router.use(requireAuth);

router.get("/", controller.list);
router.get("/:id", controller.get);
// Dat ban / huy la thao tac -> yeu cau da xac thuc email
router.post("/", requireVerifiedEmail, validate(createReservationSchema), controller.create);
router.delete("/:id", requireVerifiedEmail, controller.cancel);

module.exports = router;
