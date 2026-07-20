// src/modules/internal/customer/customer.controller.js
// Admin chinh diem khach de test/dieu chinh -> tai dung dung logic thang hang cua payment.
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const { setPointsAndProcessRank } = require("../../customer/profile/profile.service");

// POST /internal/customers/:id/points  body { points: <int >= 0> }
// points la GIA TRI TUYET DOI. Rank duoc tinh lai qua computeRank.
exports.adjustPoints = asyncHandler(async (req, res) => {
  const updated = await setPointsAndProcessRank(Number(req.params.id), req.body.points);
  res.json({ message: "Đã cập nhật điểm và hạng thành viên", customer: updated });
});
