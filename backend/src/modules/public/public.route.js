// src/modules/public/public.route.js
// API cong khai: khong yeu cau dang nhap.
const express = require("express");
const controller = require("./public.controller");
const { validate } = require("../../shared/middlewares/validate.middleware");
const { createGuestReservationSchema } = require("../customer/reservation/reservation.schema");

const router = express.Router();

// Dat ban khach vang lai (khong yeu cau dang nhap, khong dat mon truoc)
router.post("/reservations", validate(createGuestReservationSchema), controller.createReservation);

// Cong ty
router.get("/companies", controller.listCompanies);
router.get("/companies/:companyId", controller.getCompany);

// Chi nhanh
router.get("/companies/:companyId/branches", controller.listBranches);
router.get("/branches/:branchId", controller.getBranch);

// Thuc don
router.get("/companies/:companyId/categories", controller.listCategories);
router.get("/companies/:companyId/menu", controller.getMenu);
router.get("/menu-items/:menuItemId", controller.getMenuItem);

// Anh trang chu (slide + "Hom nay an gi")
router.get("/home-banners", controller.listHomeBanners);

module.exports = router;
