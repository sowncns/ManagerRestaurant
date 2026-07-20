// src/modules/customer/auth/auth.service.js
// Logic nghiep vu thuan: hash, so khop, phat token. Goi repository de doc/ghi DB.
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const repo = require("./auth.repository");
const pool = require("../../../config/db");
const { sendMail } = require("../../../shared/utils/mail");
const logger = require("../../../shared/utils/logger");
const env = require("../../../config/env");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../../../shared/utils/jwt");
const { BadRequest, Forbidden } = require("../../../shared/errors/AppError");
const {
  createCustomerAuthUser,
  updateCustomerAuthPassword,
  signInCustomerAuthUser,
} = require("../../../shared/utils/supabaseAuth");

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 phut
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 gio

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Tao token xac thuc email + gui mail (best-effort, khong chan luong dang ky).
async function sendVerificationEmail(customerId, email) {
  if (!email) return;
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);
  await repo.createVerificationToken(customerId, tokenHash, expiresAt);

  const verifyLink = `${env.FRONTEND_URL}/verify-email?token=${rawToken}`;
  try {
    sendMail(
      email,
      "Xác thực địa chỉ email",
      `<h2>Chào mừng bạn!</h2>
       <p>Nhấn vào liên kết bên dưới để xác thực email (hết hạn sau 24 giờ):</p>
       <p><a href="${verifyLink}">${verifyLink}</a></p>
       <p>Nếu bạn không đăng ký tài khoản, vui lòng bỏ qua email này.</p>`
    ).catch(err => {
      logger.warn({ err }, "Gửi mail xác thực email thất bại");
    });
  } catch (err) {
    logger.warn({ err }, "Gửi mail xác thực email thất bại");
  }
}

function buildPayload(c) {
  return { id: c.id, type: "customer", full_name: c.full_name };
}

function publicCustomer(c) {
  return {
    id: c.id,
    full_name: c.full_name,
    rank: c.rank,
    points: c.points,
    email_verified: c.email_verified,
  };
}

exports.register = async (data) => {
  if (await repo.existsEmail(data.email)) {
    throw new BadRequest("Email đã được sử dụng");
  }
  const password = await bcrypt.hash(data.password, 10);
  const customer = await repo.create({ ...data, password });

  // Tao song song Supabase Auth user (best-effort, email THAT). email_confirm: true.
  await createCustomerAuthUser({
    email: data.email,
    password: data.password,
    metadata: { customer_id: customer.id },
  });

  // Khong gui mail xac thuc ngay khi dang ky. Nguoi dung tu bam "Xac thuc email"
  // o trang Profile (goi requestVerification) khi muon xac thuc.
  return { ...customer, email_verified: false };
};

// Gui mail xac thuc cho khach dang dang nhap (bam nut o trang Profile).
exports.requestVerification = async (customerId) => {
  const customer = await repo.findEmailStatusById(customerId);
  if (!customer || !customer.email) throw new BadRequest("Tài khoản chưa có email");
  if (customer.email_verified) return { message: "Email đã được xác thực" };
  await sendVerificationEmail(customer.id, customer.email);
  return { message: "Đã gửi email xác thực. Vui lòng kiểm tra hộp thư." };
};

