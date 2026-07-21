# Module 04 — Internal Core (Auth, Tables, Order, Checkout, Reservation)

Role model (`role.middleware.authorize`): SUPER_ADMIN, COMPANY_ADMIN, BRANCH_MANAGER, RECEPTIONIST, WAITER, KITCHEN, CASHIER. Scope theo `company_id` + `branch_id` (`buildScopedBranchWhere`, `assertBranchScope`): SUPER_ADMIN mọi chi nhánh; COMPANY_ADMIN trong công ty (phải chọn branch); BRANCH_MANAGER/RECEPTIONIST/WAITER khóa theo chi nhánh của mình.

---

## PART A — Internal Auth
Base `/api/internal/auth`: `POST /login` (authLimiter), `POST /refresh-token`, `POST /logout`.

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-IAUTH-001 | Internal Auth | Login | P1 | Critical | Nhân viên active | POST /login đúng | `{email,password}` | 200, accessToken/refreshToken có `type` internal + role + company_id + branch_id | | |
| TC-IAUTH-002 | Internal Auth | Login | P1 | Critical | — | Sai mật khẩu | sai | 400 thông báo chung (không lộ user/pass) | | |
| TC-IAUTH-003 | Internal Auth | Login | P1 | High | Nhân viên bị khóa/nghỉ việc | POST /login | valid | 403 tài khoản bị khóa | | |
| TC-IAUTH-004 | Internal Auth | Login/429 | P1 | High | authLimiter | Spam login sai | flood | 429 sau ngưỡng | | |
| TC-IAUTH-005 | Internal Auth | Login/validation | P2 | Medium | — | Email sai format | `"abc"` | 400 | | |
| TC-IAUTH-006 | Internal Auth | Refresh | P1 | High | Token internal hợp lệ | POST /refresh-token | valid | 200 cấp token mới | | |
| TC-IAUTH-007 | Internal Auth | Refresh/type | P1 | Critical | Token **customer** | POST /internal/auth/refresh-token | customer token | 403 sai loại tài khoản (không cho customer mượn quyền internal) | | |
| TC-IAUTH-008 | Internal Auth | Refresh | P2 | High | Nhân viên bị khóa sau khi cấp token | Refresh | valid | 403 tài khoản bị khóa | | |
| TC-IAUTH-009 | Internal Auth | JWT/tamper | P1 | Critical | — | Sửa role trong token thành SUPER_ADMIN | tampered | 401 (chữ ký sai) — không leo thang quyền | | |
| TC-IAUTH-010 | Internal Auth | Logout | P3 | Low | Đã login | POST /logout | — | 200 | | |
| TC-IAUTH-011 | Internal Auth | audit | P2 | Medium | autoAuditMiddleware bật trên /internal | Gọi endpoint internal | — | Ghi audit log hành động (kiểm tra module Audit) | | |

---

## PART B — Tables & Sections
Base `/api/internal/dining-tables`. `staffOnly` = mọi role; `managerOnly` = SUPER/COMPANY/BRANCH_MANAGER. Xóa section/table chỉ managerOnly.

