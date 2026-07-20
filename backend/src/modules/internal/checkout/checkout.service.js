// src/modules/internal/checkout/checkout.service.js
const pool = require("../../../config/db");
const { redisClient } = require("../../../config/redis");
const repo = require("./checkout.repository");
const qrService = require("../../qr_payment/qr_payment.service");
const qrRepo = require("../../qr_payment/qr_payment.repository");
const paymentService = require("../../customer/payment/payment.service");
const { addPointsAndProcessRank } = require("../../customer/profile/profile.service");
const { applyCashback } = require("../../../shared/services/cashback.service");
const { BadRequest, NotFound } = require("../../../shared/errors/AppError");
const logger = require("../../../shared/utils/logger");

function generateInvoiceCode() {
  return `INV-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
}

async function createInvoice(currentUser, tableId, paymentMethod, customerIdFromReq = null) {
  if (paymentMethod === "DEBT") {
    const allowedRoles = ["CASHIER", "BRANCH_MANAGER", "COMPANY_ADMIN", "SUPER_ADMIN"];
    if (!allowedRoles.includes(currentUser.role)) {
      throw new BadRequest("Chỉ Thu ngân hoặc Quản lý mới được phép Ghi nợ");
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Kiem tra ban
    const table = await repo.lockTable(client, tableId);
    if (!table) throw new NotFound("Không tìm thấy bàn");
    if (table.status !== "SERVING" && table.status !== "WAIT_PAYMENT") {
      throw new BadRequest("Bàn không ở trạng thái phục vụ");
    }

    // 2. Tong tien
    let totalAmount = await repo.sumOrderTotal(client, tableId);
    if (totalAmount <= 0) throw new BadRequest("Bàn chưa có món nào để thanh toán");

    // 3. Voucher (tu Redis) + xac dinh khach hang
    let appliedCustomerVoucherId = null;
    let finalCustomerId = customerIdFromReq;
    const voucherStr = await redisClient.get(`table_voucher_${tableId}`);
    if (voucherStr) {
      const v = JSON.parse(voucherStr);
      if (v.discountAmount) totalAmount = Math.max(0, totalAmount - v.discountAmount);
      if (v.customerVoucherId) appliedCustomerVoucherId = v.customerVoucherId;
      if (v.customerId) finalCustomerId = v.customerId;
    }

    // 3b. Can tien coc da giu (neu ban gan phieu dat co coc HELD) vao tong phai tra.
    let depositApplied = 0;
    const held = await repo.findHeldDepositByTable(client, tableId);
    if (held) {
      const deposit = parseFloat(held.deposit_amount) || 0;
      depositApplied = Math.min(deposit, totalAmount);
      totalAmount = Math.max(0, totalAmount - depositApplied);
      const excess = deposit - depositApplied;
      if (excess > 0 && held.customer_id) {
        // Coc thua so voi hoa don -> hoan phan thua ve vi khach.
        await repo.refundToWallet(client, {
          customerId: held.customer_id,
          amount: excess,
          reservationId: held.id,
          description: `Hoàn cọc thừa khi thanh toán bàn ${tableId}`,
        });
      }
      await repo.markDepositApplied(client, held.id);
    }

    // 4. Snapshot mon an vao hoa don
    const itemsJson = JSON.stringify(await repo.fetchOrderItemsSnapshot(client, tableId));

    // 5. Tao invoice. CASH -> PAID ngay; APP/TRANSFER -> UNPAID (cho khach tra).
    const invoice = await repo.insertInvoice(client, {
      invoice_code: generateInvoiceCode(),
      company_id: currentUser.company_id,
      branch_id: currentUser.branch_id,
      table_id: tableId,
      amount: totalAmount,
      status: paymentMethod === "CASH" ? "PAID" : "UNPAID",
      customer_id: finalCustomerId || null,
      items: itemsJson,
    });

    if (appliedCustomerVoucherId) {
      await repo.markCustomerVoucherUsed(client, appliedCustomerVoucherId);
    }

    // 6. Xu ly theo phuong thuc
    if (paymentMethod === "TRANSFER") {
      // Chuyen khoan qua PayOS: tao ban ghi doi soat PENDING, sinh QR sau khi commit.
      const orderCode = paymentService.generateOrderCode();
      await repo.insertInvoicePayment(client, { orderCode, invoiceId: invoice.id, amount: totalAmount });
      await repo.setTableStatus(client, tableId, "WAIT_PAYMENT");
      await client.query("COMMIT");

      let link;
      try {
        link = await paymentService.createRawPaymentLink({
          orderCode,
          amount: Math.round(totalAmount),
          description: `HD ${invoice.invoice_code}`.slice(0, 25),
        });
      } catch (e) {
        logger.error({ err: e, orderCode }, "Tạo PayOS link cho hóa đơn thất bại");
        throw new BadRequest("Không tạo được mã thanh toán PayOS. Vui lòng thử lại.");
      }

      const intent = {
        invoiceId: invoice.id,
        invoiceCode: invoice.invoice_code,
        amount: invoice.amount,
        tableId,
        method: "TRANSFER",
        orderCode,
        qrCode: link.qrCode,
        checkoutUrl: link.checkoutUrl,
      };
      await redisClient.set(`checkout_intent_table_${tableId}`, JSON.stringify(intent), { EX: 600 });
      return { message: "Đã tạo mã chuyển khoản PayOS. Mời khách quét để thanh toán.", intent, depositApplied };
    }

    if (paymentMethod === "APP") {
      if (!finalCustomerId) {
        throw new BadRequest("Chưa có thông tin khách hàng. Vui lòng quét mã thẻ thành viên của khách trước khi thanh toán Qua App.");
      }
      const intent = {
        invoiceId: invoice.id,
        invoiceCode: invoice.invoice_code,
        amount: invoice.amount,
        tableId,
        method: "APP",
      };
      await redisClient.set(`checkout_intent_table_${tableId}`, JSON.stringify(intent), { EX: 300 });
      await repo.setTableStatus(client, tableId, "WAIT_PAYMENT");
      await client.query("COMMIT");
      
      // Ban push yeu cau thanh toan xuong app cua Khach Hang
      await qrService.requestPayment(currentUser.branch_id, finalCustomerId, invoice.amount, tableId, invoice.id);
      
      await redisClient.del(`table_voucher_${tableId}`);
      return { message: "Đã gửi yêu cầu thanh toán tới Ứng dụng khách hàng.", intent, depositApplied };
    }

    if (paymentMethod === "DEBT") {
      await repo.completeOrders(client, tableId);
      await repo.setTableStatus(client, tableId, "SERVING");
      await client.query("COMMIT");
      await redisClient.del(`table_voucher_${tableId}`);
      return { message: "Đã lưu hóa đơn vào công nợ (Chưa thanh toán).", intent: { invoiceId: invoice.id }, depositApplied };
    }

    // CASH -> dong ban luon (kho da tru luc bep nau)
    await applyCashback(client, invoice.id);
    await repo.completeOrders(client, tableId);
    await repo.setTableStatus(client, tableId, "SERVING");
    await client.query("COMMIT");
    await redisClient.del(`table_voucher_${tableId}`);

    // Tich diem cho khach (neu co gan khach). Transaction rieng, khong chan luong chinh.
    if (finalCustomerId && totalAmount > 0) {
      try {
        await addPointsAndProcessRank(finalCustomerId, totalAmount);
      } catch (e) {
        logger.error({ err: e, customerId: finalCustomerId }, "Lỗi cộng điểm sau thanh toán tiền mặt");
      }
    }

    return { message: "Thanh toán thành công. Bàn đã được đóng.", invoice, depositApplied };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ---- Checkout intent (Redis) ----
async function getCheckoutIntent(tableId) {
  const data = await redisClient.get(`checkout_intent_table_${tableId}`);
  if (!data) return { hasIntent: false };
  return { hasIntent: true, intent: JSON.parse(data) };
}

async function cancelCheckoutIntent(tableId) {
  await redisClient.del(`checkout_intent_table_${tableId}`);
  const client = await pool.connect();
  try {
    await repo.setTableStatus(client, tableId, "SERVING");
  } catch (err) {
    // Ignore error if table doesn't exist
  } finally {
    client.release();
  }
}

// ---- Voucher ----
async function validateVoucher(code, orderTotal, tableId) {
  let actualCode = code;
  let customerId = null;

  // Format tuy chon: CUSTOMERID-VOUCHERCODE (vd 12-WELCOME50)
  if (code.includes("-") && !code.startsWith("VOUCHER")) {
    const parts = code.split("-");
    customerId = parseInt(parts[0], 10);
    actualCode = parts.slice(1).join("-");
  }

  const voucher = await repo.findVoucherTemplate(actualCode);
  if (!voucher) throw new BadRequest("Mã voucher không hợp lệ, không có hiệu lực hoặc đã hết hạn.");

  let customerVoucherId = null;
  if (customerId && !isNaN(customerId)) {
    const cv = await repo.findCustomerVoucher(customerId, voucher.id);
    if (!cv) throw new BadRequest("Bạn không sở hữu voucher này hoặc voucher đã được sử dụng.");
    customerVoucherId = cv.id;
  }

  if (parseFloat(voucher.min_order_amount) > orderTotal) {
    throw new BadRequest(
      `Đơn hàng tối thiểu để áp dụng là ${parseFloat(voucher.min_order_amount).toLocaleString("vi-VN")}đ`
    );
  }

  let discountAmount = 0;
  if (voucher.discount_type === "percent") {
    discountAmount = (orderTotal * parseFloat(voucher.discount_value)) / 100;
    const maxDiscount = parseFloat(voucher.max_discount_amount);
    if (maxDiscount > 0 && discountAmount > maxDiscount) discountAmount = maxDiscount;
  } else if (voucher.discount_type === "fixed") {
    discountAmount = parseFloat(voucher.discount_value);
  }

  const voucherData = {
    voucherCode: voucher.code,
    voucherName: voucher.name,
    discountAmount,
    customerId,
    customerVoucherId,
  };

  if (tableId) {
    await redisClient.set(`table_voucher_${tableId}`, JSON.stringify(voucherData), { EX: 3600 });
  }
  return voucherData;
}

// ---- Quet QR khach hang (nhan vien) ----
// Resolve token QR -> gan voucher (kem khach) hoac chi gan khach vao ban.
async function scanCustomerQR(tableId, token) {
  let data;
  if (!token.startsWith("QRS-")) {
    const numericToken = parseInt(token, 10);
    const customer = await pool.query(
      "SELECT customer_id FROM customers WHERE customer_id = $1 OR phone = $2 LIMIT 1",
      [isNaN(numericToken) ? null : numericToken, token]
    );
    if (!customer.rows.length) {
      throw new NotFound("Không tìm thấy khách hàng với ID hoặc SĐT này.");
    }
    data = { type: "MEMBER", customerId: customer.rows[0].customer_id };
  } else {
    data = await qrService.resolveScanToken(token); // { type, customerId, voucherCode? }
  }

  // Replaced above
  const customerName = await qrRepo.findCustomerName(data.customerId);
  const orderTotal = await repo.sumOrderTotal(pool, tableId);

  if (data.type === "VOUCHER") {
    const result = await validateVoucher(`${data.customerId}-${data.voucherCode}`, orderTotal, tableId);
    return {
      type: "VOUCHER",
      customerId: Number(data.customerId),
      customerName,
      voucherApplied: result.voucherName || result.voucherCode,
      discountAmount: result.discountAmount,
      newTotal: Math.max(0, orderTotal - result.discountAmount),
    };
  }

  // MEMBER: chi gan khach vao ban (khong voucher) de tich diem khi thanh toan.
  const voucherData = {
    voucherCode: "",
    voucherName: "",
    discountAmount: 0,
    customerId: Number(data.customerId),
    customerVoucherId: null,
  };
  await redisClient.set(`table_voucher_${tableId}`, JSON.stringify(voucherData), { EX: 3600 });
  return {
    type: "MEMBER",
    customerId: Number(data.customerId),
    customerName,
    voucherApplied: null,
    discountAmount: 0,
    newTotal: orderTotal,
  };
}

async function getTableVoucher(tableId) {
  const dataStr = await redisClient.get(`table_voucher_${tableId}`);
  if (!dataStr) return { voucherCode: "", discountAmount: 0, voucherName: "" };
  const data = JSON.parse(dataStr);
  if (data.customerId) {
    data.customerName = await qrRepo.findCustomerName(data.customerId);
  }
  return data;
}

async function saveTableVat(tableId, vatData) {
  await redisClient.set(`table_vat_${tableId}`, JSON.stringify(vatData), { EX: 3600 });
}

async function getTableVat(tableId) {
  const data = await redisClient.get(`table_vat_${tableId}`);
  return data ? JSON.parse(data) : null;
}

// ---- Kiem mon (pre-bill): mon hien tai + gia goc + VAT tung muc. Khong thu tien. ----
async function getKiemMon(tableId) {
  const rows = await repo.fetchKiemMonItems(tableId);
  let subtotal = 0;
  let vatTotal = 0;
  const vatByRate = {}; // { "8": tienVat, "10": tienVat }
  const items = rows.map((r) => {
    const lineTotal = parseFloat(r.line_total) || 0;
    const rate = parseFloat(r.vat) || 0;
    const lineVat = (lineTotal * rate) / 100;
    subtotal += lineTotal;
    vatTotal += lineVat;
    vatByRate[rate] = (vatByRate[rate] || 0) + lineVat;
    return {
      itemName: r.item_name,
      quantity: r.quantity,
      unitPrice: parseFloat(r.unit_price),
      lineTotal,
      vat: rate,
    };
  });
  return { items, subtotal, vatTotal, vatByRate, total: subtotal + vatTotal };
}

// ---- Hoa don moi nhat ----
async function getLatestInvoice(tableId) {
  const invoice = await repo.findLatestPaidInvoice(tableId);
  if (!invoice) throw new NotFound("Không tìm thấy hóa đơn nào đã thanh toán cho bàn này");
  const items = await repo.findCompletedItems(tableId);
  return { ...invoice, items };
}

const MANAGER_ROLES = new Set(["BRANCH_MANAGER", "COMPANY_ADMIN", "SUPER_ADMIN"]);
const CLOSED_ORDER = new Set(["COMPLETED", "CANCELLED"]);


async function discountItem(user, orderItemId, { discount_percent, note }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const item = await repo.lockOrderItemForVoid(client, orderItemId, user.company_id, user.branch_id);
    if (!item) throw new NotFound("Không tìm thấy món trong đơn");
    if (CLOSED_ORDER.has(item.order_status)) {
      throw new BadRequest("Đơn đã đóng/thanh toán — không thể giảm giá");
    }
    if (item.billing_status === "VOIDED") throw new BadRequest("Món đã bị void, không thể giảm giá");

    await repo.setItemDiscount(client, orderItemId, discount_percent);
    await client.query("COMMIT");
    const lineBase = Number(item.unit_price) * item.quantity;
    return {
      order_item_id: orderItemId,
      discount_percent,
      discounted_amount: Math.round((lineBase * discount_percent) / 100),
      note: note || null,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function voidItem(user, orderItemId, { reason_code, note }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const item = await repo.lockOrderItemForVoid(client, orderItemId, user.company_id, user.branch_id);
    if (!item) throw new NotFound("Không tìm thấy món trong đơn");
    if (CLOSED_ORDER.has(item.order_status)) {
      throw new BadRequest("Đơn đã đóng/thanh toán — dùng quy trình hoàn tiền (refund)");
    }
    if (item.billing_status === "VOIDED") throw new BadRequest("Món đã được void trước đó");

    const amount = Number(item.total_price) || Number(item.unit_price) * item.quantity;
    const threshold = Number(item.void_pin_threshold) || 0;
    if (threshold > 0 && amount >= threshold && !MANAGER_ROLES.has(user.role)) {
      throw new BadRequest(
        `Void giá trị ≥ ${threshold.toLocaleString("vi-VN")}đ cần quản lý thực hiện`
      );
    }

    await repo.setItemVoided(client, orderItemId, user.employee_id || user.id);
    await client.query("COMMIT");
    return {
      order_item_id: orderItemId,
      billing_status: "VOIDED",
      voided_amount: amount,
      reason_code,
      note: note || null,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}


async function listInvoices(currentUser, filters) {
  return repo.listInvoices(currentUser, filters);
}

async function markInvoicePaid(invoiceId) {
  const inv = await repo.markInvoicePaid(invoiceId);
  if (inv.rowCount === 0) throw new NotFound("Không tìm thấy hóa đơn");
  return { message: "Đã cập nhật hóa đơn thành Đã thanh toán" };
}

module.exports = {
  listInvoices,
  markInvoicePaid,
  createInvoice,
  scanCustomerQR,
  getCheckoutIntent,
  cancelCheckoutIntent,
  validateVoucher,
  getTableVoucher,
  saveTableVat,
  getTableVat,
  getKiemMon,
  getLatestInvoice,
  voidItem,
  discountItem,
};
