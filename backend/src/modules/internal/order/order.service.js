// src/modules/internal/order/order.service.js
const pool = require("../../../config/db");
const repo = require("./order.repository");
const { consumeForDish } = require("../../../shared/services/consumption.service");
const depositService = require("../../../shared/services/deposit.service");
const { assertBranchScope } = require("../../../shared/utils/permission");
const { getCashbackRate } = require("../../../shared/services/cashback.service");
const { BadRequest, NotFound } = require("../../../shared/errors/AppError");

// Luong trang thai bep (da bo COOKING): WAITING -> quet QR -> READY -> SERVED.
// Tru kho khi mon roi WAITING sang trang thai da nau (READY/SERVED), 1 lan duy nhat.
const KITCHEN_STATUSES = ["WAITING", "READY", "SERVED", "CANCELLED"];
const COOKED_STATUSES = new Set(["READY", "SERVED"]);

function generateOrderCode() {
  const today = new Date();
  const datePart =
    today.getFullYear() +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return "OD" + datePart + suffix;
}

// Tinh gia + VAT cho danh sach mon, dua tren menu_items lay tu DB
function buildItems(orderItems, menuById, { requireAvailable }) {
  let subtotal = 0;
  let totalVat = 0;
  const items = [];

  for (const item of orderItems) {
    const food = menuById.get(item.menu_item_id);
    if (!food) throw new NotFound(`Menu item ${item.menu_item_id} not found.`);
    const inactive = food.status.toUpperCase() !== "ACTIVE";
    const unavailable = requireAvailable && food.is_available === false;
    if (inactive || unavailable) throw new BadRequest(`${food.name} is unavailable.`);

    const totalPrice = Number(food.price) * Number(item.quantity);
    const vatRate = Number(food.vat) || 0;
    const vatAmount = (totalPrice * vatRate) / 100;

    subtotal += totalPrice;
    totalVat += vatAmount;
    items.push({
      menu_item_id: food.id,
      item_name: food.name,
      unit_price: food.price,
      quantity: item.quantity,
      total_price: totalPrice,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      note: item.note || null,
    });
  }
  return { items, subtotal, totalVat };
}