### B.1 Sections / Tables — Happy & Permission

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-TBL-001 | Tables | List sections | P1 | High | Staff đăng nhập | GET /sections | Bearer | 200, khu vực trong chi nhánh của mình | | |
| TC-TBL-002 | Tables | Create section | P1 | High | Manager | POST /sections | `{name,...}` | 201 tạo khu vực | | |
| TC-TBL-003 | Tables | Create section/permission | P1 | High | WAITER | POST /sections | Bearer | 403 (managerOnly) | | |
| TC-TBL-004 | Tables | Delete section/permission | P1 | High | WAITER | DELETE /sections/:id | Bearer | 403 | | |
| TC-TBL-005 | Tables | Delete section/FK | P1 | High | Section còn bàn | DELETE /sections/:id | Bearer | ⚠️ASSUMED: FK ràng buộc → 409/400 không cho xóa khi còn bàn, hoặc soft-delete. Kiểm tra hành vi | | |
| TC-TBL-006 | Tables | List tables | P1 | High | Staff | GET /tables | Bearer | 200, bàn trong chi nhánh | | |
| TC-TBL-007 | Tables | Create table | P1 | High | Staff | POST /tables | `{name,capacity,section_id}` | 201 | | |
| TC-TBL-008 | Tables | Create table/validation | P2 | Medium | Staff | capacity = 0 / âm | `capacity:0` | 400 (số chỗ > 0) | | |
| TC-TBL-009 | Tables | Update table | P2 | Medium | Staff | PUT /tables/:id | valid | 200 | | |
| TC-TBL-010 | Tables | Change status | P1 | High | Staff | PATCH /tables/:id/status | `{status:"SERVING"}` | 200; chỉ status hợp lệ (EMPTY/SERVING/WAIT_PAYMENT/RESERVED...) | | |
| TC-TBL-011 | Tables | Change status/invalid | P2 | Medium | Staff | status = "FLYING" | invalid | 400 | | |
| TC-TBL-012 | Tables | Delete table | P1 | High | Manager | DELETE /tables/:id | — | 200/204 | | |
| TC-TBL-013 | Tables | Delete table/in-use | P1 | Critical | Bàn đang SERVING | DELETE /tables/:id | — | ⚠️ASSUMED: nên chặn xóa bàn đang có khách. Kiểm tra, ghi nhận | | |
| TC-TBL-014 | Tables | Scope/IDOR | P1 | Critical | Manager chi nhánh A | GET/PUT bàn của chi nhánh B | id B | 403/404 (assertBranchScope) — không thao tác chi nhánh khác | | |
| TC-TBL-015 | Tables | 404 | P2 | Low | Staff | GET /tables/999999 | — | 404 | | |
| TC-TBL-016 | Tables | Concurrency | P2 | High | 2 nhân viên đổi status cùng bàn | đồng thời | — | Không lẫn trạng thái; state cuối nhất quán (kiểm tra lock) | | |
| TC-TBL-017 | Tables | UI FloorMap | P3 | Low | — | Xem FloorMapPage | — | Màu theo status; responsive; realtime cập nhật | | |

---

## PART C — Order & Kitchen
Base `/api/internal/orders`. Roles: canWrite=WAITER/RECEPTIONIST/managers; canRead=+KITCHEN/CASHIER; canCook=KITCHEN/WAITER/managers; canPreorder=KITCHEN/managers (không WAITER).
Schema: `createOrderSchema` (table_id int>0, order_items[]), `addItemsSchema` (items min 1), `scanItemQrSchema` (qrCode min1).

### C.1 Create / Add items — Happy & Validation

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-ORD-001 | Order | Create | P1 | Critical | WAITER, bàn hợp lệ | POST / | `{table_id,order_items:[{menu_item_id,quantity:2}]}` | 201, tạo order, bàn → SERVING | | |
| TC-ORD-002 | Order | Create/empty | P2 | Medium | WAITER | POST / không món | `{table_id}` | 201 order rỗng (order_items default []) — kiểm tra hành vi mong muốn | | |
| TC-ORD-003 | Order | Create/validation | P1 | High | WAITER | thiếu table_id | bỏ | 400 "Thiếu bàn" | | |
| TC-ORD-004 | Order | Create/validation | P1 | High | WAITER | quantity = 0 | `quantity:0` | 400 "Số lượng phải > 0" | | |
| TC-ORD-005 | Order | Create/validation | P2 | Medium | WAITER | menu_item_id không tồn tại | id lạ | 400 (món không hợp lệ) | | |
| TC-ORD-006 | Order | Create/permission | P1 | High | KITCHEN (không canWrite) | POST / | Bearer | 403 | | |
| TC-ORD-007 | Order | Create/scope | P1 | Critical | WAITER chi nhánh A | POST / table của B | table B | 403/400 (bàn không thuộc chi nhánh) | | |
| TC-ORD-008 | Order | Add items | P1 | High | Order đang mở | PUT /:id/items | `{items:[...]}` | 200, thêm món, cập nhật tổng | | |
| TC-ORD-009 | Order | Add items/empty | P2 | Medium | — | PUT /:id/items items rỗng | `{items:[]}` | 400 "Phải có ít nhất 1 món" | | |
| TC-ORD-010 | Order | Add items/closed | P1 | High | Order đã COMPLETED | PUT /:id/items | — | 400 (không thêm món vào đơn đã đóng) | | |
| TC-ORD-011 | Order | Create/boundary | P2 | Medium | WAITER | quantity cực lớn 999999 | như bên | ⚠️ASSUMED: không max → đề xuất giới hạn; kiểm tra tồn kho | | |
| TC-ORD-012 | Order | Create/double | P1 | High | WAITER | Double-click gửi order | 2 request | ⚠️ASSUMED: có thể tạo 2 order/nhân đôi món. Đề xuất idempotency. Ghi nhận | | |
| TC-ORD-013 | Order | Create/SQLi | P1 | Critical | WAITER | note SQLi | như bên | Parametrized | | |

