// Chay: node tests/rank.check.js  -> im lang la pass, throw la fail.
const assert = require("assert");
const { computeRank } = require("../src/modules/customer/profile/profile.service");

// normal + du diem -> len gold, reset diem ve 0
let r = computeRank({ rank: "normal", points: 725000, rank_expired_at: null }, 30000000);
assert.strictEqual(r.rank, "gold");
assert.strictEqual(r.points, 0);
assert.ok(r.rankExpiredAt);

// normal + vuot nguong platinum -> len thang platinum
r = computeRank({ rank: "normal", points: 0, rank_expired_at: null }, 80000000);
assert.strictEqual(r.rank, "platinum");

// chua du nguong -> giu normal, diem cong don
r = computeRank({ rank: "normal", points: 100, rank_expired_at: null }, 500);
assert.strictEqual(r.rank, "normal");
assert.strictEqual(r.points, 600);

// gold + du platinum -> len platinum
r = computeRank({ rank: "gold", points: 0, rank_expired_at: new Date(Date.now() + 1e10) }, 80000000);
assert.strictEqual(r.rank, "platinum");

// set tuyet doi (pointsToAdd=0): dat 30tr -> gold; dat 725k -> giu normal voi diem giu nguyen
r = computeRank({ rank: "normal", points: 30000000, rank_expired_at: null }, 0);
assert.strictEqual(r.rank, "gold");
r = computeRank({ rank: "normal", points: 725000, rank_expired_at: null }, 0);
assert.strictEqual(r.rank, "normal");
assert.strictEqual(r.points, 725000);

// silver ladder
// normal + 10tr -> silver
r = computeRank({ rank: "normal", points: 10000000, rank_expired_at: null }, 0);
assert.strictEqual(r.rank, "silver");
// normal + 5tr -> van normal (chua du silver)
r = computeRank({ rank: "normal", points: 5000000, rank_expired_at: null }, 0);
assert.strictEqual(r.rank, "normal");
// silver + du gold -> gold (khong ket o silver nua)
r = computeRank({ rank: "silver", points: 30000000, rank_expired_at: new Date(Date.now() + 1e10) }, 0);
assert.strictEqual(r.rank, "gold");
// silver + 72.5tr (case customer 39) -> gold
r = computeRank({ rank: "silver", points: 72500000, rank_expired_at: new Date(Date.now() + 1e10) }, 0);
assert.strictEqual(r.rank, "gold");

console.log("rank.check OK");
