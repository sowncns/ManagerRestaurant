// src/modules/internal/combo/combo.schema.js
const { z } = require("zod");

const comboLineSchema = z.object({
  menu_item_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive("Số lượng phải > 0").optional(),
});

const createComboSchema = z.object({
  name: z.string().trim().min(1, "Thiếu tên combo"),
  description: z.string().trim().optional(),
  price: z.coerce.number().min(0, "Giá không hợp lệ"),
  items: z.array(comboLineSchema).min(1, "Combo phải có ít nhất 1 món"),
});

const updateComboSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    price: z.coerce.number().min(0).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    items: z.array(comboLineSchema).min(1).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Không có dữ liệu cập nhật" });

module.exports = { createComboSchema, updateComboSchema };