async function createOrder(data) {
  const { company_id, branch_id, table_id, waiter_id, note, guest_count, order_items } = data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const table = await repo.findTable(client, table_id, branch_id);
    if (!table) throw new NotFound("Table not found.");

    const status = (table.status || "").toUpperCase();
    if (!["AVAILABLE", "SERVING", "RESERVED"].includes(status)) {
      throw new BadRequest("Table is not available.");
    }
    if (status === "RESERVED") {
      await repo.checkinReservation(client, table_id, waiter_id);
    }

    // Neu ban da co don dang mo -> them mon vao don do
    const active = await repo.findActiveOrderId(client, table_id);
    if (active) {
      await client.query("ROLLBACK");
      return addOrderItems(active.id, { ...data, items: data.order_items });
    }

    const menuRows = order_items?.length ? await repo.findMenuItems(client, order_items.map((i) => i.menu_item_id), branch_id) : [];
    const menuById = new Map(menuRows.map((r) => [r.id, r]));
    const { items, subtotal, totalVat } = order_items?.length ? buildItems(order_items, menuById, { requireAvailable: true }) : { items: [], subtotal: 0, totalVat: 0 };

    const order = await repo.insertOrder(client, {
      order_code: generateOrderCode(),
      company_id,
      branch_id,
      table_id,
      waiter_id,
      guest_count,
      subtotal,
      vat_amount: totalVat,
      total_amount: subtotal + totalVat,
      note,
    });

    if (items.length > 0) {
      await repo.bulkInsertOrderItems(client, order.id, items, waiter_id);
    }
    await repo.setTableStatus(client, table_id, "SERVING");
    await client.query("COMMIT");

    const detail = await repo.findOrderDetail(pool, order.id);
    const orderItemsRows = await repo.findOrderItems(pool, order.id);
    return {
      success: true,
      message: "Order created successfully.",
      data: { ...detail, items: orderItemsRows },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getOrder(orderId, companyId, branchId) {
  const order = await repo.findOrderScoped(pool, orderId, companyId, branchId);
  if (!order) throw new NotFound("Order not found.");
  const items = await repo.findOrderItemsWithMenu(pool, orderId);
  return { ...order, items };
}

async function addOrderItems(orderId, data) {
  const { items: reqItems, company_id, branch_id, waiter_id } = data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const order = await repo.findOrderById(client, orderId, company_id, branch_id);
    if (!order) throw new NotFound("Order not found.");
    if (order.status === "COMPLETED" || order.status === "CANCELLED") {
      throw new BadRequest("Order is closed.");
    }

    const menuRows = await repo.findMenuItems(client, reqItems.map((i) => i.menu_item_id), branch_id);
    const menuById = new Map(menuRows.map((r) => [r.id, r]));
    const { items, subtotal, totalVat } = buildItems(reqItems, menuById, { requireAvailable: false });

    await repo.bulkInsertOrderItems(client, orderId, items, waiter_id);
    await repo.updateOrderTotals(client, orderId, subtotal, totalVat);
    await client.query("COMMIT");

    return { success: true, message: "Items added successfully." };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getActiveOrderForTable(tableId, companyId, branchId) {
  const active = await repo.findActiveOrderScoped(tableId, companyId, branchId);
  if (!active) return null;
  return getOrder(active.id, companyId, branchId);
}

// Quet QR thanh vien: tra ve thong tin khach + vi + voucher kha dung
async function scanMemberQR(orderId, qrCode, companyId, branchId) {
  const customer = await repo.findCustomerByQR(qrCode);
  if (!customer) throw new NotFound("Customer not found or inactive");

  const walletBalance = await repo.findActiveWalletBalance(customer.id);

  const order = await repo.findOrderForScan(orderId, companyId, branchId);
  if (!order) throw new NotFound("Order not found");
  const orderTotal = parseFloat(order.subtotal);

  const vouchers = await repo.findUnusedVouchers(customer.id);
  const valid = [];
  const invalid = [];
  for (const v of vouchers) {
    const minAmount = parseFloat(v.min_order_amount) || 0;
    const eligible = orderTotal >= minAmount;
    let discount = 0;
    if (eligible) {
      if (v.discount_type === "percent") {
        discount = (orderTotal * parseFloat(v.discount_value)) / 100;
        if (v.max_discount_amount && parseFloat(v.max_discount_amount) > 0) {
          discount = Math.min(discount, parseFloat(v.max_discount_amount));
        }
      } else if (v.discount_type === "fixed") {
        discount = parseFloat(v.discount_value);
      }
    }
    const data = { ...v, is_eligible: eligible, calculated_discount: discount };
    (eligible ? valid : invalid).push(data);
  }
  valid.sort((a, b) => b.calculated_discount - a.calculated_discount);

  const rank = (customer.rank || "normal").toLowerCase();
  return {
    customer: { id: customer.id, full_name: customer.full_name, rank: customer.rank, points: customer.points },
    wallet_balance: walletBalance,
    cashback_rate: await getCashbackRate(rank),
    vouchers: [...valid, ...invalid],
  };
}

// ============ BEP (Kitchen) ============

// Doi trang thai bep cho 1 mon. Tru kho khi WAITING -> da nau (mot lan duy nhat).
async function updateItemKitchenStatus(user, orderItemId, newStatus) {
  if (!KITCHEN_STATUSES.includes(newStatus)) {
    throw new BadRequest(`Trạng thái không hợp lệ. Cho phép: ${KITCHEN_STATUSES.join(", ")}`);
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const item = await repo.lockOrderItemScoped(client, orderItemId, user.company_id, user.branch_id);
    if (!item) throw new NotFound("Không tìm thấy món trong đơn");

    // Nhan vien BEP chi thao tac mon dung loai bep cua minh (nong/lanh/bar).
    if (user.role === "KITCHEN" && user.kitchen_type_id != null &&
        item.kitchen_type_id != null && item.kitchen_type_id !== user.kitchen_type_id) {
      throw new BadRequest("Món này không thuộc bếp của bạn");
    }

    const current = item.kitchen_status || "WAITING";
    let consumption = null;

    // Tru kho khi mon bat dau duoc nau (chi tru 1 lan, tu WAITING)
    if (current === "WAITING" && COOKED_STATUSES.has(newStatus)) {
      consumption = await consumeForDish(
        client,
        { menu_item_id: item.menu_item_id, quantity: item.quantity },
        { orderId: item.order_id, branchId: user.branch_id, orderItemId: item.id, createdBy: user.employee_id || user.id }
      );
    }
    // Huy mon: neu da nau -> KHONG hoan kho (nguyen lieu da mat = WASTE);
    //          neu chua nau -> khong anh huong ton kho.

    await repo.updateItemKitchenStatus(client, orderItemId, newStatus);
    await client.query("COMMIT");

    return {
      order_item_id: orderItemId,
      from: current,
      to: newStatus,
      stock_deducted: !!consumption,
      warning: current !== "WAITING" && newStatus === "CANCELLED"
        ? "Món đã nấu bị hủy — nguyên liệu không hoàn kho (được ghi nhận là thất thoát)."
        : undefined,
      consumption,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Tien loi: bat dau nau CA DON (tat ca mon dang WAITING -> COOKING + tru kho).
async function startCookingOrder(user, orderId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const items = await repo.findWaitingItems(client, orderId, user.company_id, user.branch_id);
    if (!items.length) {
      await client.query("COMMIT");
      return { started: 0, message: "Không có món nào đang chờ nấu" };
    }
    for (const it of items) {
      await consumeForDish(
        client,
        { menu_item_id: it.menu_item_id, quantity: it.quantity },
        { orderId, branchId: user.branch_id, orderItemId: it.id, createdBy: user.employee_id || user.id }
      );
      await repo.updateItemKitchenStatus(client, it.id, "READY");
    }
    await client.query("COMMIT");
    return { started: items.length, message: `Đã đánh dấu ${items.length} món nấu xong và trừ kho` };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getKitchenHistory(user) {
  const companyId = user.company_id;
  const branchId = user.branch_id;
  const kitchenTypeId = user.role === "KITCHEN" ? user.kitchen_type_id ?? null : null;
  return repo.findKitchenHistory(companyId, branchId, kitchenTypeId);
};

async function getKitchenQueue(user) {
  // Nhan vien BEP chi thay mon dung loai bep cua minh; quan ly thay tat ca.
  const kitchenTypeId = user.role === "KITCHEN" ? user.kitchen_type_id ?? null : null;
  return repo.findKitchenQueue(user.company_id, user.branch_id, kitchenTypeId);
}

// Quet QR phieu mon (moi mon 1 phieu). QR chua chuoi dang "OIQR-<order_item_id>".
// Ket qua: mon chuyen sang READY (da nau xong) + tru kho (qua updateItemKitchenStatus).
const QR_PREFIX = "OIQR-";

function parseItemQr(qrCode) {
  const raw = String(qrCode || "").trim();
  const body = raw.startsWith(QR_PREFIX) ? raw.slice(QR_PREFIX.length) : raw;
  const id = Number(body);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequest("Mã QR không hợp lệ");
  }
  return id;
}

async function completeItemByQr(user, qrCode) {
  const orderItemId = parseItemQr(qrCode);
  return updateItemKitchenStatus(user, orderItemId, "READY");
}

// ============ DAT MON TRUOC (pre-order gan phieu dat ban) ============
// Tao don status=SCHEDULED, CHUA gan ban/nhan vien, KHONG dong toi trang thai ban,
// KHONG tru kho (chi tru khi bep nau sau check-in).
async function createScheduledPreorder({ company_id, branch_id, customer_id, reservation_id, guest_count, items }) {
  if (!items || items.length === 0) throw new BadRequest("Đơn đặt trước phải có ít nhất 1 món");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const menuRows = await repo.findMenuItems(client, items.map((i) => i.menu_item_id), branch_id);
    const menuById = new Map(menuRows.map((r) => [r.id, r]));
    const built = buildItems(items, menuById, { requireAvailable: true });

    const order = await repo.insertPreOrder(client, {
      order_code: generateOrderCode(),
      company_id, branch_id, customer_id, reservation_id,
      guest_count,
      subtotal: built.subtotal,
      vat_amount: built.totalVat,
      total_amount: built.subtotal + built.totalVat,
    });
    await repo.bulkInsertOrderItems(client, order.id, built.items);
    await client.query("COMMIT");
    return { ...order, items: built.items };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Kich hoat don dat truoc khi khach check-in (dung client transaction cua caller).
// Gan ban + nhan vien, SCHEDULED -> CONFIRMED. Tra ve order_id (hoac null neu khong co).
async function activatePreorder(client, reservationId, tableId, waiterId) {
  const sched = await repo.findScheduledByReservation(client, reservationId);
  if (!sched) return null;
  const r = await repo.activateScheduledOrder(client, reservationId, tableId, waiterId);
  return r ? r.id : null;
}

// ===== Bep duyet don dat truoc (da gan ban) =====
// Bep xem danh sach don dat truoc da co ban -> Dong y (nau) hoac Huy (hoan coc).
async function listPreorders(user) {
  return repo.findPreordersWithTable(user.company_id, user.branch_id);
}

// Kiem tra don SCHEDULED cua reservation + dung pham vi chi nhanh cua user.
async function loadScheduledInScope(client, user, reservationId) {
  const sched = await repo.findScheduledByReservation(client, reservationId);
  if (!sched) throw new BadRequest("Đơn đặt trước không tồn tại hoặc đã được xử lý");
  assertBranchScope(user, { id: sched.branch_id, company_id: sched.company_id });
  return sched;
}

// "Dong y" -> kich hoat don (SCHEDULED -> CONFIRMED) voi ban da gan, mon xuong bep.
async function confirmPreorder(user, reservationId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sched = await loadScheduledInScope(client, user, reservationId);
    if (!sched.table_id) throw new BadRequest("Phiếu chưa được gán bàn — lễ tân gán bàn trước");
    await activatePreorder(client, reservationId, sched.table_id, user.employee_id || user.id);
    const items = await repo.findOrderItemsWithMenu(client, sched.id);
    const table = await repo.findTableName(client, sched.table_id);
    const resv = await repo.findReservationTime(client, reservationId);
    await client.query("COMMIT");
    return {
      order_id: sched.id,
      table_number: table ? table.table_number : null,
      reservation_time: resv ? resv.reservation_time : null,
      items,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// "Huy" (khach khong den) -> huy phieu + huy don SCHEDULED + hoan coc ve vi.
async function cancelPreorder(user, reservationId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await loadScheduledInScope(client, user, reservationId);
    await repo.cancelScheduledOrder(client, reservationId);
    await client.query(
      "UPDATE reservations SET status = 'CANCELLED', updated_at = NOW() WHERE reservation_id = $1",
      [reservationId]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  await depositService.refundDeposit(reservationId); // hoan coc ve vi + ghi lich su REFUND
  return { ok: true };
}

// Lay chi tiet mon cua don dat truoc theo reservation (cho khach xem lai).
async function getPreorderByReservation(reservationId) {
  const o = await repo.findScheduledByReservation(pool, reservationId);
  if (!o) return null;
  const items = await repo.findOrderItemsWithMenu(pool, o.id);
  return { ...o, items };
}

module.exports = {
  createOrder,
  getOrder,
  addOrderItems,
  getActiveOrderForTable,
  scanMemberQR,
  updateItemKitchenStatus,
  startCookingOrder,
  getKitchenQueue,
  getKitchenHistory,
  completeItemByQr,
  createScheduledPreorder,
  activatePreorder,
  getPreorderByReservation,
  listPreorders,
  confirmPreorder,
  cancelPreorder,
};
