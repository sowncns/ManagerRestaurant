// src/modules/customer/reservation/reservation.schema.js
const { z } = require("zod");

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ (YYYY-MM-DD)");
const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Giờ không hợp lệ (HH:mm)");

const preorderItemSchema = z.object({
  menu_item_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive("Số lượng phải > 0"),
  note: z.string().trim().optional(),
});

const createReservationSchema = z.object({
  branch_id: z.coerce.number().int().positive("Vui lòng chọn chi nhánh"),
  reservation_date: dateStr,
  reservation_time: timeStr,
  guest_count: z.coerce.number().int().positive("Số khách phải > 0"),
  customer_phone: z.string().trim().min(1).optional(), // lấy từ hồ sơ nếu không nhập
  note: z.string().trim().optional(),
  items: z.array(preorderItemSchema).optional(), // đặt món trước (tùy chọn)
  pin: z.string().optional(), // mã PIN thanh toán, bắt buộc khi đặt món có cọc
});

// Khach vang lai (chua dang nhap): chi cho dat ban, KHONG cho dat mon truoc.
// Ten & SDT bat buoc vi khong co ho so tai khoan de tu dong dien.
const createGuestReservationSchema = z
  .object({
    branch_id: z.coerce.number().int().positive("Vui lòng chọn chi nhánh"),
    reservation_date: dateStr,
    reservation_time: timeStr,
    guest_count: z.coerce.number().int().positive("Số khách phải > 0"),
    customer_name: z.string().trim().min(1, "Vui lòng nhập tên khách hàng"),
    customer_phone: z.string().trim().min(1, "Vui lòng nhập số điện thoại"),
    customer_email: z.string().trim().email("Email không hợp lệ").optional().or(z.literal("")),
    note: z.string().trim().optional(),
    // Giu lai de PHAT HIEN va tu choi, thay vi de zod am tham loai bo.
    items: z.array(z.any()).optional(),
    pin: z.any().optional(),
  })
  .superRefine((d, ctx) => {
    if ((d.items && d.items.length) || d.pin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng đăng nhập để đặt món trước",
        path: ["items"],
      });
    }
  });

module.exports = { createReservationSchema, createGuestReservationSchema };
