// src/modules/internal/cancel/cancel.schema.js
const { z } = require("zod");

const REASONS = ["WRONG_ORDER", "OUT_OF_STOCK", "CUSTOMER_CHANGE", "QUALITY", "OTHER"];

const createRequestSchema = z
  .object({
    reason_code: z.enum(REASONS),
    reason_note: z.string().max(500).optional(),
    requested_qty: z.coerce.number().int().positive().optional(),
  })
  .refine((d) => d.reason_code !== "OTHER" || (d.reason_note && d.reason_note.trim()), {
    message: "Lý do OTHER phải kèm ghi chú",
    path: ["reason_note"],
  });

const rejectSchema = z.object({
  decision_note: z.string().max(500).optional(),
});

module.exports = { createRequestSchema, rejectSchema, REASONS };
