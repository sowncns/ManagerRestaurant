// src/shared/utils/parseId.js
// Ep chuoi id tu params/query ve so nguyen duong; nem BadRequest neu khong hop le.
const { BadRequest } = require("../errors/AppError");

function parseId(v, label = "id") {
  const id = Number(v);
  if (!Number.isInteger(id) || id <= 0) throw new BadRequest(`${label} không hợp lệ`);
  return id;
}

module.exports = { parseId };
