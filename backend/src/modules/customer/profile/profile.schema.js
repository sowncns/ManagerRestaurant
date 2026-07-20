// src/modules/customer/profile/profile.schema.js
const { z } = require("zod");

const updateProfileSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập họ tên").optional(),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  dob: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
});

const pinSchema = z.object({
  pin: z.string().length(6, "Mã PIN phải gồm đúng 6 số"),
});

const addPointsSchema = z.object({
  points: z.coerce.number().int().positive("Số điểm phải là số nguyên dương"),
});

module.exports = { updateProfileSchema, pinSchema, addPointsSchema };
