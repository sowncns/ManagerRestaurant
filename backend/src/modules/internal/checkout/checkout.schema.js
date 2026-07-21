// src/modules/internal/checkout/checkout.schema.js
const { z } = require("zod");

const createInvoiceSchema = z.object({
  tableId: z.coerce.number().int().positive("Thiếu tableId"),
  paymentMethod: z.enum(["CASH", "TRANSFER", "APP"], {
    errorMap: () => ({ message: "paymentMethod phải là CASH, TRANSFER hoặc APP" }),
  }),
  customerId: z.coerce.number().int().positive().optional(),
});

const validateVoucherSchema = z.object({
  code: z.string().min(1, "Thiếu mã voucher"),
  orderTotal: z.coerce.number().nonnegative("Thiếu tổng tiền"),
  tableId: z.coerce.number().int().positive().optional(),
  customerRef: z.string().trim().optional(), // SDT/ID khach khi nhap tay (khong quet duoc)
});

const scanSchema = z.object({
  tableId: z.coerce.number().int().positive("Thiếu tableId"),
  token: z.string().min(1, "Thiếu token QR"),
});

const voidItemSchema = z.object({
  reason_code: z.enum(["WRONG_ORDER", "OUT_OF_STOCK", "CUSTOMER_CHANGE", "QUALITY", "OTHER"]),
  note: z.string().max(500).optional(),
});

const discountItemSchema = z.object({
  discount_percent: z.coerce.number().min(0, "Giảm giá 0-100%").max(100, "Giảm giá 0-100%"),
  note: z.string().max(500).optional(),
});

const reduceQuantitySchema = z.object({
  quantity: z.coerce.number().int().positive("Số lượng phải ≥ 1"),
  note: z.string().max(500).optional(),
});

module.exports = { createInvoiceSchema, validateVoucherSchema, scanSchema, voidItemSchema, discountItemSchema, reduceQuantitySchema };
