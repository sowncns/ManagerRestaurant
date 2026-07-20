// src/modules/customer/payment/payment.service.js
// Nap vi qua PayOS: tao link thanh toan + xu ly webhook (idempotent).
const pool = require("../../../config/db");
const PayOS = require("@payos/node");
const repo = require("./payment.repository");
const checkoutRepo = require("../../internal/checkout/checkout.repository");
const { applyCashback } = require("../../../shared/services/cashback.service");
const { addPointsAndProcessRank } = require("../profile/profile.service");
const { redisClient } = require("../../../config/redis");
const logger = require("../../../shared/utils/logger");
const { AppError, BadRequest, NotFound, Conflict } = require("../../../shared/errors/AppError");

let _payos = null;
function getPayOS() {
  if (_payos) return _payos;
  const { PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY } = process.env;
  if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY || !PAYOS_CHECKSUM_KEY) {
    throw new AppError("Thiếu cấu hình PayOS (CLIENT_ID / API_KEY / CHECKSUM_KEY)", 500);
  }
  _payos = new PayOS(PAYOS_CLIENT_ID.trim(), PAYOS_API_KEY.trim(), PAYOS_CHECKSUM_KEY.trim());
  return _payos;
}

function generateOrderCode() {
  return Number(`${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`);
}
exports.generateOrderCode = generateOrderCode;

// Tao PayOS link "tho" (khong gan topup) - dung cho thanh toan hoa don qua chuyen khoan.
exports.createRawPaymentLink = async ({ orderCode, amount, description, returnUrl, cancelUrl }) => {
  const normalized = Number(amount);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new BadRequest("Số tiền thanh toán phải là số nguyên dương");
  }
  const link = await getPayOS().createPaymentLink({
    orderCode,
    amount: normalized,
    description: (description || `HOA DON ${orderCode}`).slice(0, 25),
    returnUrl: returnUrl || process.env.PAYOS_SUCCESS_URL || process.env.PAYOS_RETURN_URL || "http://localhost:5000/payment/success",
    cancelUrl: cancelUrl || process.env.PAYOS_CANCEL_URL || "http://localhost:5000/payment/cancel",
  });
  return link; // { checkoutUrl, qrCode, paymentLinkId, ... }
};

exports.createPaymentLink = async ({ customerId, amount, description, returnUrl, cancelUrl }) => {
  const normalized = Number(amount);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new BadRequest("Số tiền nạp phải là số nguyên dương");
  }

  const wallet = await repo.findWalletByCustomer(customerId);
  if (!wallet) throw new NotFound("Không tìm thấy ví khách hàng");
  if (wallet.status !== "ACTIVE") throw new Conflict("Ví khách hàng không hoạt động");

  const orderCode = generateOrderCode();
  const desc = description || `NAP VI ${customerId}`;
  const payOS = getPayOS();

  try {
    const topupId = await repo.insertTopup(wallet.id, orderCode, normalized);
    const link = await payOS.createPaymentLink({
      orderCode,
      amount: normalized,
      description: desc.slice(0, 25),
      returnUrl: returnUrl || process.env.PAYOS_SUCCESS_URL || process.env.PAYOS_RETURN_URL || "http://localhost:5000/payment/success",
      cancelUrl: cancelUrl || process.env.PAYOS_CANCEL_URL || "http://localhost:5000/payment/cancel",
    });
    await repo.updateTopupLink(topupId, link.checkoutUrl, link.qrCode, link.paymentLinkId);
    return { orderCode, ...link };
  } catch (error) {
    await repo.failPendingTopup(orderCode);
    if (error instanceof AppError) throw error;
    throw new AppError(`Tạo link thanh toán thất bại: ${error.message}`, 500);
  }
};