### C.2 Kitchen flow (cook / status / scan / preorder)

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-ORD-014 | Order | Kitchen queue | P1 | High | KITCHEN | GET /kitchen/queue | Bearer | 200, hàng đợi món chi nhánh | | |
| TC-ORD-015 | Order | Kitchen SSE | P2 | High | KITCHEN | GET /kitchen/stream | Bearer | SSE push món mới thay polling; heartbeat | | |
| TC-ORD-016 | Order | Start cooking | P1 | Critical | KITCHEN, order có món | POST /:id/cook | — | Món → COOKING, **trừ kho** nguyên liệu | | |
| TC-ORD-017 | Order | Start cooking/stock | P1 | Critical | Nguyên liệu không đủ | POST /:id/cook | — | ⚠️ASSUMED: báo lỗi thiếu kho hoặc cho âm? Kiểm tra business rule tồn kho | | |
| TC-ORD-018 | Order | Start cooking/double | P1 | High | Đã cook | POST /:id/cook lại | — | Không trừ kho 2 lần (idempotent theo trạng thái) | | |
| TC-ORD-019 | Order | Item kitchen status | P1 | High | KITCHEN | PATCH /items/:itemId/kitchen-status | `{status:"READY"}` | 200, chuyển đúng WAITING→COOKING→READY→SERVED | | |
| TC-ORD-020 | Order | Item status/invalid | P2 | Medium | KITCHEN | status = "BURNT" | invalid | 400 | | |
| TC-ORD-021 | Order | Scan item QR | P1 | High | KITCHEN, phiếu món hợp lệ | POST /kitchen/scan | `{qrCode}` | Món → READY + trừ kho; QR hợp lệ | | |
| TC-ORD-022 | Order | Scan item QR/invalid | P2 | Medium | KITCHEN | qrCode sai/hết hạn | invalid | 400/404 | | |
| TC-ORD-023 | Order | Scan item QR/reuse | P1 | High | Đã quét 1 lần | Quét lại cùng QR | reuse | Không trừ kho 2 lần | | |
| TC-ORD-024 | Order | Preorder list | P1 | High | KITCHEN | GET /kitchen/preorders | Bearer | 200, đơn SCHEDULED đã gán bàn | | |
| TC-ORD-025 | Order | Preorder permission | P1 | High | WAITER (không canPreorder) | GET /kitchen/preorders | Bearer | 403 | | |
| TC-ORD-026 | Order | Confirm preorder | P1 | Critical | KITCHEN | POST /kitchen/preorders/:rid/confirm | — | Đơn SCHEDULED→CONFIRMED (bếp nấu) | | |
| TC-ORD-027 | Order | Cancel preorder | P1 | Critical | KITCHEN, có cọc | POST /kitchen/preorders/:rid/cancel | — | Hủy đơn + **hoàn cọc** về ví khách | | |
| TC-ORD-028 | Order | Preorder reschedule alert | P2 | Medium | Phiếu đặt đã đổi ngày/giờ (rescheduled_at) | GET /kitchen/preorders | — | Hiển thị cảnh báo đổi lịch (migration 023) | | |
| TC-ORD-029 | Order | Cancel-request | P1 | High | WAITER, món đã gửi bếp | POST /:oid/items/:oiid/cancel-request | `{reason}` | Tạo yêu cầu hủy, bếp quyết định (module Cancel) | | |

### C.3 Order — Get / Scope / Error

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-ORD-030 | Order | Get | P2 | Medium | canRead | GET /:id | valid | 200 chi tiết đơn | | |
| TC-ORD-031 | Order | Get/scope | P1 | Critical | Chi nhánh A xem đơn B | GET /:id (B) | A token | 403/404 | | |
| TC-ORD-032 | Order | Active order for table | P1 | High | canRead | GET /table/:tableId/active | — | 200 đơn đang mở của bàn | | |
| TC-ORD-033 | Order | 401 | P1 | High | — | Mọi endpoint không token | — | 401 | | |
| TC-ORD-034 | Order | Perf | P3 | Medium | Giờ cao điểm 500 order/phút | load | — | Kitchen queue/SSE không nghẽn; response time chấp nhận | | |

---

## PART D — Checkout (module phức tạp nhất)
Base `/api/internal/checkout`. `cashierUp`=CASHIER/BRANCH_MANAGER/COMPANY_ADMIN/SUPER_ADMIN; `staffUp`=+WAITER.
`createInvoiceSchema`: tableId int>0, paymentMethod CASH|TRANSFER|APP, customerId?. (DEBT xử lý trong service, chỉ cashier/manager).

