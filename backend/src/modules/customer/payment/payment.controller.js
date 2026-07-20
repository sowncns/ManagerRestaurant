// src/modules/customer/payment/payment.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const service = require("./payment.service");
const logger = require("../../../shared/utils/logger");

exports.createPaymentLink = asyncHandler(async (req, res) => {
  const { amount, description, returnUrl, cancelUrl } = req.body;
  const results = await service.createPaymentLink({
    customerId: req.user.id,
    amount,
    description,
    returnUrl,
    cancelUrl,
  });
  res.json({ message: "Tạo thành công link", results });
});

// PayOS goi (khong auth). Luon tra 200 de PayOS khong retry lien tuc.
exports.receiveWebhook = asyncHandler(async (req, res) => {
  try {
    const result = await service.handleWebhook(req.body);
    res.status(200).json({ code: "00", desc: "success", data: result });
  } catch (error) {
    logger.error({ err: error }, "PayOS webhook error");
    res.status(200).json({ code: "01", desc: error.message || "Webhook processing failed" });
  }
});
