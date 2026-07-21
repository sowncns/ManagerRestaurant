# Module 03 — Public Catalog, PayOS Payment, QR Payment

Roles internal (dùng xuyên suốt các file 03–06): **RECEPTIONIST, WAITER, CASHIER, BRANCH_MANAGER, COMPANY_ADMIN, SUPER_ADMIN**.

---

## PART A — Public API (không đăng nhập)
Base path: `/api/public`.
Endpoints: `POST /reservations` (guest), `GET /companies`, `GET /companies/:companyId`, `GET /companies/:companyId/branches`, `GET /branches/:branchId`, `GET /companies/:companyId/categories`, `GET /companies/:companyId/menu`, `GET /menu-items/:menuItemId`, `GET /home-banners`.
Repo chỉ trả bản ghi `status='ACTIVE'/'active'`.

### A.1 Catalog — Happy & Not Found

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-PUB-001 | Public | List companies | P1 | High | Có công ty ACTIVE | GET /companies | — | 200, chỉ công ty ACTIVE, sort theo name | | |
| TC-PUB-002 | Public | List companies | P2 | Medium | Không có công ty | GET /companies | — | 200, mảng rỗng | | |
| TC-PUB-003 | Public | Get company | P1 | High | Company ACTIVE tồn tại | GET /companies/:id | valid id | 200, kèm `branches` | | |
| TC-PUB-004 | Public | Get company | P1 | High | Company INACTIVE | GET /companies/:id | inactive id | 404 "Công ty không tồn tại" (lọc status) | | |
| TC-PUB-005 | Public | Get company | P2 | Medium | id không tồn tại | GET /companies/999999 | — | 404 | | |
| TC-PUB-006 | Public | Get company | P2 | Low | id không phải số | GET /companies/abc | — | 404/400, không 500 | | |
| TC-PUB-007 | Public | List branches | P1 | High | Company ACTIVE | GET /companies/:id/branches | — | 200, chi nhánh ACTIVE của công ty | | |
| TC-PUB-008 | Public | List branches | P2 | Medium | Company không tồn tại | GET /companies/:id/branches | — | 404 "Công ty không tồn tại" | | |
| TC-PUB-009 | Public | Get branch | P1 | High | Branch ACTIVE | GET /branches/:id | — | 200, kèm company_name | | |
| TC-PUB-010 | Public | Get branch | P2 | Medium | Branch INACTIVE | GET /branches/:id | — | 404 "Chi nhánh không tồn tại" | | |
| TC-PUB-011 | Public | Categories | P1 | High | Company ACTIVE | GET /companies/:id/categories | — | 200, danh mục `status='active'` | | |
| TC-PUB-012 | Public | Menu | P1 | High | Company có món | GET /companies/:id/menu | — | 200, món gom nhóm theo category, chỉ `status='active'` | | |
| TC-PUB-013 | Public | Menu | P2 | Medium | Company không có món active | GET /companies/:id/menu | — | 200, mảng rỗng | | |
| TC-PUB-014 | Public | Menu item | P1 | High | Món active | GET /menu-items/:id | — | 200, chi tiết món (price, vat, is_available) | | |
| TC-PUB-015 | Public | Menu item | P2 | Medium | Món inactive | GET /menu-items/:id | — | 404 "Món ăn không tồn tại" | | |
| TC-PUB-016 | Public | Home banners | P1 | Medium | Có banner | GET /home-banners | — | 200, banner sort theo type,sort_order,banner_id | | |
| TC-PUB-017 | Public | Home banners | P3 | Low | Không có banner | GET /home-banners | — | 200, mảng rỗng | | |

