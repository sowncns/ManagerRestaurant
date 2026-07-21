# Module 01 — Customer Auth

Base path: `/api/customer/auth`
Endpoints: `POST /register`, `POST /login`, `POST /refresh-token`, `POST /logout`, `POST /forgot-password`, `POST /reset-password`, `GET|POST /verify-email`, `POST /resend-verification`, `POST /change-password` (auth), `POST /request-verification` (auth), `GET /test-mail`.

Schema thực tế (`auth.schema.js`):
- register: `full_name` min 1, `email` email-format, `password` min 6.
- login: `email` email-format, `password` min 1.
- reset: `token` min 1, `newPassword` min 6.
- change: `oldPassword` min 1, `newPassword` min 6.

Business rules thực tế (`auth.service.js`):
- Register: chặn email trùng ("Email đã được sử dụng"), bcrypt cost 10, **không** gửi mail xác thực khi đăng ký, trả `email_verified=false`, tạo Supabase user song song (best-effort).
- Login: thông báo lỗi **chung** "Email hoặc mật khẩu không đúng" (chống dò tài khoản); `status != 'active'` → 403 "Tài khoản đã bị khóa".
- Reset token TTL **15 phút**, verify-email token TTL **24 giờ**, cả hai dùng **1 lần**, xử lý trong transaction + `FOR UPDATE`.
- Forgot/Resend: **luôn** trả `ok` dù email không tồn tại (chống enumeration).

---

## 1.1 Register — Happy Path

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CAUTH-001 | Customer Auth | Register | P1 | Critical | Email chưa tồn tại | POST /register | `{full_name:"Nguyễn Văn A", email:"a@test.com", password:"123456"}` | 201, trả customer `{id, full_name, rank, points, email_verified:false}`, **không** trả password | | |
| TC-CAUTH-002 | Customer Auth | Register | P2 | High | TC-001 xong | Kiểm tra DB sau đăng ký | — | Password lưu ở dạng bcrypt hash (không plaintext), `email_verified=false` | | |
| TC-CAUTH-003 | Customer Auth | Register | P2 | Medium | TC-001 xong | Kiểm tra không có mail xác thực gửi ngay | — | Không gửi verification email lúc đăng ký (đúng thiết kế) | | |
| TC-CAUTH-004 | Customer Auth | Register | P3 | Low | Supabase down | POST /register khi Supabase lỗi | hợp lệ | Vẫn tạo được customer (Supabase best-effort, không chặn luồng) | | |