### D.1 Create Invoice — Happy per method

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CHK-001 | Checkout | Create/CASH | P1 | Critical | CASHIER, bàn SERVING có món | POST /create-invoice CASH | `{tableId,paymentMethod:"CASH"}` | 200 "Thanh toán thành công. Bàn đã đóng"; invoice PAID; applyCashback; bàn→SERVING(reset); cộng điểm nếu có khách | | |
| TC-CHK-002 | Checkout | Create/TRANSFER | P1 | Critical | CASHIER | POST /create-invoice TRANSFER | `{tableId,paymentMethod:"TRANSFER"}` | 200 trả intent (qrCode/checkoutUrl); invoice UNPAID; bàn→WAIT_PAYMENT; invoice_payment PENDING; Redis intent TTL 600s | | |
| TC-CHK-003 | Checkout | Create/APP | P1 | Critical | CASHIER, đã gán khách (scan member) | POST /create-invoice APP | `{tableId,paymentMethod:"APP",customerId}` | 200, push yêu cầu QR tới app khách; bàn→WAIT_PAYMENT; intent TTL 300s | | |
| TC-CHK-004 | Checkout | Create/APP-no-customer | P1 | High | CASHIER, chưa gán khách | POST /create-invoice APP | không customer | 400 "Chưa có thông tin khách hàng...quét mã thẻ thành viên..." | | |
| TC-CHK-005 | Checkout | Create/DEBT | P1 | High | CASHIER/Manager | POST create-invoice DEBT | `paymentMethod:"DEBT"` | 200 "Đã lưu công nợ"; invoice UNPAID; bàn→SERVING | | |
| TC-CHK-006 | Checkout | Create/DEBT-permission | P1 | Critical | WAITER (nếu tới được service) | DEBT | Bearer | 400 "Chỉ Thu ngân hoặc Quản lý mới được phép Ghi nợ" | | |

### D.2 Create Invoice — Business Rule (voucher, deposit, cashback)

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CHK-007 | Checkout | Voucher applied | P1 | Critical | Bàn đã áp voucher (Redis table_voucher) | POST /create-invoice CASH | — | Tổng tiền trừ discountAmount (không âm, Math.max 0); markCustomerVoucherUsed | | |
| TC-CHK-008 | Checkout | Deposit applied | P1 | Critical | Bàn gắn phiếu đặt có cọc HELD | POST /create-invoice | — | Trừ cọc vào tổng phải trả (`Math.min(deposit,total)`); markDepositApplied | | |
| TC-CHK-009 | Checkout | Deposit excess refund | P1 | High | Cọc > hóa đơn | POST /create-invoice | — | Hoàn phần thừa (`deposit-applied`) về ví khách | | |
| TC-CHK-010 | Checkout | No items | P1 | High | Bàn chưa có món | POST /create-invoice | — | 400 "Bàn chưa có món nào để thanh toán" | | |
| TC-CHK-011 | Checkout | Table status | P1 | High | Bàn EMPTY | POST /create-invoice | — | 400 "Bàn không ở trạng thái phục vụ" | | |
| TC-CHK-012 | Checkout | Table not found | P2 | Medium | tableId lạ | POST /create-invoice | — | 404 "Không tìm thấy bàn" | | |
| TC-CHK-013 | Checkout | Cashback rank | P1 | High | Khách hạng gold, CASH | POST /create-invoice | — | applyCashback đúng tỷ lệ theo hạng (module Cashback) | | |
| TC-CHK-014 | Checkout | Points after pay | P2 | Medium | CASH có khách | POST /create-invoice | — | Cộng điểm theo totalAmount (sau commit, lỗi cộng điểm không rollback bill) | | |
| TC-CHK-015 | Checkout | TRANSFER payos-fail | P1 | High | PayOS lỗi khi tạo link | POST /create-invoice TRANSFER | — | ⚠️Lưu ý: invoice đã COMMIT rồi mới tạo link → nếu link fail ném 400 nhưng invoice UNPAID vẫn tồn tại. Kiểm tra tính nhất quán, ghi nhận | | |
| TC-CHK-016 | Checkout | Concurrency | P1 | Critical | 1 bàn | 2 request create-invoice **đồng thời** | song song | lockTable (FOR UPDATE) → chỉ 1 tạo được hóa đơn; cái kia thấy bàn đã đổi trạng thái | | |
| TC-CHK-017 | Checkout | Rollback | P2 | High | Lỗi giữa transaction | mô phỏng | — | ROLLBACK: không tạo invoice/không trừ cọc/không mark voucher | | |
| TC-CHK-018 | Checkout | Voucher double-spend | P1 | Critical | Cùng voucher, 2 bàn | Áp + thanh toán đồng thời | — | Voucher chỉ dùng 1 lần (markCustomerVoucherUsed + trạng thái) | | |

