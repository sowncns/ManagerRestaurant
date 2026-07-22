
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const service = require("./auth.service");
const env = require("../../../config/env");

const isProd = env.NODE_ENV === "production";
const cookieOpts = {
  httpOnly: true,
  secure: isProd, // Phải luôn true để dùng SameSite="none", nhưng khi test local trên đt qua HTTP thì cần false
  sameSite: isProd ? "none" : "lax", // Bắt buộc none cho cross-origin (Netlify -> Backend) trên prod
};
const ACCESS_MAXAGE = 24 * 60 * 60 * 1000; 
const REFRESH_MAXAGE =  7 * 24 * 60 * 60 * 1000; // 7 ngay

function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie("customerAccessToken", accessToken, { ...cookieOpts, maxAge: ACCESS_MAXAGE });
  res.cookie("customerRefreshToken", refreshToken, { ...cookieOpts, maxAge: REFRESH_MAXAGE });
}

exports.register = asyncHandler(async (req, res) => {
  const customer = await service.register(req.body);
  res.status(201).json({
    message: "Đăng ký thành công.",
    customer,
  });
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  // Nhan token qua body (POST) hoac query (GET tu link).
  const token = req.body?.token || req.query?.token;
  const result = await service.verifyEmail(token);
  res.json(result);
});

exports.resendVerification = asyncHandler(async (req, res) => {
  const result = await service.resendVerification(req.body.email);
  res.json(result);
});

// Khach da dang nhap bam "Xac thuc email" o trang Profile.
exports.requestVerification = asyncHandler(async (req, res) => {
  const result = await service.requestVerification(req.user.id);
  res.json(result);
});

exports.login = asyncHandler(async (req, res) => {
  const result = await service.login(req.body);
  setAuthCookies(res, result);
  // Web dung cookie; app native doc token tu body (khong quan ly cookie duoc).
  res.json({
    message: "Đăng nhập thành công",
    customer: result.customer,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    supabaseSession: result.supabaseSession,
  });
});

exports.refresh = asyncHandler(async (req, res) => {
  // Web: refresh token o cookie. App native: gui qua body hoac header Authorization.
  const bearer = (req.headers.authorization || "").split(" ")[1];
  const token = req.cookies?.customerRefreshToken || req.body?.refreshToken || bearer;
  const result = await service.refresh(token);
  setAuthCookies(res, result);
  res.json({
    message: "Làm mới token thành công",
    customer: result.customer,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

exports.logout = asyncHandler(async (req, res) => {
  res.clearCookie("customerAccessToken");
  res.clearCookie("customerRefreshToken");
  res.json({ message: "Đăng xuất thành công" });
});

exports.changePassword = asyncHandler(async (req, res) => {
  await service.changePassword(req.user.id, req.body.oldPassword, req.body.newPassword);
  res.json({ message: "Đổi mật khẩu thành công" });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const result = await service.forgotPassword(req.body.email);
  res.json(result);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const result = await service.resetPassword(req.body.token, req.body.newPassword);
  res.json(result);
});

exports.testMail = asyncHandler(async (req, res) => {
  const { sendMail } = require("../../../shared/utils/mail");
  const env = require("../../../config/env");
  try {
    const info = await sendMail(
      env.MAIL_USER,
      "Test Email Server",
      "<h1>Hệ thống cấu hình Mail hoạt động bình thường!</h1>"
    );
    res.json({ success: true, info });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});
