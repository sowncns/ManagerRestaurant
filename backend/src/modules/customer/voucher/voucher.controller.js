// src/modules/customer/voucher/voucher.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const service = require("./voucher.service");

exports.getVouchers = asyncHandler(async (req, res) => {
  const vouchers = await service.getVouchersByCustomerId(req.user.id);
  res.json({ message: "Lấy thông tin voucher thành công", vouchers });
});
