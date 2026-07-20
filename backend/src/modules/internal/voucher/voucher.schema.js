// src/modules/internal/voucher/voucher.schema.js
const { z } = require("zod");

const DISCOUNT_TYPES = ["percent", "fixed"];
const STATUSES = ["active", "inactive", "expired"];
const APPLY_SCOPES = ["all_branches", "selected_branches"];

const createVoucherSchema = z
  .object({
    company_id: z.number().int().positive().optional(), // SUPER_ADMIN gui; COMPANY_ADMIN bo qua
    code: z.string().trim().min(1, "Vui lòng nhập mã voucher"),
    name: z.string().trim().min(1, "Vui lòng nhập tên voucher"),
    name_en: z.string().trim().optional(),
    description: z.string().trim().optional(),
    description_en: z.string().trim().optional(),
    discount_type: z.enum(DISCOUNT_TYPES, { message: "discount_type phải là percent hoặc fixed" }),
    discount_value: z.number().positive("discount_value phải lớn hơn 0"),
    min_order_amount: z.number().min(0).default(0),
    max_discount_amount: z.number().min(0).default(0),
    start_date: z.string().datetime({ message: "start_date phải là ISO datetime" }),
    end_date: z.string().datetime({ message: "end_date phải là ISO datetime" }),
    usage_limit: z.number().int().min(0).default(0),
    per_customer_limit: z.number().int().min(1).default(1),
    apply_scope: z.enum(APPLY_SCOPES).default("all_branches"),
    type: z.string().trim().min(1, "Vui lòng nhập loại voucher"),
    status: z.enum(STATUSES).default("active"),
    image_url: z.string().trim().url("URL ảnh không hợp lệ").optional().or(z.literal('')),
    branchIds: z.array(z.number().int().positive()).optional(),
  })
  .refine((d) => new Date(d.end_date) > new Date(d.start_date), {
    message: "end_date phải sau start_date",
    path: ["end_date"],
  });

const updateVoucherSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    name_en: z.string().trim().optional(),
    description: z.string().trim().optional(),
    description_en: z.string().trim().optional(),
    discount_type: z.enum(DISCOUNT_TYPES).optional(),
    discount_value: z.number().positive().optional(),
    min_order_amount: z.number().min(0).optional(),
    max_discount_amount: z.number().min(0).optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    usage_limit: z.number().int().min(0).optional(),
    per_customer_limit: z.number().int().min(1).optional(),
    apply_scope: z.enum(APPLY_SCOPES).optional(),
    type: z.string().trim().min(1).optional(),
    status: z.enum(STATUSES).optional(),
    image_url: z.string().trim().optional(),
    branchIds: z.array(z.number().int().positive()).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Không có dữ liệu cập nhật" })
  .refine((d) => !(d.start_date && d.end_date) || new Date(d.end_date) > new Date(d.start_date), {
    message: "end_date phải sau start_date",
    path: ["end_date"],
  });

const assignSchema = z
  .object({
    customerIds: z.array(z.number().int().positive()).nonempty().optional(),
    rank: z.string().trim().min(1).optional(),
    birthMonth: z.number().int().min(1).max(12).optional(),
    reason: z.string().trim().optional(),
  })
  .refine(
    (d) => (d.customerIds ? 1 : 0) + (d.rank ? 1 : 0) + (d.birthMonth ? 1 : 0) === 1,
    { message: "Cung cấp đúng một trong customerIds, rank hoặc birthMonth" }
  );

module.exports = { createVoucherSchema, updateVoucherSchema, assignSchema, DISCOUNT_TYPES, STATUSES, APPLY_SCOPES };
