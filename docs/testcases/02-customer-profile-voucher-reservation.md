# Module 02 — Customer Profile, Voucher, Reservation

---

## PART A — Customer Profile
Base path: `/api/customer/profile` (tất cả route `requireAuth`).
Endpoints: `GET /me`, `POST /verify-pin`, `GET /transactions` (requirePaymentPin), `PUT /me` (requireVerifiedEmail), `POST /setup-pin` (requireVerifiedEmail), `POST /add-points` (requireVerifiedEmail).

Business rules thực tế (`profile.service.js`):
- **Rank ladder**: normal → silver(≥10.000.000) → gold(≥30.000.000) → platinum(≥80.000.000). Lên hạng **reset điểm về 0** + đặt `rank_expired_at = +1 năm`.
- Hết chu kỳ (`rank_expired_at` quá hạn): tính lại hạng theo điểm tích lũy, **reset điểm về 0**, gia hạn hoặc rớt hạng.
- PIN: đúng 6 số, hash bcrypt. Sai **5 lần** → khóa thanh toán **1 giờ** (`pin_locked_until`). Đúng → reset attempts.
- Chưa có PIN → `wallet_balance` trả `null` (ẩn số dư).

### A.1 GET /me — Happy & Permission

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CPROF-001 | Profile | Get me | P1 | High | Đã đăng nhập, đã có PIN | GET /me | Bearer | 200, trả profile gồm `wallet_balance` thật | | |
| TC-CPROF-002 | Profile | Get me | P1 | High | Đã đăng nhập, **chưa** có PIN | GET /me | Bearer | 200, `wallet_balance = null` (ẩn số dư) | | |
| TC-CPROF-003 | Profile | Get me | P1 | High | Chưa đăng nhập | GET /me không token | — | 401 Unauthorized | | |
| TC-CPROF-004 | Profile | Get me | P2 | High | Token customer B | GET /me | B token | Chỉ trả hồ sơ của B (id lấy từ token) — không xem được người khác | | |
| TC-CPROF-005 | Profile | Get me | P2 | Medium | Chưa xác thực email | GET /me | Bearer | 200 (xem hồ sơ **không** cần verified email) | | |
| TC-CPROF-006 | Profile | Get me | P2 | Medium | Customer bị xóa nhưng token còn | GET /me | Bearer | 404 "Không tìm thấy khách hàng" | | |

### A.2 PUT /me — Validation (requireVerifiedEmail)

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CPROF-007 | Profile | Update | P1 | High | Đã verified email | PUT /me hợp lệ | `{name,phone,dob,gender}` | 200, cập nhật thành công | | |
| TC-CPROF-008 | Profile | Update/permission | P1 | High | **Chưa** verified email | PUT /me | Bearer | 403 (requireVerifiedEmail chặn) | | |
| TC-CPROF-009 | Profile | Update/validation | P2 | Medium | verified | name = "" | `name:""` | 400 "Vui lòng nhập họ tên" (min 1 khi có) | | |
| TC-CPROF-010 | Profile | Update/validation | P2 | Medium | verified | email sai format | `email:"abc"` | 400 "Email không hợp lệ" | | |
| TC-CPROF-011 | Profile | Update/validation | P3 | Low | verified | email = "" (chuỗi rỗng) | `email:""` | 200 (schema `.or(z.literal(""))` cho phép rỗng) | | |
| TC-CPROF-012 | Profile | Update/date | P2 | Medium | verified | dob = "" | `dob:""` | 200; service chuyển `""` → null (tránh lỗi kiểu DATE) | | |
| TC-CPROF-013 | Profile | Update/date | P2 | Medium | verified | dob sai format `31-02-2020` | như bên | ⚠️ASSUMED: schema `dob` chỉ `string().optional()` không regex → cần DB từ chối hoặc 500. Kiểm tra, đề xuất validate | | |
| TC-CPROF-014 | Profile | Update/date | P2 | Low | verified | dob tương lai `2999-01-01` | như bên | ⚠️ASSUMED: không chặn ngày sinh tương lai — đề xuất chặn | | |
| TC-CPROF-015 | Profile | Update/phone | P2 | Medium | verified | phone chứa chữ `abcxyz` | như bên | ⚠️ASSUMED: `phone` không regex → chấp nhận. Đề xuất validate SĐT VN | | |
| TC-CPROF-016 | Profile | Update/XSS | P1 | High | verified | name = `<img src=x onerror=alert(1)>` | như bên | Lưu literal, hiển thị escape (không execute) | | |
| TC-CPROF-017 | Profile | Update/SQLi | P1 | Critical | verified | name = `'; UPDATE customers SET points=999999;--` | như bên | Parametrized, không thực thi | | |
| TC-CPROF-018 | Profile | Update/unicode | P3 | Low | verified | name tiếng Việt + emoji | như bên | Lưu đúng | | |
| TC-CPROF-019 | Profile | Update/mass-assign | P1 | Critical | verified | Gửi thêm `points:999999, rank:"platinum", wallet_balance:1e9` | như bên | Field ngoài schema bị bỏ; **không** tự nâng điểm/hạng/ví | | |

