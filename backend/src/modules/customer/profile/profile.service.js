// src/modules/customer/profile/profile.service.js
const bcrypt = require("bcrypt");
const repo = require("./profile.repository");
const pool = require("../../../config/db");
const { NotFound, BadRequest, Forbidden } = require("../../../shared/errors/AppError");

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const SILVER_THRESHOLD = 10000000;
const GOLD_THRESHOLD = 30000000;
const PLATINUM_THRESHOLD = 80000000;

exports.getProfileByCustomerId = async (customerId) => {
  const profile = await repo.getProfile(customerId);
  if (!profile) throw new NotFound("Không tìm thấy khách hàng");
  // Chua thiet lap PIN -> an so du vi (chi lo sau khi da co PIN thanh toan).
  if (!profile.has_payment_pin) profile.wallet_balance = null;
  return profile;
};

exports.updateProfileByCustomerId = async (customerId, data) => {
  const { name, email, phone, gender } = data;
  let { dob } = data;
  if (!dob || dob.trim() === "") dob = null; // tranh loi kieu DATE khi chuoi rong
  const updated = await repo.updateProfile(customerId, { name, email, phone, dob, gender });
  if (!updated) throw new NotFound("Không tìm thấy khách hàng");
  return updated;
};

exports.updateAddressByCustomerId = async (customerId, address) => {
  const updated = await repo.updateAddress(customerId, address);
  if (!updated) throw new NotFound("Không tìm thấy khách hàng");
  return updated;
};

exports.getTransactionHistory = (customerId) => repo.getTransactionHistory(customerId);

// Ham thuan: tinh diem/hang moi (khong dung DB) -> de doc, de test
function computeRank(customer, pointsToAdd) {
  let rank = customer.rank || "normal";
  let points = parseInt(customer.points, 10) || 0;
  let rankExpiredAt = customer.rank_expired_at;

  // Het han chu ky -> duy tri hoac rot hang, reset diem
  if (rankExpiredAt && new Date() > new Date(rankExpiredAt)) {
    if (rank === "platinum") {
      rank = points >= PLATINUM_THRESHOLD ? "platinum" : points >= GOLD_THRESHOLD ? "gold" : points >= SILVER_THRESHOLD ? "silver" : "normal";
    } else if (rank === "gold") {
      rank = points >= GOLD_THRESHOLD ? "gold" : points >= SILVER_THRESHOLD ? "silver" : "normal";
    } else if (rank === "silver") {
      rank = points >= SILVER_THRESHOLD ? "silver" : "normal";
    }
    points = 0;
    rankExpiredAt = rank === "normal" ? null : new Date(Date.now() + YEAR_MS);
  }

  points += pointsToAdd;

  // Thang hang (ladder: normal -> silver -> gold -> platinum, reset diem khi len hang)
  const promote = (newRank) => { rank = newRank; points = 0; rankExpiredAt = new Date(Date.now() + YEAR_MS); };
  if (rank === "normal") {
    if (points >= PLATINUM_THRESHOLD) promote("platinum");
    else if (points >= GOLD_THRESHOLD) promote("gold");
    else if (points >= SILVER_THRESHOLD) promote("silver");
  } else if (rank === "silver") {
    if (points >= PLATINUM_THRESHOLD) promote("platinum");
    else if (points >= GOLD_THRESHOLD) promote("gold");
  } else if (rank === "gold") {
    if (points >= PLATINUM_THRESHOLD) promote("platinum");
  }

  return { points, rank, rankExpiredAt };
}
exports.computeRank = computeRank;

exports.addPointsAndProcessRank = async (customerId, pointsToAdd) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const customer = await repo.lockCustomer(client, customerId);
    if (!customer) throw new NotFound("Không tìm thấy khách hàng");

    const { points, rank, rankExpiredAt } = computeRank(customer, pointsToAdd);
    const updated = await repo.updateRankPoints(client, customerId, points, rank, rankExpiredAt);

    await client.query("COMMIT");
    return updated;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// Set diem TUYET DOI (dung cho admin chinh/test) roi tinh lai hang. Tai dung computeRank
// bang cach ghi de points hien tai va cong them 0.
exports.setPointsAndProcessRank = async (customerId, absolutePoints) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const customer = await repo.lockCustomer(client, customerId);
    if (!customer) throw new NotFound("Không tìm thấy khách hàng");

    const { points, rank, rankExpiredAt } = computeRank({ ...customer, points: absolutePoints }, 0);
    const updated = await repo.updateRankPoints(client, customerId, points, rank, rankExpiredAt);

    await client.query("COMMIT");
    return updated;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

exports.setupPaymentPin = async (customerId, pin) => {
  if (!pin || pin.length !== 6) throw new BadRequest("Mã PIN phải bao gồm 6 số");
  const hashedPin = await bcrypt.hash(pin, 10);
  await repo.setPin(customerId, hashedPin);
};

exports.verifyPaymentPin = async (customerId, pin) => {
  if (!pin) throw new BadRequest("Vui lòng nhập mã PIN");

  const c = await repo.getPinInfo(customerId);
  if (!c) throw new NotFound("Không tìm thấy khách hàng");
  if (!c.payment_pin) throw new BadRequest("Chưa thiết lập mã PIN");

  if (c.pin_locked_until && new Date() < new Date(c.pin_locked_until)) {
    throw new Forbidden("Chức năng bị khóa do nhập sai quá 5 lần. Vui lòng thử lại sau 1 giờ.");
  }

  const isValid = await bcrypt.compare(pin, c.payment_pin);
  if (isValid) {
    await repo.resetPinAttempts(customerId);
    return true;
  }

  const attempts = (c.pin_failed_attempts || 0) + 1;
  const lockedUntil = attempts >= 5 ? new Date(Date.now() + 60 * 60 * 1000) : null;
  await repo.setPinAttempts(customerId, attempts, lockedUntil);

  if (attempts >= 5) {
    throw new Forbidden("Bạn đã nhập sai 5 lần. Tính năng thanh toán bị khóa trong 1 giờ.");
  }
  throw new BadRequest(`Mã PIN sai. Bạn còn ${5 - attempts} lần thử.`);
};
