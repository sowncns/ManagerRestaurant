// src/modules/internal/procurement/procurement.route.js
// Mount tai /api/internal/procurement (nha cung cap + phieu nhap kho)
const express = require("express");
const controller = require("./procurement.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const {
  createSupplierSchema,
  updateSupplierSchema,
  createReceiptSchema,
} = require("./procurement.schema");

const router = express.Router();

const managerOnly = authorize("SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER");
const staffRead = authorize("SUPER_ADMIN", "COMPANY_ADMIN", "BRANCH_MANAGER", "KITCHEN");

router.use(requireAuth);

// ---- Nha cung cap ----
router.get("/suppliers", staffRead, controller.listSuppliers);
router.get("/suppliers/:id", staffRead, controller.getSupplier);
router.post("/suppliers", managerOnly, validate(createSupplierSchema), controller.createSupplier);
router.put("/suppliers/:id", managerOnly, validate(updateSupplierSchema), controller.updateSupplier);
router.delete("/suppliers/:id", managerOnly, controller.deleteSupplier);

// ---- Phieu nhap kho ----
router.get("/receipts", staffRead, controller.listReceipts);
router.get("/receipts/:id", staffRead, controller.getReceipt);
router.post("/receipts", managerOnly, validate(createReceiptSchema), controller.createReceipt);
router.post("/receipts/:id/confirm", managerOnly, controller.confirmReceipt);
router.delete("/receipts/:id", managerOnly, controller.cancelReceipt);

module.exports = router;