### D.3 Validate Voucher / Scan QR
`validateVoucherSchema`: code min1, orderTotal ≥0, tableId?, customerRef?.

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CHK-019 | Checkout | Validate voucher/redeem-code | P1 | Critical | Voucher redeem_code hợp lệ, khách sở hữu | POST /validate-voucher | `{code:"K7P2QX9M",orderTotal}` | 200, discountAmount đúng; lưu Redis table_voucher | | |
| TC-CHK-020 | Checkout | Validate/QR-format | P1 | High | code dạng `12-WELCOME50` | POST /validate-voucher | như bên | Parse customerId=12, code=WELCOME50; validate | | |
| TC-CHK-021 | Checkout | Validate/manual-ref | P2 | Medium | Nhập tay SĐT khách | POST /validate-voucher customerRef | `{code,customerRef:"09xx"}` | resolveCustomerRef theo SĐT/ID; áp voucher của khách đó | | |
| TC-CHK-022 | Checkout | Validate/invalid-code | P1 | High | code sai | POST /validate-voucher | `code:"XXXX"` | 400 "Mã voucher không hợp lệ hoặc đã được sử dụng" | | |
| TC-CHK-023 | Checkout | Validate/no-customer | P1 | High | Không xác định được khách | POST /validate-voucher | code template không kèm khách | 400 "Vui lòng quét QR khách hàng sở hữu voucher..." | | |
| TC-CHK-024 | Checkout | Validate/not-owned | P1 | High | Khách không sở hữu voucher | POST /validate-voucher | mismatch | 400 "Khách không sở hữu voucher này hoặc voucher đã được sử dụng" | | |
| TC-CHK-025 | Checkout | Voucher/min-order | P1 | High | min_order_amount 200k, orderTotal 150k | POST /validate-voucher | như bên | 400 "Đơn hàng tối thiểu để áp dụng là 200.000đ" | | |
| TC-CHK-026 | Checkout | Voucher/min-order boundary | P2 | Medium | min 200k, orderTotal đúng 200k | POST /validate-voucher | 200000 | 200 (điều kiện `>` nên bằng vẫn áp được) | | |
| TC-CHK-027 | Checkout | Voucher/percent-cap | P1 | High | percent 50%, max_discount 100k, total 500k | POST /validate-voucher | như bên | discountAmount = min(250k, 100k) = 100k (cap) | | |
| TC-CHK-028 | Checkout | Voucher/fixed | P2 | Medium | fixed 50k | POST /validate-voucher | như bên | discountAmount = 50k | | |
| TC-CHK-029 | Checkout | Voucher/expired | P1 | High | Voucher hết hạn | POST /validate-voucher | expired | 400 "không có hiệu lực hoặc đã hết hạn" | | |
| TC-CHK-030 | Checkout | Voucher/customer-not-found | P2 | Medium | customerRef không tồn tại | POST /validate-voucher | ref lạ | 404 "Không tìm thấy khách hàng với ID hoặc SĐT này" | | |
| TC-CHK-031 | Checkout | Scan QR member | P1 | High | Token QRS-... type MEMBER | POST /scan | `{tableId,token}` | 200 type MEMBER, gán khách vào bàn (tích điểm sau) | | |
| TC-CHK-032 | Checkout | Scan QR voucher | P1 | High | Token QRS-... type VOUCHER | POST /scan | như bên | 200 type VOUCHER, áp voucher + trả newTotal | | |
| TC-CHK-033 | Checkout | Scan QR/one-time | P1 | High | Token đã quét | POST /scan lại | reuse | 404 "Mã QR không hợp lệ hoặc đã hết hạn" (resolveScanToken xóa sau dùng) | | |
| TC-CHK-034 | Checkout | Scan QR/permission | P1 | High | KITCHEN (không staffUp) | POST /scan | Bearer | 403 | | |

