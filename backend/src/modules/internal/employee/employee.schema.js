// src/modules/internal/employee/employee.schema.js
const { z } = require("zod");

const EMPLOYEE_STATUSES = ["ACTIVE", "INACTIVE", "LOCKED"];

const createEmployeeSchema = z.object({
  full_name: z.string().trim().min(1, "Vui lòng nhập họ tên"),
  username: z.string().trim().min(3, "Tên đăng nhập tối thiểu 3 ký tự"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  phone: z.string().trim().optional(),
  role_id: z.coerce.number().int().positive("Thiếu vai trò"),
  company_id: z.coerce.number().int().positive().optional(),
  branch_id: z.coerce.number().int().positive().optional(),
  kitchen_type_id: z.coerce.number().int().positive().optional(),
  status: z.enum(EMPLOYEE_STATUSES).optional(),
});

const updateEmployeeSchema = z
  .object({
    full_name: z.string().trim().min(1).optional(),
    phone: z.string().trim().optional(),
    role_id: z.coerce.number().int().positive().optional(),
    branch_id: z.coerce.number().int().positive().nullable().optional(),
    kitchen_type_id: z.coerce.number().int().positive().nullable().optional(),
    status: z.enum(EMPLOYEE_STATUSES).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Không có dữ liệu cập nhật" });

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

const changeStatusSchema = z.object({
  status: z.enum(EMPLOYEE_STATUSES),
});

module.exports = {
  EMPLOYEE_STATUSES,
  createEmployeeSchema,
  updateEmployeeSchema,
  resetPasswordSchema,
  changeStatusSchema,
};
