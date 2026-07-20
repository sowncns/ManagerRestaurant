// src/modules/internal/order/order.schema.js
const { z } = require("zod");

const orderItemSchema = z.object({
  menu_item_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive("Số lượng phải > 0"),
  note: z.string().optional(),
});

const createOrderSchema = z.object({
  table_id: z.coerce.number().int().positive("Thiếu bàn"),
  guest_count: z.coerce.number().int().positive().optional(),
  note: z.string().optional(),
  order_items: z.array(orderItemSchema).optional().default([]),
});

const addItemsSchema = z.object({
  items: z.array(orderItemSchema).min(1, "Phải có ít nhất 1 món"),
});

const scanQrSchema = z.object({
  qrCode: z.string().min(1, "QR code is required"),
});

// Quet QR phieu mon (bep bao nau xong).
const scanItemQrSchema = z.object({
  qrCode: z.string().trim().min(1, "Thiếu mã QR"),
});

module.exports = { createOrderSchema, addItemsSchema, scanQrSchema, scanItemQrSchema };