### A.2 Public — Security / Perf / Edge

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-PUB-018 | Public | Auth-not-required | P2 | Medium | — | Gọi mọi GET public không token | — | 200 (không yêu cầu đăng nhập) | | |
| TC-PUB-019 | Public | SQLi | P1 | Critical | — | GET /menu-items/`1 OR 1=1` | như bên | Parametrized, không leak toàn bộ bảng | | |
| TC-PUB-020 | Public | IDOR/cross-company | P2 | Medium | — | GET /companies/:A/menu với id A | — | Chỉ trả món của company A (không lẫn công ty khác) | | |
| TC-PUB-021 | Public | Perf | P3 | Medium | Menu 1000 món | GET /companies/:id/menu | — | ⚠️ASSUMED: không phân trang menu public → response time cần đo; cân nhắc cache/CDN | | |
| TC-PUB-022 | Public | Rate limit | P2 | Medium | — | Spam GET public | flood | ⚠️ASSUMED: public không có rate limit riêng → cân nhắc để chống scraping/DoS | | |
| TC-PUB-023 | Public | Cache | P3 | Low | — | Kiểm tra header cache | — | ⚠️ASSUMED: nên set Cache-Control cho catalog tĩnh | | |

### A.3 Guest Reservation `POST /public/reservations`
Schema `createGuestReservationSchema`: bắt buộc `customer_name`, `customer_phone`; `customer_email?`; **từ chối** `items`/`pin` (superRefine → "Vui lòng đăng nhập để đặt món trước"). Guest tạo phiếu PENDING, `customer_id=null`, không cọc.

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-PUB-024 | Public | Guest reservation | P1 | Critical | Chi nhánh ACTIVE mở cửa | POST /public/reservations | `{branch_id,date,time,guest_count:2,customer_name,customer_phone}` | 201 "Đặt bàn thành công...", phiếu PENDING customer_id=null | | |
| TC-PUB-025 | Public | Guest/validation | P1 | High | — | Thiếu customer_name | bỏ name | 400 "Vui lòng nhập tên khách hàng" | | |
| TC-PUB-026 | Public | Guest/validation | P1 | High | — | Thiếu customer_phone | bỏ phone | 400 "Vui lòng nhập số điện thoại" | | |
| TC-PUB-027 | Public | Guest/validation | P2 | Medium | — | customer_email sai format | `"abc"` | 400 "Email không hợp lệ" | | |
| TC-PUB-028 | Public | Guest/validation | P3 | Low | — | customer_email = "" | rỗng | 201 (schema cho phép rỗng) | | |
| TC-PUB-029 | Public | Guest/business | P1 | Critical | — | Gửi kèm `items:[...]` | có items | 400 "Vui lòng đăng nhập để đặt món trước" (superRefine) | | |
| TC-PUB-030 | Public | Guest/business | P1 | High | — | Gửi kèm `pin` | có pin | 400 "Vui lòng đăng nhập để đặt món trước" | | |
| TC-PUB-031 | Public | Guest/branch | P1 | High | branch không tồn tại/ngừng HĐ | POST | id lạ | 400 "Chi nhánh không tồn tại hoặc ngừng hoạt động" | | |
| TC-PUB-032 | Public | Guest/open-hours | P1 | High | mở 10:00–22:00 | time 09:00 | trước giờ | 400 "Chi nhánh chỉ nhận khách từ..." | | |
| TC-PUB-033 | Public | Guest/date | P2 | Medium | — | date `2026/07/20` sai format | như bên | 400 "Ngày không hợp lệ" | | |
| TC-PUB-034 | Public | Guest/past-date | P1 | High | — | date quá khứ | hôm qua | ⚠️ASSUMED: không chặn ngày quá khứ — đề xuất chặn | | |
| TC-PUB-035 | Public | Guest/phone-format | P2 | Medium | — | phone = "abc" | như bên | ⚠️ASSUMED: chỉ min 1, không regex SĐT → chấp nhận. Đề xuất validate | | |
| TC-PUB-036 | Public | Guest/XSS | P2 | Medium | — | customer_name `<script>` | như bên | Lưu literal; internal hiển thị escape | | |
| TC-PUB-037 | Public | Guest/SQLi | P1 | Critical | — | note SQLi | như bên | Parametrized | | |
| TC-PUB-038 | Public | Guest/spam | P2 | High | — | Spam đặt bàn khách vãng lai | flood cùng phone | ⚠️ASSUMED: không rate limit/limit theo phone → có thể spam phiếu ma. Đề xuất chống spam | | |
| TC-PUB-039 | Public | Guest/double-submit | P2 | Medium | — | Double-click | 2 request | Có thể tạo 2 phiếu → đề xuất chặn. Ghi nhận | | |

