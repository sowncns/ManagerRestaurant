// src/shared/utils/supabaseAuth.js
// Cau noi best-effort toi Supabase Auth (mo hinh hybrid). MOI ham deu:
//  - tra ve null / bo qua an toan khi Supabase chua cau hinh (supabase === null),
//  - bat het loi, chi log warn, KHONG throw -> khong chan luong nghiep vu chinh.
// Internal (nhan vien): email ao username@INTERNAL_AUTH_EMAIL_DOMAIN.
// Customer: email THAT khach nhap khi dang ky.
const supabase = require("../../config/supabase");
const env = require("../../config/env");
const logger = require("./logger");

function buildInternalEmail(username) {
  return `${username}@${env.INTERNAL_AUTH_EMAIL_DOMAIN}`;
}

// ---- Internal (nhan vien) ----
async function createInternalAuthUser({ username, password, metadata }) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: buildInternalEmail(username),
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    return data.user?.id ?? null;
  } catch (err) {
    logger.warn({ err, username }, "Supabase createInternalAuthUser that bai (bo qua)");
    return null;
  }
}

async function updateInternalAuthPassword(supabaseUid, newPassword) {
  if (!supabase || !supabaseUid) return;
  try {
    const { error } = await supabase.auth.admin.updateUserById(supabaseUid, {
      password: newPassword,
    });
    if (error) throw error;
  } catch (err) {
    logger.warn({ err, supabaseUid }, "Supabase updateInternalAuthPassword that bai (bo qua)");
  }
}

async function signInInternalAuthUser({ username, password }) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: buildInternalEmail(username),
      password,
    });
    if (error) throw error;
    const s = data.session;
    if (!s) return null;
    return {
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_at: s.expires_at,
    };
  } catch (err) {
    logger.warn({ err, username }, "Supabase signInInternalAuthUser that bai (bo qua)");
    return null;
  }
}

// ---- Customer (email that) ----
async function createCustomerAuthUser({ email, password, metadata }) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Nodemailer/customer_tokens van la nguon xac thuc email DUY NHAT.
      user_metadata: metadata,
    });
    if (error) throw error;
    return data.user?.id ?? null;
  } catch (err) {
    logger.warn({ err, email }, "Supabase createCustomerAuthUser that bai (bo qua)");
    return null;
  }
}

async function updateCustomerAuthPassword(supabaseUid, newPassword) {
  if (!supabase || !supabaseUid) return;
  try {
    const { error } = await supabase.auth.admin.updateUserById(supabaseUid, {
      password: newPassword,
    });
    if (error) throw error;
  } catch (err) {
    logger.warn({ err, supabaseUid }, "Supabase updateCustomerAuthPassword that bai (bo qua)");
  }
}

async function signInCustomerAuthUser({ email, password }) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const s = data.session;
    if (!s) return null;
    return {
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_at: s.expires_at,
    };
  } catch (err) {
    logger.warn({ err, email }, "Supabase signInCustomerAuthUser that bai (bo qua)");
    return null;
  }
}

module.exports = {
  buildInternalEmail,
  createInternalAuthUser,
  updateInternalAuthPassword,
  signInInternalAuthUser,
  createCustomerAuthUser,
  updateCustomerAuthPassword,
  signInCustomerAuthUser,
};