### A.3 PIN — Setup / Verify / Lockout (business rule)

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CPROF-020 | Profile | Setup PIN | P1 | Critical | verified email | POST /setup-pin | `{pin:"123456"}` | 200; PIN lưu bcrypt hash (không plaintext) | | |
| TC-CPROF-021 | Profile | Setup PIN/validation | P1 | High | verified | pin 5 số | `pin:"12345"` | 400 "Mã PIN phải gồm đúng 6 số" | | |
| TC-CPROF-022 | Profile | Setup PIN/validation | P1 | High | verified | pin 7 số | `pin:"1234567"` | 400 (length != 6) | | |
| TC-CPROF-023 | Profile | Setup PIN/validation | P2 | Medium | verified | pin chứa chữ `12a45b` | như bên | ⚠️ASSUMED: schema chỉ check length 6, không regex số → chấp nhận. Đề xuất `\d{6}`. Ghi nhận | | |
| TC-CPROF-024 | Profile | Setup PIN/permission | P1 | High | **chưa** verified | POST /setup-pin | Bearer | 403 requireVerifiedEmail | | |
| TC-CPROF-025 | Profile | Verify PIN | P1 | Critical | Đã có PIN | POST /verify-pin đúng | `{pin:"123456"}` | 200 true; reset `pin_failed_attempts=0` | | |
| TC-CPROF-026 | Profile | Verify PIN | P1 | High | Chưa thiết lập PIN | POST /verify-pin | `{pin}` | 400 "Chưa thiết lập mã PIN" | | |
| TC-CPROF-027 | Profile | Verify PIN/lockout | P1 | Critical | Đã có PIN | Nhập sai lần 1→4 | pin sai | Mỗi lần 400 "Mã PIN sai. Bạn còn N lần thử." (còn 4,3,2,1) | | |
| TC-CPROF-028 | Profile | Verify PIN/lockout | P1 | Critical | Đã sai 4 lần | Nhập sai lần **5** | pin sai | 403 "Bạn đã nhập sai 5 lần... khóa 1 giờ"; set `pin_locked_until = +1h` | | |
| TC-CPROF-029 | Profile | Verify PIN/lockout | P1 | Critical | Đang bị khóa (<1h) | POST /verify-pin đúng PIN | đúng | 403 "Chức năng bị khóa..." (chặn trước cả khi so khớp) | | |
| TC-CPROF-030 | Profile | Verify PIN/lockout | P2 | High | Đã qua 1 giờ khóa | POST /verify-pin đúng | đúng | 200 true; cho thử lại sau khi hết khóa | | |
| TC-CPROF-031 | Profile | Verify PIN/edge | P2 | High | Đã có PIN | 6 request sai PIN **đồng thời** | song song | ⚠️ASSUMED: không lock row → attempts có thể race, khóa không chính xác. Đề xuất SELECT FOR UPDATE. Ghi nhận bug tiềm ẩn | | |
| TC-CPROF-032 | Profile | Verify PIN | P2 | Medium | — | POST /verify-pin thiếu pin | `{}` | 400 (schema length 6 fail / "Vui lòng nhập mã PIN") | | |