---

## PART B — PayOS Wallet Top-up & Invoice Webhook
Base path nạp ví: `POST /api/customer/payment/create` (requireAuth + requireVerifiedEmail + requirePaymentPin).
Webhook: `POST /api/webhook` (public, không auth) — **luôn trả 200** để PayOS không retry.
Schema `createLinkSchema`: `amount` int>0, `description?`, `returnUrl?` url, `cancelUrl?` url.

### B.1 Create top-up link

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-PAY-001 | Payment | Create link | P1 | Critical | verified + có PIN, ví ACTIVE | POST /payment/create | `{amount:100000}` | 200, trả `checkoutUrl,qrCode,paymentLinkId,orderCode`; tạo topup PENDING | | |
| TC-PAY-002 | Payment | Create/permission | P1 | High | Chưa có PIN | POST /payment/create | Bearer | 403 (requirePaymentPin) | | |
| TC-PAY-003 | Payment | Create/permission | P1 | High | Chưa verified email | POST /payment/create | Bearer | 403 (requireVerifiedEmail) | | |
| TC-PAY-004 | Payment | Create/permission | P1 | High | Chưa đăng nhập | POST /payment/create | — | 401 | | |
| TC-PAY-005 | Payment | Create/validation | P1 | High | verified+PIN | amount = 0 | `{amount:0}` | 400 "Số tiền nạp phải là số nguyên dương" | | |
| TC-PAY-006 | Payment | Create/validation | P1 | High | verified+PIN | amount = -100 | âm | 400 | | |
| TC-PAY-007 | Payment | Create/validation | P2 | Medium | verified+PIN | amount = 1.5 | thập phân | 400 (int) | | |
| TC-PAY-008 | Payment | Create/boundary | P2 | Medium | verified+PIN | amount vượt `MAX_SAFE_INTEGER` | rất lớn | 400 "phải là số nguyên dương" (Number.isSafeInteger fail) | | |
| TC-PAY-009 | Payment | Create/validation | P2 | Low | verified+PIN | returnUrl không phải URL | `"abc"` | 400 (url) | | |
| TC-PAY-010 | Payment | Create/wallet | P1 | High | Ví không tồn tại | POST /payment/create | — | 404 "Không tìm thấy ví khách hàng" | | |
| TC-PAY-011 | Payment | Create/wallet | P1 | High | Ví status != ACTIVE | POST /payment/create | — | 409 "Ví khách hàng không hoạt động" | | |
| TC-PAY-012 | Payment | Create/payos-config | P2 | High | Thiếu ENV PayOS | POST /payment/create | — | 500 "Thiếu cấu hình PayOS..." | | |
| TC-PAY-013 | Payment | Create/payos-fail | P2 | High | PayOS API lỗi | POST /payment/create | — | topup bị đánh dấu FAILED (failPendingTopup); 500 "Tạo link thanh toán thất bại" | | |
| TC-PAY-014 | Payment | Create/desc | P3 | Low | verified+PIN | description > 25 ký tự | dài | Description bị cắt còn 25 ký tự (PayOS limit) | | |