### D.4 Void / Discount item

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CHK-035 | Checkout | Void item | P1 | Critical | CASHIER, món chưa void, đơn mở | POST /items/:id/void | `{reason_code:"WRONG_ORDER"}` | 200 billing_status VOIDED, ghi người void | | |
| TC-CHK-036 | Checkout | Void/threshold | P1 | Critical | Món giá ≥ void_pin_threshold, user không phải manager | POST /items/:id/void | như bên | 400 "Void giá trị ≥ ...đ cần quản lý thực hiện" | | |
| TC-CHK-037 | Checkout | Void/threshold-manager | P1 | High | Cùng trên nhưng BRANCH_MANAGER | POST /items/:id/void | manager | 200 void được | | |
| TC-CHK-038 | Checkout | Void/already | P2 | Medium | Món đã VOIDED | POST /items/:id/void | — | 400 "Món đã được void trước đó" | | |
| TC-CHK-039 | Checkout | Void/closed-order | P1 | High | Đơn COMPLETED | POST /items/:id/void | — | 400 "Đơn đã đóng...dùng quy trình hoàn tiền" | | |
| TC-CHK-040 | Checkout | Void/validation | P2 | Medium | CASHIER | reason_code sai enum | invalid | 400 | | |
| TC-CHK-041 | Checkout | Void/note-max | P3 | Low | CASHIER | note > 500 ký tự | dài | 400 (max 500) | | |
| TC-CHK-042 | Checkout | Void/scope | P1 | Critical | CASHIER chi nhánh A void món đơn B | POST /items/:id/void | B item | 404 (lockOrderItemForVoid lọc company/branch) | | |
| TC-CHK-043 | Checkout | Void/concurrency | P1 | High | 2 request void cùng món | đồng thời | — | lockOrderItemForVoid (FOR UPDATE) → 1 thành công, 1 báo đã void | | |
| TC-CHK-044 | Checkout | Discount item | P1 | High | CASHIER, món chưa void | POST /items/:id/discount | `{discount_percent:20}` | 200, discounted_amount đúng | | |
| TC-CHK-045 | Checkout | Discount/boundary | P2 | Medium | CASHIER | discount_percent 0 / 100 | biên | 200 (min0/max100) | | |
| TC-CHK-046 | Checkout | Discount/boundary | P2 | Medium | CASHIER | discount_percent 101 / -1 | ngoài biên | 400 "Giảm giá 0-100%" | | |
| TC-CHK-047 | Checkout | Discount/voided | P2 | Medium | Món đã VOIDED | POST /items/:id/discount | — | 400 "Món đã bị void, không thể giảm giá" | | |
| TC-CHK-048 | Checkout | Discount/closed | P2 | Medium | Đơn đã đóng | POST /items/:id/discount | — | 400 "Đơn đã đóng/thanh toán — không thể giảm giá" | | |

### D.5 Intent / VAT / Kiem-mon / Invoices

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CHK-049 | Checkout | Get intent | P2 | Medium | Có intent Redis | GET /intent/:tableId | — | 200 `{hasIntent:true,intent}` | | |
| TC-CHK-050 | Checkout | Cancel intent | P1 | High | Có intent TRANSFER/APP | DELETE /intent/:tableId | — | Xóa Redis intent; bàn → SERVING (hủy chờ thanh toán) | | |
| TC-CHK-051 | Checkout | Kiem-mon | P1 | High | Bàn có món | GET /table/:tableId/kiem-mon | — | 200 pre-bill: items+subtotal+vatTotal+vatByRate+total (không thu tiền) | | |
| TC-CHK-052 | Checkout | VAT save/get | P2 | Medium | staffUp | POST rồi GET /table/:tableId/vat | vatData | Lưu/đọc VAT theo bàn (Redis TTL 3600) | | |
| TC-CHK-053 | Checkout | Latest invoice | P2 | Medium | Bàn đã thanh toán | GET /table/:tableId/latest-invoice | — | 200 hóa đơn PAID mới nhất + items | | |
| TC-CHK-054 | Checkout | Latest invoice/none | P2 | Low | Bàn chưa thanh toán | GET latest-invoice | — | 404 | | |
| TC-CHK-055 | Checkout | List invoices | P1 | High | cashierUp | GET /invoices | filters | 200, hóa đơn theo scope chi nhánh + filter | | |
| TC-CHK-056 | Checkout | Mark paid | P1 | High | cashierUp, invoice UNPAID (công nợ) | POST /invoices/:id/pay | — | 200 "Đã cập nhật...Đã thanh toán" | | |
| TC-CHK-057 | Checkout | Mark paid/404 | P2 | Medium | invoice lạ | POST /invoices/:id/pay | — | 404 "Không tìm thấy hóa đơn" | | |
| TC-CHK-058 | Checkout | List invoices/permission | P1 | High | WAITER | GET /invoices | Bearer | 403 (cashierUp) | | |
| TC-CHK-059 | Checkout | Redis-down | P2 | High | Redis mất | validate-voucher / create-invoice có voucher | — | Xử lý lỗi rõ ràng; voucher lưu Redis nên fail-safe cần kiểm | | |

---

