// src/modules/customer/reservation/reservation.service.js
// Khach dat ban (+ tuy chon dat mon truoc). Phieu tao o trang thai PENDING,
// CHUA gan ban (le tan/quan ly xac nhan & gan ban). Neu co mon -> tao don SCHEDULED.
const repo = require("./reservation.repository");
const orderService = require("../../internal/order/order.service");
const depositService = require("../../../shared/services/deposit.service");
const { NotFound, BadRequest } = require("../../../shared/errors/AppError");

function genCode() {
  const d = new Date();
  const dp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return "RS" + dp + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// "HH:mm" hoac "HH:mm:ss" -> so phut trong ngay
function toMinutes(t) {
  const [h, m] = String(t).split(":");
  return Number(h) * 60 + Number(m);
}

// Chi cat "HH:mm" de hien thi trong thong bao loi
function hhmm(t) {
  return String(t).slice(0, 5);
}

// Kiem tra gio dat ban nam trong khung mo cua chi nhanh (ho tro mo qua nua dem).
// Bo qua neu chi nhanh khong cau hinh gio.
function assertWithinOpenHours(branch, reservationTime) {
  const { opening_time, closing_time } = branch;
  if (!opening_time || !closing_time) return;

  const t = toMinutes(reservationTime);
  const open = toMinutes(opening_time);
  const close = toMinutes(closing_time);

  const ok = open <= close ? t >= open && t <= close : t >= open || t <= close;
  if (!ok) {
    throw new BadRequest(
      `Chi nhánh chỉ nhận khách từ ${hhmm(opening_time)} đến ${hhmm(closing_time)}.`
    );
  }
}

exports.create = async (customerId, data) => {
  const branch = await repo.findBranch(data.branch_id);
  if (!branch) throw new BadRequest("Chi nhánh không tồn tại hoặc ngừng hoạt động");

  assertWithinOpenHours(branch, data.reservation_time);

  const contact = await repo.getContact(customerId);
  if (!contact) throw new NotFound("Không tìm thấy khách hàng");
  const phone = data.customer_phone || contact.phone;
  if (!phone) throw new BadRequest("Vui lòng cung cấp số điện thoại liên hệ");

  const id = await repo.create({
    reservation_code: genCode(),
    company_id: branch.company_id,
    branch_id: branch.id,
    customer_id: customerId,
    customer_name: contact.full_name,
    customer_phone: phone,
    customer_email: contact.email,
    guest_count: data.guest_count,
    reservation_date: data.reservation_date,
    reservation_time: data.reservation_time,
    note: data.note,
  });

  // Dat mon truoc (neu co) -> don SCHEDULED gan reservation, KHONG gan ban.
  // Sau do tru coc tu vi khach. Neu tru coc that bai -> don dep sach, khong de lai rac.
  if (data.items && data.items.length) {
    let preorder;
    try {
      preorder = await orderService.createScheduledPreorder({
        company_id: branch.company_id,
        branch_id: branch.id,
        customer_id: customerId,
        reservation_id: id,
        guest_count: data.guest_count,
        items: data.items,
      });

      const deposit = depositService.computeDeposit(preorder.total_amount);
      if (deposit > 0) {
        await depositService.chargeDeposit({
          customerId,
          reservationId: id,
          orderId: preorder.id,
          amount: deposit,
          pin: data.pin,
        });
      }
    } catch (err) {
      await repo.cleanupReservation(id); // huy phieu + don khi coc that bai / sai PIN / thieu so du
      throw err;
    }
  }
  return exports.get(customerId, id);
};

// Khach vang lai (chua dang nhap): chi dat ban, khong gan customer, khong dat mon/coc.
exports.createGuest = async (data) => {
  if (data.items && data.items.length) {
    throw new BadRequest("Vui lòng đăng nhập để đặt món trước");
  }

  const branch = await repo.findBranch(data.branch_id);
  if (!branch) throw new BadRequest("Chi nhánh không tồn tại hoặc ngừng hoạt động");

  assertWithinOpenHours(branch, data.reservation_time);

  const id = await repo.create({
    reservation_code: genCode(),
    company_id: branch.company_id,
    branch_id: branch.id,
    customer_id: null,
    customer_name: data.customer_name,
    customer_phone: data.customer_phone,
    customer_email: data.customer_email || null,
    guest_count: data.guest_count,
    reservation_date: data.reservation_date,
    reservation_time: data.reservation_time,
    note: data.note,
  });

  return repo.findById(id);
};

exports.list = async (customerId) => {
  const reservations = await repo.listByCustomer(customerId);
  // Attach preorder items
  for (const res of reservations) {
    const preorder = await orderService.getPreorderByReservation(res.id);
    res.preorder = preorder ? preorder.items : [];
  }
  return reservations;
};

exports.get = async (customerId, id) => {
  const reservation = await repo.findByIdForCustomer(id, customerId);
  if (!reservation) throw new NotFound("Không tìm thấy phiếu đặt bàn");
  const preorder = await orderService.getPreorderByReservation(id);
  reservation.preorder = preorder ? preorder.items : [];
  return reservation;
};

exports.cancel = async (customerId, id) => {
  const reservation = await repo.findByIdForCustomer(id, customerId);
  if (!reservation) throw new NotFound("Không tìm thấy phiếu đặt bàn");
  if (["CHECKED_IN", "COMPLETED"].includes(reservation.status)) {
    throw new BadRequest("Phiếu đã được sử dụng, không thể hủy");
  }
  if (reservation.status === "CANCELLED") return reservation;
  await repo.cancel(id, customerId);
  await depositService.refundDeposit(id); // hoan coc ve vi (neu dang giu coc)
  return repo.findByIdForCustomer(id, customerId);
};