### B.2 Webhook — Top-up settlement (idempotent)

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-PAY-015 | Payment | Webhook topup | P1 | Critical | Có topup PENDING khớp orderCode | POST /webhook success đúng amount | valid signed body | 200; cộng số dư ví, topup=SUCCESS, ghi giao dịch TOPUP | | |
| TC-PAY-016 | Payment | Webhook/idempotent | P1 | Critical | topup đã SUCCESS | Gửi lại webhook cùng orderCode | duplicate | 200 `{status:SUCCESS, duplicated:true}`; **không** cộng tiền lần 2 | | |
| TC-PAY-017 | Payment | Webhook/signature | P1 | Critical | — | Webhook chữ ký sai/giả | tampered | 200 `{code:"01"}` nhưng **không** xử lý (verifyPaymentWebhookData ném lỗi) — không cộng tiền | | |
| TC-PAY-018 | Payment | Webhook/amount-mismatch | P1 | Critical | topup 100k, webhook báo 50k | POST /webhook | mismatch | Không cộng tiền; lỗi "Số tiền PayOS không khớp giao dịch nạp tiền" (200 wrapper) | | |
| TC-PAY-019 | Payment | Webhook/fail | P2 | High | topup PENDING, webhook báo fail | POST /webhook code!=00 | fail | topup=FAILED, không cộng tiền | | |
| TC-PAY-020 | Payment | Webhook/wallet-inactive | P2 | High | Ví bị khóa giữa chừng | webhook success | — | Conflict "Ví nhận tiền không hoạt động", rollback, không cộng tiền | | |
| TC-PAY-021 | Payment | Webhook/concurrent | P1 | Critical | 1 topup | 2 webhook cùng orderCode **đồng thời** | song song | lockTopupByOrderCode (FOR UPDATE) → chỉ 1 cộng tiền | | |
| TC-PAY-022 | Payment | Webhook/rollback | P2 | High | Lỗi giữa transaction | mô phỏng lỗi DB | — | ROLLBACK: số dư & topup không đổi | | |
| TC-PAY-023 | Payment | Webhook/always-200 | P1 | High | body rác | POST /webhook `{}` | invalid | HTTP 200 (wrapper) với code "01" — PayOS không retry vô hạn | | |

### B.3 Webhook — Invoice settlement (chuyển khoản hóa đơn)

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-PAY-024 | Payment | Webhook invoice | P1 | Critical | orderCode không phải topup, là invoice_payment PENDING | POST /webhook success đúng amount | valid | Invoice=PAID, applyCashback, completeOrders, bàn→SERVING, invoice_payment=SUCCESS; clear Redis voucher/intent | | |
| TC-PAY-025 | Payment | Webhook invoice/idempotent | P1 | Critical | invoice_payment đã SUCCESS | webhook lại | duplicate | `{status:SUCCESS,duplicated:true}`, không xử lý lại | | |
| TC-PAY-026 | Payment | Webhook invoice/amount | P1 | High | amount không khớp | webhook | mismatch | "Số tiền PayOS không khớp hóa đơn", rollback | | |
| TC-PAY-027 | Payment | Webhook invoice/points | P2 | Medium | Invoice có customer_id | webhook success | — | Cộng điểm theo `invoice.amount` sau commit (lỗi cộng điểm không rollback thanh toán) | | |
| TC-PAY-028 | Payment | Webhook invoice/not-found | P2 | Medium | orderCode lạ (không topup, không invoice) | webhook | — | `{status:IGNORED,reason:PAYMENT_NOT_FOUND}` | | |

---

## PART C — QR Payment (nhân viên gửi yêu cầu → khách xác nhận / khách sinh QR)
Customer base: `/api/customer/qr-payment` (requireAuth). Internal base: `/api/internal/qr-payment` (requireAuth + role staff).
Redis TTL: request 120s, PENDING 120s, payment-token 60s, scan-token 120s. Đều dùng 1 lần.

### C.1 Nhân viên gửi yêu cầu `POST /internal/qr-payment/request`
Schema `requestSchema`: `customerId` (string|number), `amount` >0, `tableId` int>0, `invoiceId?`.

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-QR-001 | QR Pay | Request | P1 | Critical | Staff đăng nhập, khách tồn tại | POST /request | `{customerId,amount,tableId,invoiceId}` | 200, trả requestId; push SSE `pending:<cid>`; Redis set TTL 120s | | |
| TC-QR-002 | QR Pay | Request/token | P1 | Critical | Khách đã sinh payment token PAY-... | POST /request customerId=`PAY-...` | token | Trừ tiền **ngay** (settle), xóa token, trả fakeRequestId SUCCESS | | |
| TC-QR-003 | QR Pay | Request/token-expired | P1 | High | Token PAY-... hết hạn (>60s) | POST /request | expired | 400 "Mã thanh toán không hợp lệ hoặc đã hết hạn" | | |
| TC-QR-004 | QR Pay | Request/token-reuse | P1 | Critical | Token PAY-... đã dùng | POST /request lại | reuse | 400 (token đã xóa sau lần dùng) — không trừ tiền 2 lần | | |
| TC-QR-005 | QR Pay | Request/customer | P1 | High | customerId/phone không tồn tại | POST /request | id lạ | 400 "Không tìm thấy khách hàng này trong hệ thống" | | |
| TC-QR-006 | QR Pay | Request/validation | P1 | High | Staff | amount = 0 | `amount:0` | 400 "Số tiền phải > 0" | | |
| TC-QR-007 | QR Pay | Request/validation | P1 | High | Staff | thiếu tableId | bỏ | 400 "Thiếu bàn" | | |
| TC-QR-008 | QR Pay | Request/permission | P1 | Critical | Token customer (không phải staff) | POST /internal/qr-payment/request | customer token | 403 (authorize staff roles) | | |
| TC-QR-009 | QR Pay | Request/permission | P1 | High | Chưa đăng nhập | POST /request | — | 401 | | |
| TC-QR-010 | QR Pay | Request/token-settle-insufficient | P1 | Critical | Token PAY-..., số dư < amount | POST /request | — | 400 "Số dư trong ví không đủ..."; rollback, không trừ | | |