### A.4 Add Points & Rank ladder (business rule)

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CPROF-033 | Profile | Add points | P1 | High | verified, rank normal, points 0 | POST /add-points 5.000.000 | `{points:5000000}` | 200; points=5.000.000, rank vẫn normal | | |
| TC-CPROF-034 | Profile | Rank/boundary | P1 | High | normal, points 9.999.999 | add 1 (đạt 10.000.000) | `{points:1}` | Lên **silver**, points reset **0**, rank_expired_at = +1 năm | | |
| TC-CPROF-035 | Profile | Rank/boundary | P1 | High | normal, points 9.999.998 | add 1 (=9.999.999, min-1) | `{points:1}` | Vẫn normal (chưa đạt ngưỡng) | | |
| TC-CPROF-036 | Profile | Rank/skip | P2 | High | normal, points 0 | add 80.000.000 (vượt thẳng) | `{points:80000000}` | Lên thẳng **platinum**, reset điểm | | |
| TC-CPROF-037 | Profile | Rank/expire | P1 | High | silver, rank_expired_at quá hạn, points < 10tr | add 0 hoặc bất kỳ | trigger recompute | Rớt về normal, points reset 0, rank_expired_at null | | |
| TC-CPROF-038 | Profile | Rank/expire-keep | P2 | High | gold, hết hạn, points ≥ 30tr (tích lũy) | add points | trigger | Giữ gold, reset điểm, gia hạn +1 năm | | |
| TC-CPROF-039 | Profile | Add points/validation | P1 | High | verified | points = 0 | `{points:0}` | 400 "Số điểm phải là số nguyên dương" | | |
| TC-CPROF-040 | Profile | Add points/validation | P1 | High | verified | points = -100 | `{points:-100}` | 400 (positive) | | |
| TC-CPROF-041 | Profile | Add points/validation | P2 | Medium | verified | points = 1.5 | `{points:1.5}` | 400 (int) | | |
| TC-CPROF-042 | Profile | Add points/validation | P2 | Medium | verified | points = "abc" | `{points:"abc"}` | 400 (coerce fail) | | |
| TC-CPROF-043 | Profile | Add points/permission | P1 | Critical | verified customer | POST /add-points bởi chính customer | Bearer | ⚠️RỦI RO: customer tự cộng điểm cho mình?! Nếu endpoint mở cho customer → lỗ hổng nghiêm trọng. Xác nhận ai được gọi, đề xuất chỉ admin/hệ thống | | |
| TC-CPROF-044 | Profile | Add points/concurrency | P1 | High | verified | 2 request add-points **đồng thời** | song song | `lockCustomer` (FOR UPDATE) đảm bảo cộng dồn đúng, không mất update | | |
| TC-CPROF-045 | Profile | Add points/rollback | P2 | High | DB lỗi giữa TX | Mô phỏng lỗi sau lockCustomer | — | ROLLBACK; điểm/hạng không đổi | | |
| TC-CPROF-046 | Profile | Add points/boundary | P2 | Medium | verified | points cực lớn (2^53) | như bên | Không overflow/500; xử lý đúng kiểu số | | |

### A.5 Transactions (requirePaymentPin)

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CPROF-047 | Profile | Transactions | P1 | High | Đã verify PIN gần đây | GET /transactions | Bearer + PIN context | 200, trả lịch sử giao dịch ví của chính customer | | |
| TC-CPROF-048 | Profile | Transactions/permission | P1 | High | Chưa xác thực PIN | GET /transactions | Bearer | 403 (requirePaymentPin chặn) | | |
| TC-CPROF-049 | Profile | Transactions | P3 | Low | Không có giao dịch | GET /transactions | Bearer | 200, mảng rỗng (empty state) | | |

---