// Xac thuc email tu link (token dung 1 lan, co han).
exports.verifyEmail = async (token) => {
  const tokenHash = hashToken(token);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const t = await repo.findVerificationTokenForUpdate(client, tokenHash);
    if (!t) throw new BadRequest("Token không hợp lệ");
    if (t.used_at) throw new BadRequest("Token đã được sử dụng");
    if (new Date(t.expires_at) < new Date()) throw new BadRequest("Token đã hết hạn");

    await repo.markCustomerVerified(client, t.customer_id);
    await repo.markVerificationUsed(client, t.id);

    await client.query("COMMIT");
    return { message: "Xác thực email thành công" };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// Gui lai mail xac thuc. Luon tra ve ok de tranh do email (khong lo thong tin).
exports.resendVerification = async (email) => {
  const customer = await repo.findForVerify(email);
  if (customer && customer.email && !customer.email_verified) {
    await sendVerificationEmail(customer.id, customer.email);
  }
  return { message: "ok" };
};

exports.login = async ({ email, password }) => {
  const customer = await repo.findByEmail(email);
  // Thong bao chung (khong phan biet sai user hay sai mat khau) de tranh do tai khoan.
  if (!customer) throw new BadRequest("Email hoặc mật khẩu không đúng");

  const ok = await bcrypt.compare(password, customer.password);
  if (!ok) throw new BadRequest("Email hoặc mật khẩu không đúng");

  if (customer.status && customer.status !== "active") {
    throw new Forbidden("Tài khoản đã bị khóa");
  }

  // Dang nhap song song Supabase (best-effort) de lay session cho Realtime.
  const supabaseSession = await signInCustomerAuthUser({ email: customer.email, password });

  const payload = buildPayload(customer);
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    customer: publicCustomer(customer),
    supabaseSession,
  };
};

exports.refresh = async (refreshToken) => {
  if (!refreshToken) throw new BadRequest("Thiếu refresh token");

  const decoded = verifyRefreshToken(refreshToken);
  if (decoded.type !== "customer") throw new Forbidden("Token sai loại tài khoản");

  const customer = await repo.findById(decoded.id);
  if (!customer) throw new BadRequest("Tài khoản không tồn tại");
  if (customer.status && customer.status !== "active") {
    throw new Forbidden("Tài khoản đã bị khóa");
  }

  const payload = buildPayload(customer);
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    customer: publicCustomer(customer),
  };
};

exports.changePassword = async (customerId, oldPassword, newPassword) => {
  const row = await repo.getPassword(customerId);
  if (!row) throw new BadRequest("Khách hàng không tồn tại");

  const ok = await bcrypt.compare(oldPassword, row.password);
  if (!ok) throw new BadRequest("Mật khẩu cũ không đúng");

  await repo.updatePassword(customerId, await bcrypt.hash(newPassword, 10));
  // Dong bo mat khau sang Supabase Auth (best-effort). Bo qua vi khong luu supabase_uid nua.
  // await updateCustomerAuthPassword(row.supabase_uid, newPassword);
};

exports.forgotPassword = async (email) => {
  const customer = await repo.findForReset(email);

  if (!customer || !customer.email) return { message: "ok" };

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await repo.createResetToken(customer.id, tokenHash, expiresAt);

  const resetLink = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;
  try {
    sendMail(
      customer.email,
      "Đặt lại mật khẩu",
      `<h2>Yêu cầu đặt lại mật khẩu</h2>
       <p>Nhấn vào liên kết bên dưới để đặt lại mật khẩu (hết hạn sau 15 phút):</p>
       <p><a href="${resetLink}">${resetLink}</a></p>
       <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>`
    ).catch(err => {
      logger.warn({ err }, "Gửi mail đặt lại mật khẩu thất bại");
    });
  } catch (err) {
    logger.warn({ err }, "Gửi mail đặt lại mật khẩu thất bại");
  }

  return { message: "ok" };
};

exports.resetPassword = async (token, newPassword) => {
  const tokenHash = hashToken(token);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const t = await repo.findResetTokenForUpdate(client, tokenHash);
    if (!t) throw new BadRequest("Token không hợp lệ");
    if (t.used_at) throw new BadRequest("Token đã được sử dụng");
    if (new Date(t.expires_at) < new Date()) throw new BadRequest("Token đã hết hạn");

    const hashed = await bcrypt.hash(newPassword, 10);
    await repo.updatePasswordTx(client, t.customer_id, hashed);
    await repo.markResetTokenUsed(client, t.id);

    await client.query("COMMIT");
    // Dong bo mat khau sang Supabase Auth (best-effort). Bo qua vi khong luu supabase_uid nua.
    // const supabaseUid = await repo.findSupabaseUidById(t.customer_id);
    // await updateCustomerAuthPassword(supabaseUid, newPassword);
    return { message: "Đặt lại mật khẩu thành công" };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