### C.2 Khách xác nhận `POST /customer/qr-payment/confirm`
Schema `confirmSchema`: `requestId` min1, `action` ACCEPT|REJECT, `pin?`.

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-QR-011 | QR Pay | Confirm ACCEPT | P1 | Critical | Có request PENDING của mình, đủ số dư, PIN đúng | POST /confirm ACCEPT + pin | `{requestId,action:"ACCEPT",pin}` | 200 "Thanh toán thành công"; trừ ví, invoice PAID, cashback, cộng điểm; xóa PENDING | | |
| TC-QR-012 | QR Pay | Confirm REJECT | P1 | High | request PENDING | POST /confirm REJECT | `{requestId,action:"REJECT"}` | 200 "Đã hủy yêu cầu thanh toán"; status REJECTED, không trừ tiền | | |
| TC-QR-013 | QR Pay | Confirm/pin-missing | P1 | High | request PENDING | ACCEPT không pin | thiếu pin | 400 "Vui lòng nhập mã PIN" | | |
| TC-QR-014 | QR Pay | Confirm/pin-wrong | P1 | Critical | request PENDING | ACCEPT sai PIN | pin sai | 400 "Mã PIN sai..." (verifyPaymentPin); không trừ tiền; tăng attempts | | |
| TC-QR-015 | QR Pay | Confirm/pin-lock | P1 | Critical | Đã sai PIN 5 lần | ACCEPT | — | 403 khóa 1 giờ; không trừ tiền | | |
| TC-QR-016 | QR Pay | Confirm/insufficient | P1 | Critical | request PENDING, số dư không đủ | ACCEPT + PIN đúng | — | 400 "Số dư trong ví không đủ..."; rollback | | |
| TC-QR-017 | QR Pay | Confirm/IDOR | P1 | Critical | request của khách B | Khách A POST /confirm requestId của B | A token | 400 "Yêu cầu thanh toán không thuộc về bạn" | | |
| TC-QR-018 | QR Pay | Confirm/expired | P1 | High | request hết hạn (>120s) | POST /confirm | expired | 404 "Yêu cầu thanh toán không tồn tại hoặc đã hết hạn" | | |
| TC-QR-019 | QR Pay | Confirm/double | P1 | Critical | request đã SUCCESS | POST /confirm lại | duplicate | 400 "Yêu cầu này đã được xử lý" — không trừ 2 lần | | |
| TC-QR-020 | QR Pay | Confirm/race | P1 | Critical | 1 request PENDING | 2 lần ACCEPT **đồng thời** | song song | ⚠️ASSUMED: lockWallet bảo vệ số dư, nhưng check `status!=PENDING` ở Redis không atomic với settle → rủi ro double-charge. Kiểm tra kỹ, ghi nhận | | |
| TC-QR-021 | QR Pay | Confirm/validation | P2 | Medium | — | action = "MAYBE" | invalid | 400 "action phải là ACCEPT hoặc REJECT" | | |
| TC-QR-022 | QR Pay | Confirm/permission | P1 | High | Chưa verified/PIN | POST /confirm | — | 403 (requireVerifiedEmail + requirePaymentPin) | | |