## PART B — Customer Voucher (view usable)
Base path: `/api/customer/voucher` — `GET /` (requireAuth).
Query thực tế (`voucher.repository.js`): chỉ trả voucher `cv.status='unused'` AND `vt.status='active'` AND `NOW() BETWEEN vt.start_date AND vt.end_date`, sort `end_date ASC`. Có `redeem_code` (migration 025).

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CVOU-001 | Cust Voucher | List | P1 | High | Customer có voucher usable | GET / | Bearer | 200, danh sách voucher gồm `redeem_code`, `discount_type`, `discount_value`, `min_order_amount`... | | |
| TC-CVOU-002 | Cust Voucher | List/permission | P1 | High | Chưa đăng nhập | GET / không token | — | 401 | | |
| TC-CVOU-003 | Cust Voucher | List/permission | P1 | High | Token customer A | GET / | A token | Chỉ trả voucher của A (customer_id từ token) | | |
| TC-CVOU-004 | Cust Voucher | Business/status | P1 | High | Customer có voucher `status='used'` | GET / | Bearer | Voucher đã dùng **không** hiển thị | | |
| TC-CVOU-005 | Cust Voucher | Business/expired | P1 | High | Voucher template `end_date` đã qua | GET / | Bearer | Voucher hết hạn **không** hiển thị | | |
| TC-CVOU-006 | Cust Voucher | Business/not-started | P1 | High | Voucher `start_date` trong tương lai | GET / | Bearer | Voucher chưa tới ngày **không** hiển thị | | |
| TC-CVOU-007 | Cust Voucher | Business/template-inactive | P2 | High | `vt.status='inactive'` | GET / | Bearer | Không hiển thị (chỉ active) | | |
| TC-CVOU-008 | Cust Voucher | Business/sort | P3 | Low | Nhiều voucher hạn khác nhau | GET / | Bearer | Sắp xếp theo `end_date ASC` (sắp hết hạn lên đầu) | | |
| TC-CVOU-009 | Cust Voucher | Boundary/date | P2 | High | Voucher end_date = NOW (đúng biên) | GET / | Bearer | `BETWEEN` inclusive → vẫn hiển thị tại thời điểm bằng | | |
| TC-CVOU-010 | Cust Voucher | Empty state | P3 | Low | Không có voucher | GET / | Bearer | 200, `vouchers: []` | | |
| TC-CVOU-011 | Cust Voucher | UI | P3 | Low | Có voucher | Mở VoucherModal / MyQr | — | Hiển thị redeem_code + QR đúng, responsive | | |
| TC-CVOU-012 | Cust Voucher | Security | P2 | Medium | — | Kiểm tra response | — | Không lộ voucher của customer khác qua id đoán được | | |
| TC-CVOU-013 | Cust Voucher | Perf | P3 | Medium | Customer có 1000 voucher | GET / | Bearer | ⚠️ASSUMED: không phân trang → cân nhắc pagination. Response time chấp nhận được | | |

---

## PART C — Customer Reservation
Base path: `/api/customer/reservations` (tất cả `requireAuth`).
Endpoints: `GET /`, `GET /:id`, `POST /` (requireVerifiedEmail), `DELETE /:id` (requireVerifiedEmail).

Schema (`createReservationSchema`): `branch_id` int>0, `reservation_date` regex `YYYY-MM-DD`, `reservation_time` regex `HH:mm[:ss]`, `guest_count` int>0, `customer_phone?`, `note?`, `items[]?` (đặt món trước), `pin?`.

Business rules (`reservation.service.js`):
- Phiếu tạo trạng thái **PENDING**, chưa gán bàn.
- `assertWithinOpenHours`: giờ đặt phải trong khung mở cửa chi nhánh (hỗ trợ qua nửa đêm); bỏ qua nếu chi nhánh không cấu hình giờ.
- Có `items` → tạo order **SCHEDULED** + tính cọc (`computeDeposit`) → trừ ví (cần `pin`). Trừ cọc **thất bại** → cleanup phiếu + order (không để rác).
- Cancel: `CHECKED_IN`/`COMPLETED` → không hủy được; `CANCELLED` → idempotent; hủy thành công → hoàn cọc về ví.

### C.1 Create — Happy Path

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CRES-001 | Reservation | Create | P1 | Critical | verified, chi nhánh mở cửa | POST / không đặt món | `{branch_id,reservation_date,reservation_time,guest_count:4}` | 201, phiếu PENDING, có reservation_code, chưa gán bàn | | |
| TC-CRES-002 | Reservation | Create+preorder | P1 | Critical | verified, có PIN, đủ số dư | POST / kèm items + pin | `{...,items:[{menu_item_id,quantity:2}],pin:"123456"}` | 201, tạo order SCHEDULED, trừ cọc đúng | | |
| TC-CRES-003 | Reservation | Create/phone-fallback | P2 | Medium | verified, hồ sơ có phone | POST / không nhập customer_phone | bỏ trống phone | Dùng phone từ hồ sơ | | |
| TC-CRES-004 | Reservation | Create/phone-missing | P2 | High | verified, hồ sơ **không** có phone | POST / không nhập phone | bỏ trống | 400 "Vui lòng cung cấp số điện thoại liên hệ" | | |

