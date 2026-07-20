// src/modules/internal/cashback/cashback.schema.js
const { z } = require("zod");

const updateRateSchema = z.object({
  percent: z
    .number({ invalid_type_error: "percent phải là số" })
    .min(0, "percent không được âm")
    .max(100, "percent tối đa là 100"),
});

module.exports = { updateRateSchema };
