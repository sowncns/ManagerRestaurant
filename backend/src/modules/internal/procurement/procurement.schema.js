// src/modules/internal/procurement/procurement.schema.js
const { z } = require("zod");

// ---------- Nha cung cap ----------
const createSupplierSchema = z.object({
  supplier_code: z.string().trim().min(1, "Thiếu mã nhà cung cấp"),
  supplier_name: z.string().trim().min(1, "Thiếu tên nhà cung cấp"),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Email không hợp lệ").optional(),
  address: z.string().trim().optional(),
  tax_code: z.string().trim().optional(),
  contact_name: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

const updateSupplierSchema = z
  .object({
    supplier_code: z.string().trim().min(1).optional(),
    supplier_name: z.string().trim().min(1).optional(),
    phone: z.string().trim().optional(),
    email: z.string().trim().email("Email không hợp lệ").optional(),
    address: z.string().trim().optional(),
    tax_code: z.string().trim().optional(),
    contact_name: z.string().trim().optional(),
    note: z.string().trim().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Không có dữ liệu cập nhật" });

// ---------- Phieu nhap kho ----------
const receiptLineSchema = z.object({
  ingredient_id: z.coerce.number().int().positive("Thiếu nguyên liệu"),
  quantity: z.coerce.number().positive("Số lượng phải > 0"),
  unit_price: z.coerce.number().min(0).optional(),
  note: z.string().trim().optional(),
});

const createReceiptSchema = z.object({
  supplier_id: z.coerce.number().int().positive("Thiếu nhà cung cấp"),
  branch_id: z.coerce.number().int().positive().optional(),
  receipt_code: z.string().trim().min(1).optional(),
  receipt_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ (YYYY-MM-DD)").optional(),
  note: z.string().trim().optional(),
  items: z.array(receiptLineSchema).min(1, "Phiếu nhập phải có ít nhất 1 dòng"),
});

module.exports = {
  createSupplierSchema,
  updateSupplierSchema,
  createReceiptSchema,
};
