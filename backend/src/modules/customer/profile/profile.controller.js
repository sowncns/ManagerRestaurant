// src/modules/customer/profile/profile.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const service = require("./profile.service");

exports.getProfile = asyncHandler(async (req, res) => {
  const profile = await service.getProfileByCustomerId(req.user.id);
  res.json({ message: "Lấy thông tin hồ sơ thành công", profile });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const profile = await service.updateProfileByCustomerId(req.user.id, req.body);
  res.json({ message: "Cập nhật hồ sơ thành công", profile });
});

exports.getTransactions = asyncHandler(async (req, res) => {
  const transactions = await service.getTransactionHistory(req.user.id);
  res.json({ message: "Lấy lịch sử giao dịch thành công", transactions });
});

exports.setupPin = asyncHandler(async (req, res) => {
  await service.setupPaymentPin(req.user.id, req.body.pin);
  res.json({ message: "Thiết lập mã PIN thành công" });
});

exports.verifyPin = asyncHandler(async (req, res) => {
  const isValid = await service.verifyPaymentPin(req.user.id, req.body.pin);
  res.json({ message: "Xác thực PIN thành công", isValid });
});

exports.addPoints = asyncHandler(async (req, res) => {
  const profile = await service.addPointsAndProcessRank(req.user.id, req.body.points);
  res.json({ message: "Cập nhật điểm thành công", profile });
});
