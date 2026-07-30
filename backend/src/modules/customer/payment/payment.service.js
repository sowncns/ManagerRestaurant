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
const { sendMail } = require("../../../shared/utils/mail");

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

    // Gui hoa don VAT qua email (neu phuc vu da nhap thong tin).
    try {
      const vatStr = await redisClient.get(`table_vat_${invoice.table_id}`);
      if (vatStr) {
        const vat = JSON.parse(vatStr);
        if (vat.email) {
          const items = typeof invoice.items === "string" ? JSON.parse(invoice.items) : (invoice.items || []);
          const m = (n) => Number(n).toLocaleString("vi-VN");
          const rows = items.map((it) =>
            `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${it.name}</td>
             <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${it.quantity}</td>
             <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${m(it.price)}đ</td>
             <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${m(it.line_total)}đ</td></tr>`
          ).join("");
          const html = `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#333">
            <h2 style="text-align:center;color:#1e293b">HÓA ĐƠN GIÁ TRỊ GIA TĂNG</h2>
            <p style="text-align:center;color:#64748b;font-size:14px">Mã HĐ: <b>${invoice.invoice_code}</b></p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>
            ${vat.companyName ? `<p><b>Đơn vị:</b> ${vat.companyName}</p>` : ""}
            ${vat.taxCode ? `<p><b>MST:</b> ${vat.taxCode}</p>` : ""}
            ${vat.address ? `<p><b>Địa chỉ:</b> ${vat.address}</p>` : ""}
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <thead><tr style="background:#f8fafc">
                <th style="padding:8px 10px;text-align:left">Món</th>
                <th style="padding:8px 10px;text-align:center">SL</th>
                <th style="padding:8px 10px;text-align:right">Đơn giá</th>
                <th style="padding:8px 10px;text-align:right">Thành tiền</th>
              </tr></thead><tbody>${rows}</tbody>
            </table>
            <div style="text-align:right;margin-top:16px;font-size:18px;font-weight:700;color:#1e293b">Tổng: ${m(invoice.amount)}đ</div>
            <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px">Cảm ơn quý khách đã sử dụng dịch vụ tại iGourmet.</p>
          </div>`;
          await sendMail(vat.email, `Hóa đơn VAT #${invoice.invoice_code} — iGourmet`, html);
          await redisClient.del(`table_vat_${invoice.table_id}`);
          logger.info({ email: vat.email, invoiceId: invoice.id }, "Đã gửi hóa đơn VAT qua email (payment callback)");
        }
      }
    } catch (e) {
      logger.error({ err: e, tableId: invoice.table_id }, "Lỗi gửi hóa đơn VAT qua email");
    }

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
