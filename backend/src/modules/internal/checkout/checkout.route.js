// src/modules/internal/checkout/checkout.route.js
const express = require("express");
const controller = require("./checkout.controller");
const { requireAuth } = require("../../../shared/middlewares/auth.middleware");
const { authorize } = require("../../../shared/middlewares/role.middleware");
const { validate } = require("../../../shared/middlewares/validate.middleware");
const { createInvoiceSchema, validateVoucherSchema, scanSchema, voidItemSchema, discountItemSchema, reduceQuantitySchema } = require("./checkout.schema");

const router = express.Router();

const cashierUp = authorize("CASHIER", "BRANCH_MANAGER", "COMPANY_ADMIN", "SUPER_ADMIN");
const staffUp = authorize("WAITER", "CASHIER", "BRANCH_MANAGER", "COMPANY_ADMIN", "SUPER_ADMIN");

router.use(requireAuth);

// Thu ngan tao hoa don
router.post("/create-invoice", cashierUp, validate(createInvoiceSchema), controller.createInvoice);

// Intent thanh toan App/Transfer
router.get("/intent/:tableId", staffUp, controller.getCheckoutIntent);
router.delete("/intent/:tableId", staffUp, controller.cancelCheckoutIntent);

// Quet QR khach hang (voucher/thanh vien) - phuc vu tro len lay ma giup thu ngan
router.post("/scan", staffUp, validate(scanSchema), controller.scanCustomerQR);

// Voucher
router.post("/validate-voucher", staffUp, validate(validateVoucherSchema), controller.validateVoucher);
router.get("/table/:tableId/voucher", staffUp, controller.getTableVoucher);

// Thu ngan void mon khoi bill (mon nham lan)
router.post("/items/:order_item_id/void", cashierUp, validate(voidItemSchema), controller.voidItem);

// Thu ngan giam gia rieng 1 mon (theo %) cho khach
router.post("/items/:order_item_id/discount", cashierUp, validate(discountItemSchema), controller.discountItem);

// Thu ngan giam so luong 1 mon (bep lam du / khach lay bot)
router.post("/items/:order_item_id/reduce-quantity", cashierUp, validate(reduceQuantitySchema), controller.reduceQuantity);

// Kiem mon (pre-bill: mon + gia goc + VAT, khong thu tien) - phuc vu & thu ngan
router.get("/table/:tableId/kiem-mon", staffUp, controller.getKiemMon);

// Hoa don moi nhat
router.get("/table/:tableId/latest-invoice", staffUp, controller.getLatestInvoice);

// VAT
router.post("/table/:tableId/vat", staffUp, controller.saveTableVat);
router.get("/table/:tableId/vat", staffUp, controller.getTableVat);


// Quan ly hoa don
router.get("/invoices", cashierUp, controller.listInvoices);
router.post("/invoices/:invoiceId/pay", cashierUp, controller.markInvoicePaid);

module.exports = router;