// Doi soat thanh toan HOA DON qua PayOS (chuyen khoan). Idempotent.
async function settleInvoicePayment(orderCode, paidAmount, isSuccess) {
  const client = await pool.connect();
  let pointsCustomerId = null;
  let pointsAmount = 0;
  try {
    await client.query("BEGIN");
    const ip = await checkoutRepo.lockInvoicePaymentByOrderCode(client, orderCode);
    if (!ip) {
      await client.query("COMMIT");
      return { orderCode, status: "IGNORED", reason: "PAYMENT_NOT_FOUND" };
    }
    if (ip.status === "SUCCESS") {
      await client.query("COMMIT");
      return { orderCode, status: "SUCCESS", duplicated: true };
    }
    if (!isSuccess) {
      await checkoutRepo.setInvoicePaymentStatus(client, orderCode, "FAILED");
      await client.query("COMMIT");
      return { orderCode, status: "FAILED", duplicated: false };
    }
    if (Number(ip.amount) !== paidAmount) {
      throw new BadRequest("Số tiền PayOS không khớp hóa đơn");
    }

    const invoice = await checkoutRepo.lockInvoiceById(client, ip.invoice_id);
    if (!invoice) throw new NotFound("Không tìm thấy hóa đơn");

    if (invoice.status !== "PAID") {
      await checkoutRepo.markInvoicePaidById(client, invoice.id);
      await applyCashback(client, invoice.id);
      await checkoutRepo.completeOrders(client, invoice.table_id);
      await checkoutRepo.setTableStatus(client, invoice.table_id, "SERVING");
    }
    await checkoutRepo.setInvoicePaymentStatus(client, orderCode, "SUCCESS");
    await client.query("COMMIT");

    await redisClient.del(`table_voucher_${invoice.table_id}`);
    await redisClient.del(`checkout_intent_table_${invoice.table_id}`);

    if (invoice.customer_id) {
      pointsCustomerId = invoice.customer_id;
      pointsAmount = Number(invoice.amount);
    }
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // Tich diem sau commit (chi khi co gan khach).
  if (pointsCustomerId && pointsAmount > 0) {
    try {
      await addPointsAndProcessRank(pointsCustomerId, pointsAmount);
    } catch (e) {
      logger.error({ err: e, customerId: pointsCustomerId }, "Lỗi cộng điểm sau thanh toán chuyển khoản");
    }
  }
  return { orderCode, status: "SUCCESS", duplicated: false };
}

exports.handleWebhook = async (webhookBody) => {
  let data;
  try {
    data = getPayOS().verifyPaymentWebhookData(webhookBody);
  } catch (error) {
    throw new BadRequest(`Webhook PayOS không hợp lệ: ${error.message}`);
  }

  const orderCode = Number(data.orderCode);
  const paidAmount = Number(data.amount);
  const isSuccess =
    webhookBody.code === "00" && webhookBody.success === true && data.code === "00";
  if (!Number.isSafeInteger(orderCode) || !Number.isFinite(paidAmount)) {
    throw new BadRequest("Dữ liệu giao dịch PayOS không hợp lệ");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const topup = await repo.lockTopupByOrderCode(client, orderCode);

    if (!topup) {
      // Khong phai nap vi -> thu doi soat thanh toan hoa don (chuyen khoan).
      await client.query("COMMIT");
      return await settleInvoicePayment(orderCode, paidAmount, isSuccess);
    }
    if (topup.status === "SUCCESS") {
      await client.query("COMMIT");
      return { orderCode, status: "SUCCESS", duplicated: true };
    }
    if (!isSuccess) {
      await repo.failTopupById(client, topup.id);
      await client.query("COMMIT");
      return { orderCode, status: "FAILED", duplicated: false };
    }
    if (Number(topup.amount) !== paidAmount) {
      throw new BadRequest("Số tiền PayOS không khớp giao dịch nạp tiền");
    }

    const wallet = await repo.lockWalletById(client, topup.wallet_id);
    if (!wallet) throw new NotFound("Không tìm thấy ví nhận tiền");
    if (wallet.status !== "ACTIVE") throw new Conflict("Ví nhận tiền không hoạt động");

    const balanceBefore = Number(wallet.balance);
    const balanceAfter = balanceBefore + paidAmount;

    await repo.updateWalletBalance(client, wallet.id, balanceAfter);
    await repo.markTopupSuccess(client, topup.id);
    await repo.insertTopupTransaction(client, {
      walletId: wallet.id,
      code: `TOPUP-${orderCode}`,
      amount: paidAmount,
      balanceBefore,
      balanceAfter,
      topupId: topup.id,
      description: `Nạp tiền qua PayOS - ${orderCode}`,
    });

    await client.query("COMMIT");
    return { orderCode, status: "SUCCESS", duplicated: false };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

exports.confirmWebhookUrl = async () => {
  const url = process.env.PAYOS_WEBHOOK_URL;
  if (!url) return logger.warn("PAYOS_WEBHOOK_URL chưa được cấu hình");
  try {
    const result = await getPayOS().confirmWebhook(url);
    logger.info({ result }, "PayOS webhook confirmed");
  } catch (error) {
    logger.error({ err: error }, "PayOS webhook confirm thất bại");
  }
};
