
const express = require("express");
const router = express.Router();


const customerAuthRoute = require("../modules/customer/auth/auth.route");
const customerProfileRoute = require("../modules/customer/profile/profile.route");
const customerVoucherRoute = require("../modules/customer/voucher/voucher.route");
const customerReservationRoute = require("../modules/customer/reservation/reservation.route");
const internalAuthRoute = require("../modules/internal/auth/auth.route");
const internalTablesRoute = require("../modules/internal/tables/tables.route");
const internalOrderRoute = require("../modules/internal/order/order.route");
const internalCancelRoute = require("../modules/internal/cancel/cancel.route");
const internalEmployeeRoute = require("../modules/internal/employee/employee.route");
const internalReportRoute = require("../modules/internal/report/report.route");
const internalBranchRoute = require("../modules/internal/branch/branch.route");
const internalCheckoutRoute = require("../modules/internal/checkout/checkout.route");
const internalInventoryRoute = require("../modules/internal/inventory/inventory.route");
const internalAuditRoute = require("../modules/internal/audit/audit.route");
const internalProcurementRoute = require("../modules/internal/procurement/procurement.route");
const internalReservationRoute = require("../modules/internal/reservation/reservation.route");
const internalMenuCategoryRoute = require("../modules/internal/menu/menu.category.route");
const internalMenuItemRoute = require("../modules/internal/menu/menu.item.route");
const internalCompanyRoute = require("../modules/internal/company/company.route");
const internalCashbackRoute = require("../modules/internal/cashback/cashback.route");
const internalVoucherRoute = require("../modules/internal/voucher/voucher.route");
const internalCustomerRoute = require("../modules/internal/customer/customer.route");
const internalComboRoute = require("../modules/internal/combo/combo.route");

const qrCustomerRoute = require("../modules/qr_payment/qr_payment.customer.route");
const qrInternalRoute = require("../modules/qr_payment/qr_payment.internal.route");
const paymentRoute = require("../modules/customer/payment/payment.route");
const paymentController = require("../modules/customer/payment/payment.controller");
const publicRoute = require("../modules/public/public.route");

// Webhook PayOS goi ve (public, khong auth)
router.post("/webhook", paymentController.receiveWebhook);

const { autoAuditMiddleware } = require("../shared/middlewares/autoAudit.middleware");
router.use("/internal", autoAuditMiddleware);


router.use("/customer/auth", customerAuthRoute);
router.use("/customer/profile", customerProfileRoute);
router.use("/customer/voucher", customerVoucherRoute);
router.use("/customer/reservations", customerReservationRoute);
router.use("/customer/payment", paymentRoute);
router.use("/customer/qr-payment", qrCustomerRoute);

router.use("/internal/auth", internalAuthRoute);
router.use("/internal/dining-tables", internalTablesRoute);
router.use("/internal/orders", internalOrderRoute);
router.use("/internal/cancel-requests", internalCancelRoute);
router.use("/internal/employees", internalEmployeeRoute);
router.use("/internal/reports", internalReportRoute);
router.use("/internal/branches", internalBranchRoute);
router.use("/internal/checkout", internalCheckoutRoute);
router.use("/internal/inventory", internalInventoryRoute);
router.use("/internal/audit-logs", internalAuditRoute);
router.use("/internal/procurement", internalProcurementRoute);
router.use("/internal/reservations", internalReservationRoute);
router.use("/internal/menu-categories", internalMenuCategoryRoute);
router.use("/internal/menu-items", internalMenuItemRoute);
router.use("/internal/companies", internalCompanyRoute);
router.use("/internal/cashback-rates", internalCashbackRoute);
router.use("/internal/vouchers", internalVoucherRoute);
router.use("/internal/customers", internalCustomerRoute);
router.use("/internal/combos", internalComboRoute);
router.use("/internal/qr-payment", qrInternalRoute);

router.use("/public", publicRoute);


module.exports = router;