### C.2 Create — Validation & Boundary

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CRES-005 | Reservation | Validation | P1 | High | verified | thiếu branch_id | bỏ branch_id | 400 "Vui lòng chọn chi nhánh" | | |
| TC-CRES-006 | Reservation | Validation/date | P1 | High | verified | date `2026/07/20` (sai format) | như bên | 400 "Ngày không hợp lệ (YYYY-MM-DD)" | | |
| TC-CRES-007 | Reservation | Validation/date | P2 | Medium | verified | date `2026-13-40` (đúng regex, sai ngày thật) | như bên | ⚠️ASSUMED: regex pass; DB/logic phải từ chối ngày không tồn tại. Kiểm tra | | |
| TC-CRES-008 | Reservation | Validation/date-past | P1 | High | verified | reservation_date hôm qua | quá khứ | ⚠️ASSUMED: schema không chặn ngày quá khứ — đề xuất chặn. Ghi nhận (business rule cần đặt bàn tương lai) | | |
| TC-CRES-009 | Reservation | Validation/time | P1 | High | verified | time `25:00` | như bên | 400 "Giờ không hợp lệ (HH:mm)" | | |
| TC-CRES-010 | Reservation | Validation/time | P2 | Medium | verified | time `9:5` (thiếu 0) | như bên | 400 (regex yêu cầu HH:mm) | | |
| TC-CRES-011 | Reservation | Boundary/guest | P1 | High | verified | guest_count = 0 | `guest_count:0` | 400 "Số khách phải > 0" | | |
| TC-CRES-012 | Reservation | Boundary/guest | P2 | Medium | verified | guest_count = 1 (min) | `1` | 201 OK | | |
| TC-CRES-013 | Reservation | Boundary/guest | P2 | Medium | verified | guest_count = -5 | `-5` | 400 | | |
| TC-CRES-014 | Reservation | Boundary/guest | P2 | Medium | verified | guest_count = 99999 | rất lớn | ⚠️ASSUMED: không có max → đề xuất giới hạn hợp lý (sức chứa). Ghi nhận | | |
| TC-CRES-015 | Reservation | Validation/item | P2 | High | verified | items có quantity 0 | `quantity:0` | 400 "Số lượng phải > 0" | | |
| TC-CRES-016 | Reservation | Validation/item | P2 | Medium | verified | menu_item_id âm | `-1` | 400 (positive) | | |

### C.3 Create — Business Rule (open hours, deposit, atomicity)

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CRES-017 | Reservation | Branch | P1 | High | verified | branch_id không tồn tại/ngừng HĐ | id lạ | 400 "Chi nhánh không tồn tại hoặc ngừng hoạt động" | | |
| TC-CRES-018 | Reservation | Open hours | P1 | High | Chi nhánh mở 10:00–22:00 | POST / time 09:00 | trước giờ mở | 400 "Chi nhánh chỉ nhận khách từ 10:00 đến 22:00." | | |
| TC-CRES-019 | Reservation | Open hours/boundary | P2 | Medium | mở 10:00–22:00 | time đúng 10:00 (biên) | `10:00` | 201 (inclusive `>=`) | | |
| TC-CRES-020 | Reservation | Open hours/boundary | P2 | Medium | mở 10:00–22:00 | time đúng 22:00 (biên) | `22:00` | 201 (inclusive `<=`) | | |
| TC-CRES-021 | Reservation | Open hours/overnight | P2 | Medium | Chi nhánh mở 18:00–02:00 (qua đêm) | time 01:00 | `01:00` | 201 (logic `t>=open OR t<=close`) | | |
| TC-CRES-022 | Reservation | Open hours/overnight | P2 | Medium | mở 18:00–02:00 | time 10:00 (ngoài khung) | `10:00` | 400 ngoài giờ | | |
| TC-CRES-023 | Reservation | Open hours/no-config | P3 | Low | Chi nhánh không cấu hình giờ | time bất kỳ | — | Bỏ qua kiểm tra giờ, tạo phiếu OK | | |
| TC-CRES-024 | Reservation | Deposit/atomicity | P1 | Critical | verified, có PIN, **số dư không đủ** | POST / kèm items | cọc > số dư | Toàn bộ rollback: cleanup phiếu + order, không tạo phiếu rác; báo lỗi thiếu số dư | | |
| TC-CRES-025 | Reservation | Deposit/pin | P1 | Critical | verified, có items cần cọc, **sai PIN** | POST / | pin sai | Cleanup phiếu + order; báo sai PIN | | |
| TC-CRES-026 | Reservation | Deposit/no-pin | P1 | High | verified, items cần cọc, **thiếu pin** | POST / không pin | items có cọc | Cleanup + lỗi yêu cầu PIN | | |
| TC-CRES-027 | Reservation | Deposit/zero | P2 | Medium | verified, items có cọc = 0 (computeDeposit=0) | POST / | — | Tạo phiếu + order SCHEDULED, không trừ ví | | |
| TC-CRES-028 | Reservation | Edge/double-submit | P1 | High | verified | Double-click Đặt bàn | 2 request nhanh | ⚠️ASSUMED: không idempotency key → có thể tạo 2 phiếu. Đề xuất chặn. Ghi nhận | | |