## 1.2 Register — Validation

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CAUTH-005 | Customer Auth | Register/validation | P1 | High | — | POST thiếu full_name | `{email,password}` | 400 "Vui lòng nhập họ tên" | | |
| TC-CAUTH-006 | Customer Auth | Register/validation | P1 | High | — | full_name = "" | `full_name:""` | 400 "Vui lòng nhập họ tên" | | |
| TC-CAUTH-007 | Customer Auth | Register/validation | P2 | Medium | — | full_name = "   " (chỉ space) | `full_name:"   "` | ⚠️ASSUMED: schema `min(1)` không trim → pass schema. Đề xuất trim → 400. Ghi nhận hành vi thực tế | | |
| TC-CAUTH-008 | Customer Auth | Register/validation | P1 | High | — | Thiếu email | `{full_name,password}` | 400 "Email không được để trống" | | |
| TC-CAUTH-009 | Customer Auth | Register/validation | P1 | High | — | Email sai format | `email:"abc"` | 400 "Email không hợp lệ" | | |
| TC-CAUTH-010 | Customer Auth | Register/validation | P2 | Medium | — | Email thiếu domain | `email:"a@"` | 400 "Email không hợp lệ" | | |
| TC-CAUTH-011 | Customer Auth | Register/validation | P2 | Medium | — | Email có space đầu/cuối | `email:" a@test.com "` | ⚠️ASSUMED: zod .email() từ chối khoảng trắng → 400. Xác nhận | | |
| TC-CAUTH-012 | Customer Auth | Register/validation | P1 | High | — | Thiếu password | `{full_name,email}` | 400 "Mật khẩu không được để trống" | | |
| TC-CAUTH-013 | Customer Auth | Register/validation | P1 | High | — | Password 5 ký tự (min-1) | `password:"12345"` | 400 "Mật khẩu tối thiểu 6 ký tự" | | |
| TC-CAUTH-014 | Customer Auth | Register/boundary | P1 | High | — | Password đúng 6 (min) | `password:"123456"` | 201 thành công | | |
| TC-CAUTH-015 | Customer Auth | Register/boundary | P2 | Low | — | Password 7 (min+1) | `password:"1234567"` | 201 thành công | | |
| TC-CAUTH-016 | Customer Auth | Register/boundary | P2 | Medium | — | Password rất dài (1000 ký tự) | 1000 chars | ⚠️ASSUMED: bcrypt chỉ dùng 72 byte đầu; cần kiểm cột DB. Không lỗi 500 | | |
| TC-CAUTH-017 | Customer Auth | Register/unicode | P2 | Low | — | full_name unicode dấu tiếng Việt | `"Đặng Thị Ánh Tuyết"` | 201, lưu đúng UTF-8 | | |
| TC-CAUTH-018 | Customer Auth | Register/emoji | P3 | Low | — | full_name có emoji | `"An 😀"` | ⚠️ASSUMED: lưu được (utf8mb4/UTF-8). Không lỗi 500 | | |
| TC-CAUTH-019 | Customer Auth | Register/XSS | P1 | High | — | full_name = `<script>alert(1)</script>` | như bên | Lưu nguyên literal; khi hiển thị ở internal/app phải escape (không thực thi) | | |
| TC-CAUTH-020 | Customer Auth | Register/SQLi | P1 | Critical | — | email = `a'; DROP TABLE customers;--@x.com` | như bên | 400 (sai email format) hoặc parametrized → **không** thực thi SQL | | |
| TC-CAUTH-021 | Customer Auth | Register/null | P2 | Medium | — | Gửi `password:null` | — | 400 validation | | |
| TC-CAUTH-022 | Customer Auth | Register/type | P2 | Medium | — | Gửi `password:123456` (number) | — | 400 (expect string) | | |
| TC-CAUTH-023 | Customer Auth | Register/body | P2 | Medium | — | Body rỗng `{}` | — | 400 gộp lỗi 3 field | | |
| TC-CAUTH-024 | Customer Auth | Register/body | P2 | Low | — | Body không phải JSON | text thô | 400 (parse error) | | |
| TC-CAUTH-025 | Customer Auth | Register/extra | P3 | Low | — | Gửi thêm field lạ `role:"admin"` | — | Field lạ bị bỏ qua; **không** cho phép set role | | |

## 1.3 Register — Business Rule / Duplicate / Concurrency

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CAUTH-026 | Customer Auth | Register/duplicate | P1 | Critical | Email a@test.com đã tồn tại | POST /register cùng email | như bên | 400 "Email đã được sử dụng" | | |
| TC-CAUTH-027 | Customer Auth | Register/duplicate | P2 | High | Email `A@test.com` tồn tại | Đăng ký `a@test.com` (khác hoa/thường) | như bên | ⚠️ASSUMED: cần chuẩn hóa lowercase để tránh 2 tài khoản trùng. Kiểm tra hành vi `existsEmail` | | |
| TC-CAUTH-028 | Customer Auth | Register/concurrency | P1 | High | — | 2 request đăng ký cùng email **đồng thời** | như bên | Chỉ 1 thành công; request 2 nhận 400/409 (UNIQUE constraint, không tạo 2 bản ghi) | | |
| TC-CAUTH-029 | Customer Auth | Register/edge | P2 | Medium | — | Double-click nút Đăng ký | 2 lần liên tiếp | Chỉ 1 tài khoản; lần 2 báo email đã dùng | | |

