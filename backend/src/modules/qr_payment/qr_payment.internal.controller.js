
const { asyncHandler } = require("../../shared/utils/asyncHandler");
const service = require("./qr_payment.service");

exports.requestPayment = asyncHandler(async (req, res) => {
  const { customerId, amount, tableId, invoiceId } = req.body;
  const requestId = await service.requestPayment(req.user.branch_id, customerId, amount, tableId, invoiceId);
  res.json({ message: "Đã gửi yêu cầu thanh toán đến app khách hàng.", requestId });
});

exports.getPaymentStatus = asyncHandler(async (req, res) => {
  const data = await service.getPaymentStatus(req.params.requestId);
  res.json({ status: data.status, tableId: data.tableId });
});

exports.cancelPayment = asyncHandler(async (req, res) => {
  await service.cancelPayment(req.body.requestId);
  res.json({ message: "Đã hủy yêu cầu thanh toán." });
});
