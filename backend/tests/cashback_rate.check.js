// Smoke-check thuan (khong DB): validate schema % cashback cua SUPER_ADMIN.
// Chay: node tests/cashback_rate.check.js
const assert = require("assert");
const { updateRateSchema } = require("../src/modules/internal/cashback/cashback.schema");

// Hop le: 0..100
assert.strictEqual(updateRateSchema.safeParse({ percent: 3 }).success, true);
assert.strictEqual(updateRateSchema.safeParse({ percent: 0 }).success, true);
assert.strictEqual(updateRateSchema.safeParse({ percent: 100 }).success, true);

// Chan: am, > 100, sai kieu, thieu field
assert.strictEqual(updateRateSchema.safeParse({ percent: -1 }).success, false);
assert.strictEqual(updateRateSchema.safeParse({ percent: 101 }).success, false);
assert.strictEqual(updateRateSchema.safeParse({ percent: "3" }).success, false);
assert.strictEqual(updateRateSchema.safeParse({}).success, false);

console.log("OK cashback_rate.check");
