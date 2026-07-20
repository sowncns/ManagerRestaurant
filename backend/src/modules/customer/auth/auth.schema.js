
const { z } = require("zod");

const registerSchema = z.object({
  full_name: z.string({ required_error: "Vui lòng nhập họ tên" }).min(1, "Vui lòng nhập họ tên"),
  email: z.string({ required_error: "Email không được để trống" }).email("Email không hợp lệ"),
  password: z.string({ required_error: "Mật khẩu không được để trống" }).min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

const forgotSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

const resetSchema = z.object({
  token: z.string().min(1, "Thiếu token"),
  newPassword: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Thiếu token"),
});

const resendVerificationSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Vui lòng nhập mật khẩu cũ"),
  newPassword: z.string().min(6, "Mật khẩu mới tối thiểu 6 ký tự"),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  changePasswordSchema,
};
