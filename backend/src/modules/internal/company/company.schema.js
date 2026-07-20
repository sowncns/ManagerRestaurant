// src/modules/internal/company/company.schema.js
const { z } = require("zod");

const STATUSES = ["ACTIVE", "INACTIVE"];

const createCompanySchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên công ty"),
  description: z.string().trim().optional(),
  logo_url: z.string().trim().url("Logo phải là URL hợp lệ").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Email không hợp lệ").optional().or(z.literal("")),
  status: z.enum(STATUSES).optional(),
});

const updateCompanySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    logo_url: z.string().trim().url("Logo phải là URL hợp lệ").optional().or(z.literal("")),
    phone: z.string().trim().optional(),
    email: z.string().trim().email("Email không hợp lệ").optional().or(z.literal("")),
    status: z.enum(STATUSES).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Không có dữ liệu cập nhật" });

module.exports = { STATUSES, createCompanySchema, updateCompanySchema };
