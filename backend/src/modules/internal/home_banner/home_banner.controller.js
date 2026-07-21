// src/modules/internal/home_banner/home_banner.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const service = require("./home_banner.service");

exports.list = asyncHandler(async (req, res) => {
  const banners = await service.list();
  res.json({ message: "Lấy danh sách ảnh trang chủ thành công", banners });
});

exports.create = asyncHandler(async (req, res) => {
  const banner = await service.create(req.body);
  res.status(201).json({ message: "Thêm ảnh thành công", banner });
});

exports.remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.json({ message: "Đã xóa ảnh" });
});
