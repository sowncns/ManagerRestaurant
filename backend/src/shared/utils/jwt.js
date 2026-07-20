// src/shared/utils/jwt.js
const jwt = require("jsonwebtoken");
const env = require("../../config/env");
const { Unauthorized } = require("../errors/AppError");

function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES });
}
function signRefreshToken(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES });
}
function verifyAccessToken(token) {
  try { return jwt.verify(token, env.JWT_ACCESS_SECRET); }
  catch { throw new Unauthorized("Token hết hạn hoặc không hợp lệ"); }
}
function verifyRefreshToken(token) {
  try { return jwt.verify(token, env.JWT_REFRESH_SECRET); }
  catch { throw new Unauthorized("Refresh token không hợp lệ"); }
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };