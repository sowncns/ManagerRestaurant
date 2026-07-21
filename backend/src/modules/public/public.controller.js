// src/modules/public/public.controller.js
const { asyncHandler } = require("../../shared/utils/asyncHandler");
const service = require("./public.service");
const reservationService = require("../customer/reservation/reservation.service");

// Dat ban cho khach vang lai (chua dang nhap). Chi dat ban, khong dat mon truoc.
exports.createReservation = asyncHandler(async (req, res) => {
  const reservation = await reservationService.createGuest(req.body);
  res.status(201).json({
    message: "Đặt bàn thành công. Nhà hàng sẽ liên hệ để xác nhận.",
    reservation,
  });
});

exports.listCompanies = asyncHandler(async (req, res) => {
  const companies = await service.getCompanies();
  res.json({ message: "Lấy danh sách công ty thành công", companies });
});

exports.getCompany = asyncHandler(async (req, res) => {
  const company = await service.getCompanyDetail(req.params.companyId);
  res.json({ message: "Lấy thông tin công ty thành công", company });
});

exports.listBranches = asyncHandler(async (req, res) => {
  const branches = await service.getBranchesByCompany(req.params.companyId);
  res.json({ message: "Lấy danh sách chi nhánh thành công", branches });
});

exports.getBranch = asyncHandler(async (req, res) => {
  const branch = await service.getBranchDetail(req.params.branchId);
  res.json({ message: "Lấy thông tin chi nhánh thành công", branch });
});

exports.listCategories = asyncHandler(async (req, res) => {
  const categories = await service.getCategoriesByCompany(req.params.companyId);
  res.json({ message: "Lấy danh mục món thành công", categories });
});

exports.getMenu = asyncHandler(async (req, res) => {
  const menu = await service.getMenuByCompany(req.params.companyId);
  res.json({ message: "Lấy thực đơn thành công", menu });
});

exports.getMenuItem = asyncHandler(async (req, res) => {
  const item = await service.getMenuItemDetail(req.params.menuItemId);
  res.json({ message: "Lấy thông tin món ăn thành công", item });
});

exports.listHomeBanners = asyncHandler(async (req, res) => {
  const banners = await service.getHomeBanners();
  res.json({ message: "Lấy ảnh trang chủ thành công", banners });
});
