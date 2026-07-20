// src/modules/internal/branch/branch.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const service = require("./branch.service");

exports.listBranches = asyncHandler(async (req, res) => {
  const branches = await service.getBranches(req.user);
  res.json({ message: "Lấy danh sách chi nhánh thành công", branches });
});

exports.getBranch = asyncHandler(async (req, res) => {
  const branch = await service.getBranch(req.user, req.params.id);
  res.json({ message: "Lấy thông tin chi nhánh thành công", branch });
});

exports.createBranch = asyncHandler(async (req, res) => {
  const branch = await service.createBranch(req.user, req.body);
  res.status(201).json({ message: "Tạo chi nhánh thành công", branch });
});

exports.updateBranch = asyncHandler(async (req, res) => {
  const branch = await service.updateBranch(req.user, req.params.id, req.body);
  res.json({ message: "Cập nhật chi nhánh thành công", branch });
});

exports.changeStatus = asyncHandler(async (req, res) => {
  const branch = await service.changeStatus(req.user, req.params.id, req.body.status);
  res.json({ message: "Cập nhật trạng thái thành công", branch });
});

exports.deleteBranch = asyncHandler(async (req, res) => {
  const branch = await service.deleteBranch(req.user, req.params.id);
  res.json({ message: "Xóa (ngừng hoạt động) chi nhánh thành công", branch });
});
