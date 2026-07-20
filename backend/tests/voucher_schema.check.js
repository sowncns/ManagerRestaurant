// Smoke-check thuan (khong DB) cho schema voucher. Chay: node tests/voucher_schema.check.js
const assert = require("assert");
const { createVoucherSchema, assignSchema } = require("../src/modules/internal/voucher/voucher.schema");

const base = {
  code: "SUMMER10", name: "Hè giảm 10%", type: "food",
  discount_type: "percent", discount_value: 10,
  start_date: "2026-08-01T00:00:00Z", end_date: "2026-09-01T00:00:00Z",
};

// Hop le + apply default
const ok = createVoucherSchema.safeParse(base);
assert.strictEqual(ok.success, true);
assert.strictEqual(ok.data.per_customer_limit, 1);
assert.strictEqual(ok.data.apply_scope, "all_branches");
// type bat buoc
assert.strictEqual(createVoucherSchema.safeParse({ ...base, type: undefined }).success, false);
// apply_scope sai -> fail
assert.strictEqual(createVoucherSchema.safeParse({ ...base, apply_scope: "ALL" }).success, false);

// end < start -> fail
assert.strictEqual(
  createVoucherSchema.safeParse({ ...base, end_date: "2026-07-01T00:00:00Z" }).success, false);
// discount_type sai -> fail
assert.strictEqual(createVoucherSchema.safeParse({ ...base, discount_type: "x" }).success, false);
// discount_value = 0 -> fail
assert.strictEqual(createVoucherSchema.safeParse({ ...base, discount_value: 0 }).success, false);

// assign: dung 1 trong customerIds/rank
assert.strictEqual(assignSchema.safeParse({ customerIds: [1, 2] }).success, true);
assert.strictEqual(assignSchema.safeParse({ rank: "gold" }).success, true);
assert.strictEqual(assignSchema.safeParse({ customerIds: [1], rank: "gold" }).success, false);
assert.strictEqual(assignSchema.safeParse({ reason: "x" }).success, false);

console.log("OK voucher_schema.check");
