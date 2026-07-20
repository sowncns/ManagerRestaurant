// src/modules/internal/auth/auth.service.js
const bcrypt = require("bcrypt");
const repo = require("./auth.repository");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../../../shared/utils/jwt");
const { BadRequest, Forbidden } = require("../../../shared/errors/AppError");
const { signInInternalAuthUser } = require("../../../shared/utils/supabaseAuth");

function buildPayload(s) {
  return {
    id: s.id,
    type: "staff",
    username: s.username,
    full_name: s.full_name,
    company_id: s.company_id,
    company_name: s.company_name,
    branch_id: s.branch_id,
    role: s.role,
    kitchen_type_id: s.kitchen_type_id ?? null,
    kitchen_type_code: s.kitchen_type_code ?? null,
  };
}

function publicStaff(s) {
  return {
    id: s.id,
    full_name: s.full_name,
    username: s.username,
    company_id: s.company_id,
    branch_id: s.branch_id,
    company_name: s.company_name,
    role: s.role,
    kitchen_type_id: s.kitchen_type_id ?? null,
    kitchen_type_code: s.kitchen_type_code ?? null,
    kitchen_type_name: s.kitchen_type_name ?? null,
    created_at: s.created_at,
  };
}

exports.login = async ({ username, password }) => {
  const staff = await repo.findByUsername(username);
  // Thong bao chung de tranh do username hop le.
  if (!staff) throw new BadRequest("Tên đăng nhập hoặc mật khẩu không đúng");

  const ok = await bcrypt.compare(password, staff.password_hash);
  if (!ok) throw new BadRequest("Tên đăng nhập hoặc mật khẩu không đúng");

  if (staff.status !== "ACTIVE") throw new Forbidden("Tài khoản đã bị khóa");

  // Dang nhap song song Supabase (best-effort) de lay session cho Realtime.
  const supabaseSession = await signInInternalAuthUser({ username, password });

  const payload = buildPayload(staff);
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    staff: publicStaff(staff),
    supabaseSession,
  };
};

exports.refresh = async (refreshToken) => {
  if (!refreshToken) throw new BadRequest("Thiếu refresh token");

  const decoded = verifyRefreshToken(refreshToken);
  if (decoded.type !== "staff") throw new Forbidden("Token sai loại tài khoản");

  const staff = await repo.findById(decoded.id);
  if (!staff) throw new BadRequest("Tài khoản không tồn tại");
  if (staff.status !== "ACTIVE") throw new Forbidden("Tài khoản đã bị khóa");

  const payload = buildPayload(staff);
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    staff: publicStaff(staff),
  };
};
