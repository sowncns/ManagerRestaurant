// src/modules/internal/order/order.route.js
const express = require("express");
const controller = require("./order.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const { createOrderSchema, addItemsSchema, scanQrSchema, scanItemQrSchema } = require("./order.schema");
const cancelController = require("../cancel/cancel.controller");
const { createRequestSchema } = require("../cancel/cancel.schema");

const router = express.Router();

const canWrite = authorize("WAITER", "RECEPTIONIST", "BRANCH_MANAGER", "SUPER_ADMIN", "COMPANY_ADMIN");
const canRead = authorize("WAITER", "RECEPTIONIST", "BRANCH_MANAGER", "SUPER_ADMIN", "KITCHEN", "CASHIER", "COMPANY_ADMIN");
// Bep: KITCHEN + quan ly duoc cap nhat trang thai nau (tru kho)
const canCook = authorize("KITCHEN", "WAITER", "BRANCH_MANAGER", "SUPER_ADMIN", "COMPANY_ADMIN");
// Don dat truoc: chi bep + quan ly (khong co WAITER).
const canPreorder = authorize("KITCHEN", "BRANCH_MANAGER", "SUPER_ADMIN", "COMPANY_ADMIN");

router.use(requireAuth);

router.post("/", canWrite, validate(createOrderSchema), controller.createOrder);
// Phuc vu gui yeu cau huy 1 mon da gui bep (BEP se quyet dinh).
router.post(
  "/:order_id/items/:order_item_id/cancel-request",
  canWrite,
  validate(createRequestSchema),
  cancelController.createRequest
);
// Don dat truoc da gan ban -> bep duyet (Dong y) hoac huy (hoan coc).
router.get("/kitchen/preorders", canPreorder, controller.getPreorders);
router.post("/kitchen/preorders/:reservationId/confirm", canPreorder, controller.confirmPreorder);
router.post("/kitchen/preorders/:reservationId/cancel", canPreorder, controller.cancelPreorder);
router.get("/kitchen/queue", canCook, controller.getKitchenQueue);
router.get("/kitchen/stream", canCook, controller.streamKitchen); // SSE push, thay polling queue
router.get("/kitchen/history", canCook, controller.getKitchenHistory);
// Bep quet QR phieu mon -> bao nau xong (READY) + tru kho
router.post("/kitchen/scan", canCook, validate(scanItemQrSchema), controller.completeItemByQr);
router.get("/table/:tableId/active", canRead, controller.getActiveOrderForTable);
router.get("/:id", canRead, controller.getOrder);
router.put("/:id/items", canWrite, validate(addItemsSchema), controller.addOrderItems);
router.post("/:id/scan-qr", canWrite, validate(scanQrSchema), controller.scanMemberQR);
// Bep bat dau nau ca don -> tru kho
router.post("/:id/cook", canCook, controller.startCooking);
// Doi trang thai nau tung mon (WAITING/COOKING/READY/SERVED/CANCELLED)
router.patch("/items/:itemId/kitchen-status", canCook, controller.updateItemKitchenStatus);

module.exports = router;
