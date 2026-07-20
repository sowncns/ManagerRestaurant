// src/shared/middlewares/auth.middleware.js
const { verifyAccessToken } = require("../utils/jwt");
const { Unauthorized, Forbidden } = require("../errors/AppError");
const pool = require("../../config/db");

function extractToken(req) {
  const url = req.originalUrl;
  const [type, headerToken] = (req.headers.authorization || "").split(" ");
  const bearer = type === "Bearer" ? headerToken : null;
  // Web gui cookie; app native gui Bearer. Uu tien cookie, fallback Bearer.
  if (url.startsWith("/api/customer")) return req.cookies?.customerAccessToken || bearer;
  if (url.startsWith("/api/internal")) return req.cookies?.internalAccessToken || bearer;
  return bearer;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next(new Unauthorized("Thiếu token đăng nhập"));

  req.user = verifyAccessToken(token);

  const url = req.originalUrl;
  if (url.startsWith("/api/internal") && req.user.type !== "staff")
    return next(new Forbidden("Không có quyền truy cập Internal"));
  if (url.startsWith("/api/customer") && req.user.type !== "customer")
    return next(new Forbidden("Không có quyền truy cập Customer"));

  next();
}

// Load 1 lan trang thai tai khoan khach (email_verified + payment_pin) va cache tren req,
// de nhieu middleware (requireVerifiedEmail, requirePaymentPin) tren cung 1 route khong query lap.
async function loadCustomerAuthState(req) {
  if (req._customerAuthState) return req._customerAuthState;
  const r = await pool.query(
    "SELECT email_verified, payment_pin FROM customers WHERE customer_id = $1",
    [req.user.id]
  );
  req._customerAuthState = r.rows[0] || null;
  return req._customerAuthState;
}

// Chan cac thao tac nhay cam (dat ban, nap tien, thanh toan...) neu khach
// CHUA xac thuc email. Chi ap dung cho tai khoan customer; nhan vien bo qua.
// Kiem tra truc tiep DB (nguon chinh xac) de token cu khong bo qua duoc.
async function requireVerifiedEmail(req, res, next) {
  try {
    if (!req.user) return next(new Unauthorized("Thiếu token đăng nhập"));
    if (req.user.type !== "customer") return next(); // chi rang buoc khach hang

    const state = await loadCustomerAuthState(req);
    if (!state) return next(new Unauthorized("Tài khoản không tồn tại"));
    if (state.email_verified !== true) {
      return next(
        new Forbidden("Vui lòng xác thực email trước khi thực hiện thao tác này")
      );
    }
    next();
  } catch (err) {
    next(err);
  }
}

// Chan truy cap VI (xem / nap tien / thanh toan) neu khach CHUA thiet lap ma PIN.
// Chi ap dung cho tai khoan customer.
async function requirePaymentPin(req, res, next) {
  try {
    if (!req.user) return next(new Unauthorized("Thiếu token đăng nhập"));
    if (req.user.type !== "customer") return next();

    const state = await loadCustomerAuthState(req);
    if (!state) return next(new Unauthorized("Tài khoản không tồn tại"));
    if (!state.payment_pin) {
      return next(
        new Forbidden("Vui lòng thiết lập mã PIN thanh toán trước khi sử dụng ví")
      );
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth, requireVerifiedEmail, requirePaymentPin };