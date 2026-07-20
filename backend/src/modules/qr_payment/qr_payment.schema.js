// src/modules/qr_payment/qr_payment.schema.js
const { z } = require("zod");

// Nhan vien gui yeu cau thanh toan
const requestSchema = z.object({
  customerId: z.union([z.string(), z.number()]),
  amount: z.coerce.number().positive("Số tiền phải > 0"),
  tableId: z.coerce.number().int().positive("Thiếu bàn"),
  invoiceId: z.coerce.number().int().positive().optional().nullable(),
});

// Khach xac nhan
const confirmSchema = z.object({
  requestId: z.string().min(1, "Thiếu requestId"),
  action: z.enum(["ACCEPT", "REJECT"], {
    errorMap: () => ({ message: "action phải là ACCEPT hoặc REJECT" }),
  }),
  pin: z.string().optional(),
});

const cancelSchema = z.object({
  requestId: z.string().min(1, "Thiếu requestId"),
});

// Khach sinh QR token de nhan vien quet
const scanTokenSchema = z
  .object({
    kind: z.enum(["voucher", "member"], {
      errorMap: () => ({ message: "kind phải là voucher hoặc member" }),
    }),
    customerVoucherId: z.coerce.number().int().positive().optional(),
  })
  .refine((d) => d.kind !== "voucher" || d.customerVoucherId, {
    message: "Thiếu customerVoucherId cho mã voucher",
    path: ["customerVoucherId"],
  });

module.exports = { requestSchema, confirmSchema, cancelSchema, scanTokenSchema };