## PART E — Internal Reservation
Base `/api/internal/reservations`. `deskRoles`=SUPER/COMPANY_ADMIN/BRANCH_MANAGER/RECEPTIONIST; `readRoles`=+WAITER.
Status flow: PENDING→CONFIRMED→CHECKED_IN→COMPLETED; TERMINAL=COMPLETED/CANCELLED/NO_SHOW (một chiều). Deposit: NO_SHOW→mất cọc, CANCELLED→hoàn cọc.

### E.1 Create / Update / Status

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-IRES-001 | Int Reservation | Create | P1 | Critical | RECEPTIONIST | POST / | `{customer_name,customer_phone,reservation_date,reservation_time}` | 201 phiếu PENDING trong chi nhánh của mình | | |
| TC-IRES-002 | Int Reservation | Create/admin-branch | P1 | High | COMPANY_ADMIN | POST / không branch_id | bỏ branch | 400 "Vui lòng chọn chi nhánh" (resolveBranch) | | |
| TC-IRES-003 | Int Reservation | Create/scope | P1 | Critical | COMPANY_ADMIN chọn branch công ty khác | POST / | branch lạ | assertBranchScope → 403 | | |
| TC-IRES-004 | Int Reservation | Create/validation | P1 | High | RECEPTIONIST | thiếu customer_name | bỏ | 400 "Vui lòng nhập tên khách" | | |
| TC-IRES-005 | Int Reservation | Create/open-hours | P1 | High | RECEPTIONIST | time ngoài giờ | 09:00 | 400 "Chi nhánh chỉ nhận khách từ..." | | |
| TC-IRES-006 | Int Reservation | Create/table-branch | P1 | High | table_id thuộc chi nhánh khác | POST / | mismatch | 400 "Bàn không thuộc chi nhánh của phiếu đặt" | | |
| TC-IRES-007 | Int Reservation | Create/conflict | P1 | Critical | Bàn đã có phiếu cùng khung giờ | POST / cùng table+date+time | conflict | 400 "Bàn này đã có phiếu đặt khác trong khung giờ..." | | |
| TC-IRES-008 | Int Reservation | Create+preorder | P1 | High | RECEPTIONIST, order_items | POST / kèm món | items | Tạo order SCHEDULED gắn phiếu; món lỗi → gỡ phiếu (không rác) | | |
| TC-IRES-009 | Int Reservation | Update | P1 | High | Phiếu chưa terminal | PUT /:id | valid | 200; đổi ngày/giờ set `rescheduled_at` (cảnh báo bếp) | | |
| TC-IRES-010 | Int Reservation | Update/terminal | P1 | High | Phiếu COMPLETED | PUT /:id | — | 400 "Phiếu đặt đã kết thúc, không thể sửa" | | |
| TC-IRES-011 | Int Reservation | Update/empty | P2 | Medium | — | PUT /:id body rỗng | `{}` | 400 "Không có dữ liệu cập nhật" (refine) | | |
| TC-IRES-012 | Int Reservation | Change status | P1 | High | Phiếu PENDING | PATCH /:id/status CONFIRMED | — | 200 | | |
| TC-IRES-013 | Int Reservation | Status/terminal | P1 | High | Phiếu CANCELLED | PATCH /:id/status | CONFIRMED | 400 "Phiếu đặt đã kết thúc, không thể đổi trạng thái" | | |
| TC-IRES-014 | Int Reservation | Status/NO_SHOW | P1 | Critical | Phiếu có cọc | PATCH /:id/status NO_SHOW | — | forfeitDeposit — **mất cọc** (không hoàn) | | |
| TC-IRES-015 | Int Reservation | Status/CANCELLED | P1 | Critical | Phiếu có cọc | PATCH /:id/status CANCELLED | — | refundDeposit — hoàn cọc về ví | | |
| TC-IRES-016 | Int Reservation | Status/idempotent | P2 | Low | Phiếu đã CONFIRMED | PATCH cùng status | — | Trả nguyên trạng (no-op) | | |
| TC-IRES-017 | Int Reservation | Status/invalid | P2 | Medium | — | status = "FOO" | invalid | 400 (enum) | | |

