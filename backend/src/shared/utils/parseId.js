
const { BadRequest } = require("../errors/AppError");

function parseId(v, label = "id") {
  const id = Number(v);
  if (!Number.isInteger(id) || id <= 0) throw new BadRequest(`${label} không hợp lệ`);
  return id;
}

module.exports = { parseId };
