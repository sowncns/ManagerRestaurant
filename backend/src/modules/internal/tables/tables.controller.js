// src/modules/internal/tables/tables.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const service = require("./tables.service");

exports.listSections = asyncHandler(async (req, res) => {
  const sections = req.query.branchId
    ? await service.getBranchSections(req.user, req.query.branchId)
    : await service.listSections(req.user);
  res.json({ message: "Lấy danh sách khu vực thành công", sections });
});

exports.getSectionById = asyncHandler(async (req, res) => {
  const section = await service.getSectionById(req.user, req.params.sectionId);
  res.json({ message: "Lấy thông tin khu vực thành công", section });
});

exports.createSection = asyncHandler(async (req, res) => {
  const section = await service.createSection(req.user, req.body);
  res.status(201).json({ message: "Tạo khu vực thành công", section });
});

exports.updateSection = asyncHandler(async (req, res) => {
  const section = await service.updateSection(req.user, req.params.sectionId, req.body);
  res.json({ message: "Cập nhật khu vực thành công", section });
});

exports.changeSectionStatus = asyncHandler(async (req, res) => {
  const section = await service.changeSectionStatus(req.user, req.params.sectionId, req.body.status);
  res.json({ message: "Đổi trạng thái khu vực thành công", section });
});

exports.deleteSection = asyncHandler(async (req, res) => {
  const section = await service.deleteSection(req.user, req.params.sectionId);
  res.json({ message: "Xóa khu vực thành công", section });
});

exports.listTables = asyncHandler(async (req, res) => {
  let tables;
  if (req.query.sectionId) tables = await service.getTablesBySection(req.user, req.query.sectionId);
  else if (req.query.branchId) tables = await service.getBranchTables(req.user, req.query.branchId);
  else tables = await service.listTables(req.user);
  res.json({ message: "Lấy danh sách bàn thành công", tables });
});

exports.getTableById = asyncHandler(async (req, res) => {
  const table = await service.getTableById(req.user, req.params.tableId);
  res.json({ message: "Lấy thông tin bàn thành công", table });
});

exports.createTable = asyncHandler(async (req, res) => {
  const table = await service.createTable(req.user, req.body);
  res.status(201).json({ message: "Tạo bàn thành công", table });
});

exports.updateTable = asyncHandler(async (req, res) => {
  const table = await service.updateTable(req.user, req.params.tableId, req.body);
  res.json({ message: "Cập nhật bàn thành công", table });
});

exports.changeTableStatus = asyncHandler(async (req, res) => {
  const table = await service.changeTableStatus(req.user, req.params.tableId, req.body.status);
  res.json({ message: "Đổi trạng thái bàn thành công", table });
});

exports.deleteTable = asyncHandler(async (req, res) => {
  const table = await service.deleteTable(req.user, req.params.tableId);
  res.json({ message: "Xóa bàn thành công", table });
});
