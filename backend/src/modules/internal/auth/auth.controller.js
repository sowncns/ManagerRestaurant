// src/modules/internal/auth/auth.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const service = require("./auth.service");
const env = require("../../../config/env");
const audit = require("../../../shared/services/audit.service");

const isProd = env.NODE_ENV === "production";
const cookieOpts = {
  httpOnly: true,
  secure: isProd, // Phải luôn true để dùng SameSite="none", nhưng khi test local trên đt qua HTTP thì cần false
  sameSite: isProd ? "none" : "lax", // Bắt buộc none cho cross-origin (Netlify -> Backend) trên prod
};
const ACCESS_MAXAGE = 24 * 60 * 60 * 1000; // 1 ngay
const REFRESH_MAXAGE = 7 * 24 * 60 * 60 * 1000; // 7 ngay

function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie("internalAccessToken", accessToken, { ...cookieOpts, maxAge: ACCESS_MAXAGE });
  res.cookie("internalRefreshToken", refreshToken, { ...cookieOpts, maxAge: REFRESH_MAXAGE });
}

exports.login = asyncHandler(async (req, res) => {
  const result = await service.login(req.body);
  setAuthCookies(res, result);
  audit.record(
    { user: result.staff, ip: req.ip },
    { action: "LOGIN", entityType: "STAFF", entityId: result.staff?.id, description: "Đăng nhập nội bộ" }
  );
  res.json({ message: "Đăng nhập thành công", staff: result.staff, supabaseSession: result.supabaseSession });
});

exports.refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.internalRefreshToken;
  const result = await service.refresh(token);
  setAuthCookies(res, result);
  res.json({ message: "Làm mới token thành công", staff: result.staff });
});

exports.logout = asyncHandler(async (req, res) => {
  res.clearCookie("internalAccessToken");
  res.clearCookie("internalRefreshToken");
  res.json({ message: "Đăng xuất thành công" });
});
