// src/modules/customer/payment/payment.schema.js
const { z } = require("zod");

const createLinkSchema = z.object({
  amount: z.coerce.number().int().positive("Số tiền nạp phải là số nguyên dương"),
  description: z.string().optional(),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

module.exports = { createLinkSchema };