### E.2 Assign table / Check-in / Suggest / Alerts

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-IRES-018 | Int Reservation | Assign table | P1 | High | Phiếu chưa terminal, bàn đủ chỗ | POST /:id/assign-table | `{table_id}` | 200 gán bàn; nếu có preorder → gán bàn cho order SCHEDULED | | |
| TC-IRES-019 | Int Reservation | Assign/capacity | P1 | High | Bàn 4 chỗ, phiếu 6 khách | POST /:id/assign-table | như bên | 400 "Bàn chỉ 4 chỗ, không đủ cho 6 khách" | | |
| TC-IRES-020 | Int Reservation | Assign/conflict | P1 | High | Bàn đã có phiếu khác cùng giờ | POST /:id/assign-table | conflict | 400 "Bàn này đã có phiếu đặt khác..." | | |
| TC-IRES-021 | Int Reservation | Assign/branch | P1 | High | Bàn chi nhánh khác | POST /:id/assign-table | mismatch | 400 "Bàn không thuộc chi nhánh của phiếu đặt" | | |
| TC-IRES-022 | Int Reservation | Check-in | P1 | Critical | Phiếu CONFIRMED, bàn trống | POST /:id/checkin | `{table_id}` | Bàn→SERVING; kích hoạt preorder (SCHEDULED→CONFIRMED) hoặc tạo order rỗng; phiếu CHECKED_IN | | |
| TC-IRES-023 | Int Reservation | Check-in/occupied | P1 | High | Bàn đang SERVING | POST /:id/checkin | — | 400 "Bàn này đang có khách, không thể nhận khách đặt trước..." | | |
| TC-IRES-024 | Int Reservation | Check-in/no-table | P1 | High | Chưa gán bàn, không truyền table_id | POST /:id/checkin | — | 400 "Cần chọn bàn để check-in" | | |
| TC-IRES-025 | Int Reservation | Check-in/terminal | P2 | Medium | Phiếu CANCELLED | POST /:id/checkin | — | 400 "Phiếu đặt đã kết thúc, không thể check-in" | | |
| TC-IRES-026 | Int Reservation | Check-in/concurrency | P1 | Critical | 1 phiếu | 2 check-in **đồng thời** | song song | lockForCheckin (FOR UPDATE) → 1 thành công, tránh 2 order | | |
| TC-IRES-027 | Int Reservation | Check-in/rollback | P2 | High | Lỗi giữa TX | mô phỏng | — | ROLLBACK: bàn không đổi trạng thái, order không tạo | | |
| TC-IRES-028 | Int Reservation | Suggest table | P2 | Medium | deskRoles | GET /:id/suggest-table | — | 200, bàn trống đủ chỗ hoặc null | | |
| TC-IRES-029 | Int Reservation | Alerts | P1 | High | deskRoles | GET /alerts | — | 200, cảnh báo NO_TABLE/CONFLICT/READY/OVERDUE trước giờ hẹn | | |
| TC-IRES-030 | Int Reservation | Alerts/route-order | P2 | Medium | — | GET /alerts vs GET /:id | — | `/alerts` không bị `/:id` nuốt (đăng ký trước) | | |
| TC-IRES-031 | Int Reservation | Stream SSE | P2 | Medium | deskRoles | GET /stream | — | SSE push cảnh báo thay polling | | |

### E.3 List / Get / Cancel / Cross-cutting

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-IRES-032 | Int Reservation | List/filter | P1 | High | readRoles | GET /?date&status&search | filters | 200, lọc theo scope + tiêu chí; search ILIKE name/phone | | |
| TC-IRES-033 | Int Reservation | List/scope | P1 | Critical | BRANCH_MANAGER A | GET / | A token | Chỉ phiếu chi nhánh A (buildScopedBranchWhere) | | |
| TC-IRES-034 | Int Reservation | List/search-SQLi | P1 | Critical | — | search = `%';DROP--` | như bên | Parametrized ILIKE, không thực thi | | |
| TC-IRES-035 | Int Reservation | Get/scope | P1 | Critical | Phiếu chi nhánh B | GET /:id | A token | 403 (assertBranchScope) | | |
| TC-IRES-036 | Int Reservation | Cancel | P1 | High | Phiếu chưa đến, có cọc | DELETE /:id | — | 200 CANCELLED + hoàn cọc | | |
| TC-IRES-037 | Int Reservation | Cancel/checked-in | P1 | High | Phiếu CHECKED_IN | DELETE /:id | — | 400 "Khách đã đến, không thể hủy phiếu đặt" | | |
| TC-IRES-038 | Int Reservation | Cancel/permission | P1 | High | WAITER (không deskRoles) | DELETE /:id | Bearer | 403 | | |
| TC-IRES-039 | Int Reservation | 401 | P1 | High | — | Mọi endpoint không token | — | 401 | | |
| TC-IRES-040 | Int Reservation | UI | P3 | Low | — | ReservationsPage | — | Filter/loading/empty state; cảnh báo hiển thị realtime | | |
