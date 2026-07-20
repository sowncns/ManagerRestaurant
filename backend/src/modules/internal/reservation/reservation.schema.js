// src/modules/internal/reservation/reservation.schema.js
const { z } = require("zod");

const RESERVATION_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"];

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ (YYYY-MM-DD)");
const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Giờ không hợp lệ (HH:mm)");

const orderItemSchema = z.object({
  menu_item_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive("Số lượng phải > 0"),
  note: z.string().trim().optional(),
});

const createReservationSchema = z.object({
  branch_id: z.coerce.number().int().positive().optional(), // COMPANY_ADMIN / SUPER_ADMIN cần
  table_id: z.coerce.number().int().positive().optional(),
  customer_id: z.coerce.number().int().positive().optional(),
  customer_name: z.string().trim().min(1, "Vui lòng nhập tên khách"),
  customer_phone: z.string().trim().min(1, "Vui lòng nhập số điện thoại khách"),
  customer_email: z.string().trim().email("Email không hợp lệ").optional(),
  guest_count: z.coerce.number().int().positive("Số khách phải > 0").optional(),
  reservation_date: dateStr,
  reservation_time: timeStr,
  special_request: z.string().trim().optional(),
  note: z.string().trim().optional(),
  // Đặt món trước (tuỳ chọn) -> đơn SCHEDULED gắn phiếu đặt, bếp duyệt sau check-in.
  order_items: z.array(orderItemSchema).optional().default([]),
});

const updateReservationSchema = z
  .object({
    table_id: z.coerce.number().int().positive().nullable().optional(),
    customer_name: z.string().trim().min(1).optional(),
    customer_phone: z.string().trim().optional(),
    guest_count: z.coerce.number().int().positive().optional(),
    reservation_date: dateStr.optional(),
    reservation_time: timeStr.optional(),
    note: z.string().trim().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Không có dữ liệu cập nhật" });

const changeStatusSchema = z.object({
  status: z.enum(RESERVATION_STATUSES),
});

const checkinSchema = z.object({
  table_id: z.coerce.number().int().positive().optional(),
});

const assignTableSchema = z.object({
  table_id: z.coerce.number().int().positive("Vui lòng chọn bàn"),
});

module.exports = {
  RESERVATION_STATUSES,
  createReservationSchema,
  updateReservationSchema,
  changeStatusSchema,
  checkinSchema,
  assignTableSchema,
};
