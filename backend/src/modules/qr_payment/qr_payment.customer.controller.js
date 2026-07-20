// src/modules/qr_payment/qr_payment.customer.controller.js
// Phia KHACH HANG: xem yeu cau cho, xac nhan/tu choi, lich su hoa don.
const { asyncHandler } = require("../../shared/utils/asyncHandler");
const service = require("./qr_payment.service");

exports.getPendingPayment = asyncHandler(async (req, res) => {
  const payment = await service.getPendingPayment(req.user.id);
  if (!payment) return res.json({ hasPending: false });
  res.json({ hasPending: true, ...payment });
});

// SSE: giu ket noi mo, day yeu cau thanh toan xuong app ngay khi nhan vien gui.
// Thay cho polling. Khong dung asyncHandler vi ket noi song lau, tu quan ly loi.
exports.streamPending = (req, res) => {
  const customerId = req.user.id;
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // tat buffer neu chay sau nginx
  });
  res.flushHeaders?.();

  let lastReqId = null;
  const push = (payment) => {
    if (!payment || payment.requestId === lastReqId) return;
    lastReqId = payment.requestId;
    res.write(`event: pending\ndata: ${JSON.stringify(payment)}\n\n`);
  };
  const check = () => service.getPendingPayment(customerId).then(push).catch(() => {});

  check(); // gui trang thai hien tai ngay (bao phu reconnect)
  const onPending = check;
  service.qrEvents.on(`pending:${customerId}`, onPending);

  // Heartbeat giu ket noi + doc lai Redis (an toan neu event bi mat / multi-instance)
  const hb = setInterval(() => {
    res.write(": ping\n\n");
    check();
  }, 25000);

  req.on("close", () => {
    clearInterval(hb);
    service.qrEvents.off(`pending:${customerId}`, onPending);
    res.end();
  });
};

exports.confirmPayment = asyncHandler(async (req, res) => {
  const { requestId, action, pin } = req.body;
  const message = await service.confirmPayment(req.user.id, requestId, action, pin);
  res.json({ message });
});

exports.generatePaymentToken = asyncHandler(async (req, res) => {
  const result = await service.generatePaymentToken(req.user.id);
  res.json(result);
});

exports.generateScanToken = asyncHandler(async (req, res) => {
  const { kind, customerVoucherId } = req.body;
  const result = await service.generateScanToken(req.user.id, { kind, customerVoucherId });
  res.json(result);
});

exports.getInvoiceHistory = asyncHandler(async (req, res) => {
  const history = await service.getInvoiceHistory(req.user.id);
  res.json(history);
});

exports.getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await service.getInvoiceById(req.user.id, req.params.id);
  if (!invoice) return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
  res.json(invoice);
});