### C.3 Payment token / Scan token / Pending / SSE / Invoice history

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-QR-023 | QR Pay | Gen payment token | P1 | High | verified+PIN | POST /generate-token | Bearer | 200, token `PAY-<uuid>`, expiresIn 60; Redis TTL 60s | | |
| TC-QR-024 | QR Pay | Gen scan token voucher | P1 | High | Khách có voucher unused | POST /scan-token kind=voucher | `{kind:"voucher",customerVoucherId}` | 200, token QRS-... TTL 120s, payload có voucherCode | | |
| TC-QR-025 | QR Pay | Gen scan token/voucher-invalid | P1 | High | Voucher đã dùng/không của mình | POST /scan-token | id lạ | 400 "Voucher không hợp lệ, không thuộc về bạn hoặc đã được sử dụng" | | |
| TC-QR-026 | QR Pay | Gen scan token/validation | P2 | Medium | — | kind=voucher thiếu customerVoucherId | bỏ | 400 "Thiếu customerVoucherId cho mã voucher" (refine) | | |
| TC-QR-027 | QR Pay | Gen scan token member | P2 | Medium | Đăng nhập | POST /scan-token kind=member | `{kind:"member"}` | 200, token type MEMBER (không cần voucher) | | |
| TC-QR-028 | QR Pay | Scan token/one-time | P1 | High | Nhân viên quét token 1 lần | resolveScanToken | valid | Trả payload rồi **xóa** token; quét lần 2 → 404 hết hạn | | |
| TC-QR-029 | QR Pay | Get pending | P1 | High | Có request PENDING | GET /pending | Bearer+PIN | 200 `{hasPending:true, amount, items,...}` | | |
| TC-QR-030 | QR Pay | Get pending | P2 | Medium | Không có request | GET /pending | Bearer+PIN | 200 `{hasPending:false}` | | |
| TC-QR-031 | QR Pay | Get pending/permission | P1 | High | Chưa có PIN | GET /pending | Bearer | 403 (requirePaymentPin) | | |
| TC-QR-032 | QR Pay | SSE stream | P2 | High | Có PIN | GET /stream | Bearer+PIN | Kết nối SSE mở; nhận `event: pending` khi staff gửi; heartbeat 25s | | |
| TC-QR-033 | QR Pay | SSE/reconnect | P3 | Medium | Đang có pending | Reconnect /stream | — | Gửi ngay trạng thái hiện tại (bao phủ reconnect) | | |
| TC-QR-034 | QR Pay | SSE/close | P3 | Low | Đang stream | Client đóng kết nối | — | Server cleanup listener + interval (không leak) | | |
| TC-QR-035 | QR Pay | Invoice history | P1 | High | Có hóa đơn | GET /invoices | Bearer+PIN | 200, lịch sử hóa đơn của chính khách | | |
| TC-QR-036 | QR Pay | Invoice detail/IDOR | P1 | Critical | Hóa đơn của khách B | GET /invoices/:id (của B) | A token | 404 "Không tìm thấy hóa đơn" (repo lọc theo customerId) | | |
| TC-QR-037 | QR Pay | Cancel (staff) | P2 | Medium | request PENDING | POST /internal/qr-payment/cancel | `{requestId}` | 200; status REJECTED, xóa PENDING của khách | | |
| TC-QR-038 | QR Pay | Status (staff) | P2 | Medium | request tồn tại | GET /internal/qr-payment/status/:id | — | 200, trạng thái hiện tại; hết hạn → 404 | | |
| TC-QR-039 | QR Pay | Perf/SSE | P3 | Medium | 1000 khách stream đồng thời | load | — | ⚠️ASSUMED: EventEmitter maxListeners=0; đo memory/connection limit. Ghi nhận | | |
| TC-QR-040 | QR Pay | Redis-down | P2 | High | Redis mất kết nối | GET /pending, POST /confirm | — | Xử lý lỗi rõ ràng (không 500 lộ stack); pending là source-of-truth ở Redis → tính sẵn sàng phụ thuộc Redis | | |