## 1.4 Login — Happy Path & Business Rule

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CAUTH-030 | Customer Auth | Login | P1 | Critical | Tài khoản active | POST /login đúng thông tin | `{email,password}` | 200, trả `accessToken`, `refreshToken`, `customer`, `supabaseSession` | | |
| TC-CAUTH-031 | Customer Auth | Login | P1 | Critical | — | Sai mật khẩu | password sai | 400 "Email hoặc mật khẩu không đúng" (thông báo chung) | | |
| TC-CAUTH-032 | Customer Auth | Login | P1 | Critical | — | Email không tồn tại | email lạ | 400 "Email hoặc mật khẩu không đúng" — **giống hệt** case sai pass (chống enumeration) | | |
| TC-CAUTH-033 | Customer Auth | Login | P1 | High | Tài khoản `status='locked'` | POST /login đúng pass | như bên | 403 "Tài khoản đã bị khóa" | | |
| TC-CAUTH-034 | Customer Auth | Login | P2 | Medium | Supabase down | POST /login | hợp lệ | Vẫn login được (supabaseSession best-effort null) | | |
| TC-CAUTH-035 | Customer Auth | Login/token | P1 | High | Login OK | Giải mã accessToken | — | Payload `{id, type:"customer", full_name}`, **không** chứa password/email | | |
| TC-CAUTH-036 | Customer Auth | Login/validation | P2 | Medium | — | Thiếu password | `{email}` | 400 "Vui lòng nhập mật khẩu" | | |
| TC-CAUTH-037 | Customer Auth | Login/validation | P2 | Medium | — | Email sai format | `email:"abc"` | 400 "Email không hợp lệ" | | |
| TC-CAUTH-038 | Customer Auth | Login/SQLi | P1 | Critical | — | password = `' OR '1'='1` | như bên | 400 (bcrypt compare fail); không bypass | | |

## 1.5 Login — Rate limit / Edge / Security

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CAUTH-039 | Customer Auth | Login/429 | P1 | High | authLimiter bật | Gửi login sai N lần vượt ngưỡng | lặp nhanh | 429 Too Many Requests sau khi vượt limit | | |
| TC-CAUTH-040 | Customer Auth | Login/429 | P2 | Medium | Đã bị 429 | Chờ hết window rồi login đúng | — | Login lại được sau khi reset window | | |
| TC-CAUTH-041 | Customer Auth | Login/timing | P2 | Medium | — | So sánh thời gian phản hồi user-tồn-tại vs không | — | Không lộ khác biệt lớn (tránh timing attack) — ghi nhận | | |
| TC-CAUTH-042 | Customer Auth | Login/edge | P2 | Medium | — | Login đồng thời nhiều tab | 2+ tab | Mỗi tab nhận token hợp lệ; hoạt động độc lập | | |
| TC-CAUTH-043 | Customer Auth | Login/perf | P3 | Medium | — | 1000 user login đồng thời | load test | Response time trong ngưỡng SLA; không 500/timeout hàng loạt | | |

## 1.6 Refresh Token

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CAUTH-044 | Customer Auth | Refresh | P1 | Critical | Có refreshToken hợp lệ | POST /refresh-token | valid token | 200, cấp accessToken + refreshToken mới | | |
| TC-CAUTH-045 | Customer Auth | Refresh | P1 | High | — | Thiếu refreshToken | `{}` | 400 "Thiếu refresh token" | | |
| TC-CAUTH-046 | Customer Auth | Refresh | P1 | High | — | Token sai chữ ký | token giả | 401/403 (verify fail) | | |
| TC-CAUTH-047 | Customer Auth | Refresh | P1 | High | Token của internal user | POST /refresh-token với type != customer | như bên | 403 "Token sai loại tài khoản" | | |
| TC-CAUTH-048 | Customer Auth | Refresh | P1 | High | Token hết hạn | POST /refresh-token | expired token | 401/403 token expired | | |
| TC-CAUTH-049 | Customer Auth | Refresh | P2 | High | Customer đã bị xóa | Refresh sau khi tài khoản bị xóa | valid token | 400 "Tài khoản không tồn tại" | | |
| TC-CAUTH-050 | Customer Auth | Refresh | P1 | High | Customer bị khóa | Refresh khi status != active | valid token | 403 "Tài khoản đã bị khóa" | | |
| TC-CAUTH-051 | Customer Auth | Refresh/edge | P2 | Medium | Refresh token cũ đã dùng | Dùng lại token cũ sau khi đã refresh | old token | ⚠️ASSUMED: nếu không rotate/blacklist, token cũ vẫn hợp lệ tới khi hết hạn — ghi nhận rủi ro reuse | | |

