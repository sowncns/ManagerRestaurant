// src/modules/internal/cashback/cashback.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const service = require("./cashback.service");

exports.list = asyncHandler(async (req, res) => {
  const rates = await service.list();
  res.json({ message: "Lấy cấu hình cashback thành công", rates });
});

exports.update = asyncHandler(async (req, res) => {
  const rate = await service.updateRate(req.params.rank, req.body.percent);
  res.json({ message: "Cập nhật % cashback thành công", rate });
});