### C.4 List / Get / Cancel

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CRES-029 | Reservation | List | P1 | High | verified, có phiếu | GET / | Bearer | 200, danh sách phiếu của chính customer kèm preorder items | | |
| TC-CRES-030 | Reservation | List/permission | P1 | High | Token A | GET / | A | Chỉ phiếu của A (listByCustomer) | | |
| TC-CRES-031 | Reservation | Get | P1 | High | Phiếu thuộc customer | GET /:id | Bearer | 200 chi tiết + preorder | | |
| TC-CRES-032 | Reservation | Get/IDOR | P1 | Critical | Phiếu của customer B | GET /:id (id của B) | A token | 404 "Không tìm thấy phiếu đặt bàn" (findByIdForCustomer lọc theo customerId) | | |
| TC-CRES-033 | Reservation | Get/404 | P2 | Medium | id không tồn tại | GET /:id | id lạ | 404 | | |
| TC-CRES-034 | Reservation | Get/type | P2 | Low | — | GET /:id = `abc` | non-numeric | 400/404 (không 500) | | |
| TC-CRES-035 | Reservation | Cancel | P1 | Critical | Phiếu PENDING của customer | DELETE /:id | Bearer | 200, status CANCELLED, hoàn cọc về ví (nếu có) | | |
| TC-CRES-036 | Reservation | Cancel/used | P1 | High | Phiếu CHECKED_IN | DELETE /:id | Bearer | 400 "Phiếu đã được sử dụng, không thể hủy" | | |
| TC-CRES-037 | Reservation | Cancel/completed | P1 | High | Phiếu COMPLETED | DELETE /:id | Bearer | 400 không thể hủy | | |
| TC-CRES-038 | Reservation | Cancel/idempotent | P2 | Medium | Phiếu đã CANCELLED | DELETE /:id lần nữa | Bearer | 200, trả nguyên trạng (không hoàn cọc lần 2) | | |
| TC-CRES-039 | Reservation | Cancel/permission | P1 | Critical | Phiếu của B | DELETE /:id | A token | 404 (không hủy được phiếu người khác) | | |
| TC-CRES-040 | Reservation | Cancel/verified | P1 | High | **chưa** verified email | DELETE /:id | Bearer | 403 (requireVerifiedEmail) | | |
| TC-CRES-041 | Reservation | Cancel/refund-race | P2 | High | Phiếu có cọc | Double-click Hủy | 2 request | ⚠️ASSUMED: cần đảm bảo hoàn cọc **1 lần** (không double refund). Kiểm tra, ghi nhận | | |
| TC-CRES-042 | Reservation | UI | P3 | Low | — | Xem list rỗng | — | Empty state "Chưa có đặt bàn"; loading state khi tải | | |

### C.5 API Error / Security (chung cho Reservation)

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CRES-043 | Reservation | 401 | P1 | High | — | Mọi endpoint không token | — | 401 | | |
| TC-CRES-044 | Reservation | 500 | P2 | High | DB down | POST / | — | 500 message chung, không lộ SQL | | |
| TC-CRES-045 | Reservation | SQLi | P1 | Critical | verified | note = `'); DROP TABLE reservations;--` | như bên | Parametrized, không thực thi | | |
| TC-CRES-046 | Reservation | XSS | P2 | Medium | verified | note chứa `<script>` | như bên | Lưu literal; internal hiển thị escape | | |