## 1.7 Logout

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CAUTH-052 | Customer Auth | Logout | P2 | Medium | Đã đăng nhập | POST /logout | — | 200; clear refresh cookie/session nếu có | | |
| TC-CAUTH-053 | Customer Auth | Logout | P3 | Low | Chưa đăng nhập | POST /logout không token | — | 200 (idempotent) — ghi nhận hành vi | | |
| TC-CAUTH-054 | Customer Auth | Logout | P2 | Medium | Đã logout | Dùng lại accessToken cũ ở API cần auth | old token | ⚠️ASSUMED: access token vẫn hợp lệ tới hết hạn (stateless JWT) — ghi nhận | | |

## 1.8 Forgot Password

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CAUTH-055 | Customer Auth | Forgot | P1 | High | Email tồn tại | POST /forgot-password | `{email}` | 200 `{message:"ok"}`; gửi mail reset link (TTL 15 phút) | | |
| TC-CAUTH-056 | Customer Auth | Forgot/enum | P1 | High | Email KHÔNG tồn tại | POST /forgot-password | email lạ | 200 `{message:"ok"}` **giống hệt** — không lộ email tồn tại hay không | | |
| TC-CAUTH-057 | Customer Auth | Forgot/validation | P2 | Medium | — | Email sai format | `email:"x"` | 400 "Email không hợp lệ" | | |
| TC-CAUTH-058 | Customer Auth | Forgot/429 | P2 | Medium | authLimiter | Spam forgot nhiều lần | lặp | 429 sau ngưỡng (chống mail bomb) | | |
| TC-CAUTH-059 | Customer Auth | Forgot/mail-fail | P3 | Low | SMTP lỗi | POST /forgot-password | valid | Vẫn trả `ok` (gửi mail best-effort, log warn) | | |
| TC-CAUTH-060 | Customer Auth | Forgot/token | P2 | High | — | Kiểm tra reset token trong DB | — | Lưu **hash** token (sha256), không lưu raw | | |

## 1.9 Reset Password

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CAUTH-061 | Customer Auth | Reset | P1 | Critical | Có reset token hợp lệ chưa dùng, chưa hết hạn | POST /reset-password | `{token,newPassword:"newpass1"}` | 200 "Đặt lại mật khẩu thành công"; login bằng pass mới OK | | |
| TC-CAUTH-062 | Customer Auth | Reset | P1 | High | Token đã dùng 1 lần | POST /reset-password lại token đó | dùng lại | 400 "Token đã được sử dụng" | | |
| TC-CAUTH-063 | Customer Auth | Reset | P1 | High | Token quá 15 phút | POST /reset-password | expired token | 400 "Token đã hết hạn" | | |
| TC-CAUTH-064 | Customer Auth | Reset | P1 | High | — | Token bịa/sai | random | 400 "Token không hợp lệ" | | |
| TC-CAUTH-065 | Customer Auth | Reset/validation | P2 | Medium | — | newPassword 5 ký tự | `newPassword:"12345"` | 400 "Mật khẩu tối thiểu 6 ký tự" | | |
| TC-CAUTH-066 | Customer Auth | Reset/validation | P2 | Medium | — | Thiếu token | `{newPassword}` | 400 "Thiếu token" | | |
| TC-CAUTH-067 | Customer Auth | Reset/concurrency | P1 | High | 1 token hợp lệ | 2 request reset cùng token **đồng thời** | như bên | Chỉ 1 thành công (FOR UPDATE + used_at); cái còn lại 400 | | |
| TC-CAUTH-068 | Customer Auth | Reset/rollback | P2 | High | DB lỗi giữa transaction | Mô phỏng lỗi sau updatePassword | — | ROLLBACK: password KHÔNG đổi & token KHÔNG bị đánh dấu used | | |
| TC-CAUTH-069 | Customer Auth | Reset/session | P2 | Medium | Đổi pass xong | Token/phiên cũ | — | ⚠️ASSUMED: các phiên cũ không tự thu hồi (stateless) — đề xuất invalidate. Ghi nhận | | |

