// src/modules/internal/menu/menu.schema.js
const { z } = require("zod");

// ---------------- Categories ----------------
const createCategorySchema = z.object({
  company_id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1, "Thiếu tên danh mục"),
  category_type: z.string().trim().min(1, "Thiếu loại danh mục (vd: food, drink)"),
  description: z.string().trim().optional(),
});

const updateCategorySchema = z.object({
    company_id: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(1).optional(),
    category_type: z.string().trim().optional(),
    description: z.string().trim().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Không có dữ liệu cập nhật" });

// ---------------- Items ----------------
const createItemSchema = z.object({
  company_id: z.coerce.number().int().positive().optional(),
  category_id: z.coerce.number().int().positive("category_id không hợp lệ"),
  kitchen_type_id: z.coerce.number().int().positive("kitchen_type_id không hợp lệ"),
  name: z.string().trim().min(1, "Thiếu tên món"),
  description: z.string().trim().optional(),
  image_url: z.string().trim().optional(),
  price: z.coerce.number().min(0, "Giá không hợp lệ"),
  vat: z.coerce.number().min(0).optional(),
  is_available: z.coerce.boolean().optional(),
});

const updateItemSchema = z.object({
    company_id: z.coerce.number().int().positive().optional(),
    category_id: z.coerce.number().int().positive().optional(),
    kitchen_type_id: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    image_url: z.string().trim().optional(),
    price: z.coerce.number().min(0).optional(),
    vat: z.coerce.number().min(0).optional(),
    is_available: z.coerce.boolean().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Không có dữ liệu cập nhật" });

const availabilitySchema = z.object({
  company_id: z.coerce.number().int().positive().optional(),
  is_available: z.coerce.boolean(),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  createItemSchema,
  updateItemSchema,
  availabilitySchema,
};
