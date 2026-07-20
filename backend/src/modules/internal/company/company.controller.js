// src/modules/internal/company/company.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const { BadRequest } = require("../../../shared/errors/AppError");
const service = require("./company.service");
const { parseId } = require("../../../shared/utils/parseId");

exports.list = asyncHandler(async (req, res) => {
  const companies = await service.getCompanies(req.user);
  res.json({ message: "Lấy danh sách công ty thành công", companies });
});

exports.get = asyncHandler(async (req, res) => {
  const company = await service.getCompany(req.user, parseId(req.params.id, "company id"));
  res.json({ message: "Lấy thông tin công ty thành công", company });
});

exports.create = asyncHandler(async (req, res) => {
  const company = await service.createCompany(req.user, req.body);
  res.status(201).json({ message: "Tạo công ty thành công", company });
});

exports.update = asyncHandler(async (req, res) => {
  const company = await service.updateCompany(req.user, parseId(req.params.id, "company id"), req.body);
  res.json({ message: "Cập nhật công ty thành công", company });
});