## 1.10 Verify Email / Resend / Request Verification

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CAUTH-070 | Customer Auth | Verify email | P1 | High | Có token verify hợp lệ (từ request-verification) | GET /verify-email?token=... | valid | 200 "Xác thực email thành công"; `email_verified=true` | | |
| TC-CAUTH-071 | Customer Auth | Verify email | P1 | High | — | POST /verify-email body token | valid | 200 như trên | | |
| TC-CAUTH-072 | Customer Auth | Verify email | P1 | High | Token đã dùng | Verify lại | dùng lại | 400 "Token đã được sử dụng" | | |
| TC-CAUTH-073 | Customer Auth | Verify email | P1 | High | Token quá 24h | Verify | expired | 400 "Token đã hết hạn" | | |
| TC-CAUTH-074 | Customer Auth | Verify email | P2 | Medium | — | Token sai | random | 400 "Token không hợp lệ" | | |
| TC-CAUTH-075 | Customer Auth | Verify email | P2 | Medium | — | GET /verify-email không token | — | 400 (thiếu token) | | |
| TC-CAUTH-076 | Customer Auth | Request verify | P1 | High | Đã đăng nhập, email chưa verify | POST /request-verification | Bearer token | 200 "Đã gửi email xác thực..."; tạo token 24h + gửi mail | | |
| TC-CAUTH-077 | Customer Auth | Request verify | P2 | Medium | Email đã verify | POST /request-verification | — | 200 "Email đã được xác thực" (không gửi lại) | | |
| TC-CAUTH-078 | Customer Auth | Request verify | P2 | Medium | Tài khoản chưa có email | POST /request-verification | — | 400 "Tài khoản chưa có email" | | |
| TC-CAUTH-079 | Customer Auth | Request verify | P1 | High | Chưa đăng nhập | POST /request-verification không token | — | 401 Unauthorized | | |
| TC-CAUTH-080 | Customer Auth | Resend verify | P2 | Medium | Email tồn tại chưa verify | POST /resend-verification | `{email}` | 200 `{message:"ok"}`; gửi lại mail | | |
| TC-CAUTH-081 | Customer Auth | Resend/enum | P1 | High | Email không tồn tại | POST /resend-verification | email lạ | 200 `{message:"ok"}` giống hệt (không lộ tồn tại) | | |
| TC-CAUTH-082 | Customer Auth | Resend | P3 | Low | Email đã verified | POST /resend-verification | — | 200 ok; **không** gửi mail (điều kiện `!email_verified`) | | |

