// src/modules/internal/cashback/cashback.service.js
// SUPER_ADMIN xem/chinh % cashback theo hang. DB luu ti le thap phan (0.03);
// API phoi ra `percent` (3) cho de doc.
const repo = require("./cashback.repository");
const { NotFound } = require("../../../shared/errors/AppError");

const toPercent = (row) => ({
  rank: row.rank,
  percent: Math.round(parseFloat(row.rate) * 10000) / 100, // 0.0325 -> 3.25
  updatedAt: row.updated_at,
});

exports.list = async () => (await repo.getAll()).map(toPercent);

exports.updateRate = async (rank, percent) => {
  const row = await repo.updateRate(rank, percent / 100);
  if (!row) throw new NotFound("Không tìm thấy hạng thành viên này");
  return toPercent(row);
};
