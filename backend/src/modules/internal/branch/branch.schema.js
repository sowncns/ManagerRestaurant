// src/modules/internal/branch/branch.schema.js
const { z } = require("zod");

const BRANCH_STATUSES = ["ACTIVE", "INACTIVE"];
const timeStr = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Giờ không hợp lệ (HH:mm)");

const createBranchSchema = z.object({
  company_id: z.coerce.number().int().positive().optional(), // SUPER_ADMIN mới cần
  name: z.string().trim().min(1, "Vui lòng nhập tên chi nhánh"),
  code: z.string().trim().min(1, "Vui lòng nhập mã chi nhánh"),
  address: z.string().trim().min(1, "Vui lòng nhập địa chỉ"),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Email không hợp lệ").optional(),
  ward: z.string().trim().optional(),
  district: z.string().trim().optional(),
  city: z.string().trim().optional(),
  opening_time: timeStr.optional(),
  closing_time: timeStr.optional(),
  image_url: z.string().trim().optional(),
  status: z.enum(BRANCH_STATUSES).optional(),
});

const updateBranchSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    code: z.string().trim().min(1).optional(),
    address: z.string().trim().min(1).optional(),
    phone: z.string().trim().optional(),
    email: z.string().trim().email("Email không hợp lệ").optional(),
    ward: z.string().trim().optional(),
    district: z.string().trim().optional(),
    city: z.string().trim().optional(),
    opening_time: timeStr.optional(),
    closing_time: timeStr.optional(),
    image_url: z.string().trim().optional(),
    status: z.enum(BRANCH_STATUSES).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Không có dữ liệu cập nhật" });

const changeStatusSchema = z.object({ status: z.enum(BRANCH_STATUSES) });

module.exports = { BRANCH_STATUSES, createBranchSchema, updateBranchSchema, changeStatusSchema };