## 1.11 Change Password (auth)

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CAUTH-083 | Customer Auth | Change pass | P1 | Critical | Đã đăng nhập | POST /change-password đúng oldPassword | `{oldPassword,newPassword:"abcdef"}` | 200; login pass mới OK, pass cũ fail | | |
| TC-CAUTH-084 | Customer Auth | Change pass | P1 | High | Đã đăng nhập | Sai oldPassword | old sai | 400 "Mật khẩu cũ không đúng" | | |
| TC-CAUTH-085 | Customer Auth | Change pass | P1 | High | Chưa đăng nhập | POST /change-password không token | — | 401 Unauthorized | | |
| TC-CAUTH-086 | Customer Auth | Change pass/validation | P2 | Medium | Đã đăng nhập | newPassword 5 ký tự | `newPassword:"12345"` | 400 "Mật khẩu mới tối thiểu 6 ký tự" | | |
| TC-CAUTH-087 | Customer Auth | Change pass | P3 | Low | Đã đăng nhập | newPassword == oldPassword | trùng | ⚠️ASSUMED: không chặn đặt lại pass cũ — đề xuất chặn. Ghi nhận | | |
| TC-CAUTH-088 | Customer Auth | Change pass/token | P2 | High | Token của người khác | Đổi pass với token customer B nhưng nhắm id A | — | Chỉ đổi được pass của chính mình (customerId lấy từ token, không từ body) | | |

## 1.12 Cross-cutting: Security / Permission / API Error

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CAUTH-089 | Customer Auth | Permission | P1 | High | — | Customer token gọi API `/internal/*` | customer token | 403 (sai loại tài khoản) | | |
| TC-CAUTH-090 | Customer Auth | JWT | P1 | High | — | Sửa payload token (đổi id) rồi gọi API auth | tampered | 401 (chữ ký sai) | | |
| TC-CAUTH-091 | Customer Auth | JWT/alg | P1 | Critical | — | Token với `alg:none` | forged | 401 (từ chối alg none) | | |
| TC-CAUTH-092 | Customer Auth | Sensitive data | P1 | High | — | Kiểm tra mọi response auth | — | Không bao giờ trả `password`/hash/reset token raw | | |
| TC-CAUTH-093 | Customer Auth | API error 404 | P3 | Low | — | Gọi path sai `/customer/auth/xyz` | — | 404 | | |
| TC-CAUTH-094 | Customer Auth | API error 500 | P2 | High | DB down | POST /login khi DB unreachable | — | 500 với message chung, không lộ stack/SQL ra client | | |
| TC-CAUTH-095 | Customer Auth | Network | P3 | Medium | — | Ngắt mạng giữa request | — | Client báo lỗi mạng, không tạo state nửa vời | | |
| TC-CAUTH-096 | Customer Auth | CSRF | P2 | Medium | Refresh dùng cookie | POST /refresh-token cross-site | — | ⚠️ASSUMED: nếu refresh qua cookie cần SameSite/CSRF protection — kiểm tra | | |
| TC-CAUTH-097 | Customer Auth | test-mail | P2 | High | — | GET /test-mail (không auth) | — | ⚠️RỦI RO: endpoint test gửi mail public → nên tắt/bảo vệ ở production. Ghi nhận bug tiềm ẩn | | |

## 1.13 UI (Signup / Login màn hình igourmet-app)

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CAUTH-098 | Customer Auth | UI/Signup | P2 | Medium | Mở app | Submit form thiếu field | — | Hiển thị lỗi inline theo field, không gọi API | | |
| TC-CAUTH-099 | Customer Auth | UI/Signup | P2 | Medium | — | Đang submit | click | Nút disabled + loading spinner, chặn double submit | | |
| TC-CAUTH-100 | Customer Auth | UI/Login | P2 | Medium | Login sai | Xem thông báo | — | Hiện "Email hoặc mật khẩu không đúng"; không lộ field nào sai | | |
| TC-CAUTH-101 | Customer Auth | UI/Responsive | P3 | Low | — | Xem trên mobile/tablet/desktop | — | Form responsive, không vỡ layout, bàn phím không che input | | |
| TC-CAUTH-102 | Customer Auth | UI/Password | P3 | Low | — | Toggle hiện/ẩn mật khẩu | — | Ẩn mặc định; toggle hoạt động | | |
| TC-CAUTH-103 | Customer Auth | UI/Edge | P2 | Medium | Token hết hạn khi đang dùng app | Gọi API bất kỳ | — | Auto refresh; nếu refresh fail → điều hướng về Login (session expired) | | |
