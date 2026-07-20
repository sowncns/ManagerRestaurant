// src/modules/internal/report/report.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const service = require("./report.service");

exports.getRevenue = asyncHandler(async (req, res) => {
  const data = await service.getRevenue(req.user, req.query);
  res.json({ message: "Báo cáo doanh thu thành công", data });
});

exports.getTopItems = asyncHandler(async (req, res) => {
  const data = await service.getTopItems(req.user, req.query);
  res.json({ message: "Báo cáo món bán chạy thành công", data });
});

exports.getDashboard = asyncHandler(async (req, res) => {
  const data = await service.getDashboard(req.user, req.query);
  res.json({ message: "Lấy dashboard thành công", data });
});

exports.getAdminOverview = asyncHandler(async (req, res) => {
  const data = await service.getAdminOverview(req.user);
  res.json({ message: "Lấy tổng quan hệ thống thành công", data });
});
