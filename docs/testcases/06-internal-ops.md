# Module 06 — Internal Ops (Employee, Cancel Request, Report, Inventory, Procurement, Audit)

---

## PART A — Employee Management
Base `/api/internal/employees` — `managerOnly`=SUPER/COMPANY_ADMIN/BRANCH_MANAGER (scope theo service).
`createEmployeeSchema`: full_name min1, username min3, password min6, role_id>0, company_id?/branch_id?/kitchen_type_id?, status ACTIVE|INACTIVE|LOCKED.

### A.1 Create — Happy & Validation

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-EMP-001 | Employee | Create | P1 | Critical | BRANCH_MANAGER | POST / | `{full_name,username,password,role_id}` | 201; password lưu bcrypt hash; gán branch/company theo scope | | |
| TC-EMP-002 | Employee | Create/validation | P1 | High | — | username 2 ký tự | `"ab"` | 400 "Tên đăng nhập tối thiểu 3 ký tự" | | |
| TC-EMP-003 | Employee | Create/validation | P1 | High | — | password 5 ký tự | `"12345"` | 400 "Mật khẩu tối thiểu 6 ký tự" | | |
| TC-EMP-004 | Employee | Create/validation | P1 | High | — | thiếu role_id | bỏ | 400 "Thiếu vai trò" | | |
| TC-EMP-005 | Employee | Create/duplicate | P1 | High | username đã tồn tại | POST / | trùng | ⚠️ASSUMED: UNIQUE username → 409/400 "Tên đăng nhập đã tồn tại". Kiểm tra | | |
| TC-EMP-006 | Employee | Create/privilege-escalation | P1 | Critical | BRANCH_MANAGER | POST / role_id = SUPER_ADMIN | như bên | ⚠️RỦI RO: BRANCH_MANAGER không được tạo tài khoản quyền cao hơn mình. Kiểm tra service chặn. Ghi nhận | | |
| TC-EMP-007 | Employee | Create/scope | P1 | Critical | BRANCH_MANAGER A | POST / branch_id = B | branch khác | 403/ép về branch của mình (không tạo cho chi nhánh khác) | | |
| TC-EMP-008 | Employee | Create/permission | P1 | High | WAITER | POST / | Bearer | 403 | | |
| TC-EMP-009 | Employee | Create/kitchen-type | P2 | Medium | Manager | role KITCHEN cần kitchen_type_id | thiếu | ⚠️ASSUMED: nếu role bếp bắt buộc kitchen_type_id thì cần validate. Kiểm tra | | |

### A.2 List / Get / Update / Status / Reset Password

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-EMP-010 | Employee | List/scope | P1 | Critical | BRANCH_MANAGER A | GET / | Bearer | Chỉ nhân viên chi nhánh A | | |
| TC-EMP-011 | Employee | List/no-password | P1 | Critical | Manager | GET / | — | Response **không** chứa password hash | | |
| TC-EMP-012 | Employee | List roles | P2 | Low | Manager | GET /roles | — | 200 danh sách vai trò | | |
| TC-EMP-013 | Employee | Get/scope | P1 | High | Manager A | GET /:id nhân viên B | id B | 403/404 | | |
| TC-EMP-014 | Employee | Update | P2 | Medium | Manager | PUT /:id | valid | 200 | | |
| TC-EMP-015 | Employee | Update/empty | P2 | Low | — | PUT /:id `{}` | rỗng | 400 "Không có dữ liệu cập nhật" | | |
| TC-EMP-016 | Employee | Change status LOCKED | P1 | High | Manager | PATCH /:id/status LOCKED | — | 200; nhân viên đó không login được (403 ở auth) | | |
| TC-EMP-017 | Employee | Status/self-lock | P2 | High | Manager | PATCH /:id/status với id = chính mình LOCKED | self | ⚠️ASSUMED: nên chặn tự khóa mình. Kiểm tra, ghi nhận | | |
| TC-EMP-018 | Employee | Reset password | P1 | High | Manager | POST /:id/reset-password | `{password:"newpass1"}` | 200; nhân viên login pass mới | | |
| TC-EMP-019 | Employee | Reset/validation | P2 | Medium | Manager | password 5 ký tự | `"12345"` | 400 min 6 | | |
| TC-EMP-020 | Employee | Reset/scope | P1 | Critical | Manager A | reset-password nhân viên B công ty khác | id B | 403 | | |
| TC-EMP-021 | Employee | Audit | P2 | Medium | — | Tạo/khóa/reset nhân viên | — | Ghi audit log | | |

---

## PART B — Cancel Request (hủy món đã gửi bếp)
Base `/api/internal/cancel-requests`. Tạo yêu cầu qua `POST /orders/:oid/items/:oiid/cancel-request` (module Order, `canRequest`=WAITER+). Xử lý ở đây: `canDecide`=KITCHEN+managers; `canView`=hầu hết; `canRequest`=WAITER+.
`createRequestSchema`: reason_code enum, reason_note max500 (bắt buộc nếu OTHER), requested_qty?. `rejectSchema`: decision_note max500?.

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CAN-001 | Cancel | Create request | P1 | High | WAITER, món đã gửi bếp | POST cancel-request | `{reason_code:"WRONG_ORDER"}` | 201 tạo yêu cầu PENDING | | |
| TC-CAN-002 | Cancel | Create/OTHER-note | P1 | High | WAITER | reason_code OTHER không note | thiếu note | 400 "Lý do OTHER phải kèm ghi chú" (refine) | | |
| TC-CAN-003 | Cancel | Create/invalid-reason | P2 | Medium | WAITER | reason_code = "BORED" | invalid | 400 (enum) | | |
| TC-CAN-004 | Cancel | Create/qty | P2 | Medium | WAITER | requested_qty > số lượng món | quá | ⚠️ASSUMED: nên chặn hủy nhiều hơn số đã gọi. Kiểm tra | | |
| TC-CAN-005 | Cancel | Create/note-max | P3 | Low | WAITER | reason_note > 500 ký tự | dài | 400 (max 500) | | |
| TC-CAN-006 | Cancel | Accept | P1 | Critical | KITCHEN, yêu cầu PENDING | PATCH /:id/accept | — | Món hủy; **hoàn kho** nếu đã trừ (nấu rồi); cập nhật bill | | |
| TC-CAN-007 | Cancel | Accept/stock | P1 | Critical | Món đã COOKING (đã trừ kho) | PATCH /:id/accept | — | Kiểm tra hoàn nguyên liệu về kho đúng định lượng | | |
| TC-CAN-008 | Cancel | Reject | P1 | High | KITCHEN | PATCH /:id/reject | `{decision_note}` | Yêu cầu REJECTED; món giữ nguyên | | |
| TC-CAN-009 | Cancel | Decide/permission | P1 | High | WAITER | PATCH /:id/accept | Bearer | 403 (chỉ canDecide) | | |
| TC-CAN-010 | Cancel | Withdraw | P2 | Medium | WAITER (người tạo) | PATCH /:id/withdraw | — | 200; yêu cầu rút lại (khi bếp chưa xử lý) | | |
| TC-CAN-011 | Cancel | Withdraw/decided | P2 | Medium | Yêu cầu đã accept/reject | PATCH /:id/withdraw | — | 400 (không rút được sau khi đã quyết định) | | |
| TC-CAN-012 | Cancel | Double-decide | P1 | High | Yêu cầu đã accept | PATCH /:id/accept lại | — | 400 (đã xử lý); không hoàn kho 2 lần | | |
| TC-CAN-013 | Cancel | List/scope | P1 | High | canView | GET / | — | Chỉ yêu cầu trong scope chi nhánh | | |
| TC-CAN-014 | Cancel | Concurrency | P1 | High | 1 yêu cầu | accept + reject **đồng thời** | song song | Chỉ 1 quyết định thắng (lock/status guard) | | |

---

## PART C — Report / Dashboard
Base `/api/internal/reports` — `managerOnly`. `admin-overview` chặn non-SUPER_ADMIN ở service.

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-RPT-001 | Report | Dashboard | P1 | High | BRANCH_MANAGER | GET /dashboard | — | 200, số liệu chi nhánh của mình | | |
| TC-RPT-002 | Report | Dashboard/scope | P1 | Critical | BRANCH_MANAGER A | GET /dashboard | — | Chỉ dữ liệu chi nhánh A (không thấy toàn hệ thống) | | |
| TC-RPT-003 | Report | Admin overview | P1 | High | SUPER_ADMIN | GET /admin-overview | — | 200 tổng quan toàn hệ thống | | |
| TC-RPT-004 | Report | Admin overview/permission | P1 | Critical | COMPANY_ADMIN/BRANCH_MANAGER | GET /admin-overview | Bearer | 403 (service chặn non-SUPER_ADMIN) | | |
| TC-RPT-005 | Report | Revenue | P1 | High | Manager | GET /revenue?from&to | date range | 200, doanh thu theo khoảng | | |
| TC-RPT-006 | Report | Revenue/date-validation | P2 | Medium | Manager | from > to | đảo ngược | ⚠️ASSUMED: nên validate khoảng ngày; kiểm tra không 500 | | |
| TC-RPT-007 | Report | Revenue/SQLi | P1 | Critical | Manager | from = `2026-01-01';DROP--` | như bên | Parametrized, không thực thi | | |
| TC-RPT-008 | Report | Top items | P2 | Medium | Manager | GET /top-items | — | 200, món bán chạy | | |
| TC-RPT-009 | Report | Permission | P1 | High | WAITER | GET /dashboard | Bearer | 403 | | |
| TC-RPT-010 | Report | Perf | P3 | Medium | Dữ liệu 1 năm, nhiều chi nhánh | GET /revenue | — | Query có index/aggregate; response time chấp nhận; cân nhắc cache | | |
| TC-RPT-011 | Report | Empty | P3 | Low | Chi nhánh mới chưa có đơn | GET /dashboard | — | 200, số 0, không lỗi chia 0 | | |

---

## PART D — Inventory (nguyên liệu, công thức, phiếu kho)
Base `/api/internal/inventory`. `managerOnly` ghi; `staffRead` đọc. Scope theo company_id; SUPER_ADMIN truyền `?companyId`/body companyId (`resolveCompanyScope`).
`createIngredientSchema`: code/name/unit min1, stock/cost ≥0. `stockTransactionSchema`: ingredientId>0, type enum (PURCHASE/INTERNAL_TRANSFER/RETURN_SUPPLIER/WASTE/STOCK_ADJUSTMENT/STOCK_COUNT).

### D.1 Ingredients & Recipe

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-INV-001 | Inventory | Create ingredient | P1 | High | BRANCH_MANAGER | POST /ingredients | `{ingredient_code,ingredient_name,unit}` | 201 | | |
| TC-INV-002 | Inventory | Create/validation | P1 | High | — | thiếu unit | bỏ | 400 "Thiếu đơn vị tính" | | |
| TC-INV-003 | Inventory | Create/duplicate-code | P2 | High | code trùng trong công ty | POST | trùng | ⚠️ASSUMED: UNIQUE (company,code) → 409/400. Kiểm tra | | |
| TC-INV-004 | Inventory | Create/negative-stock | P2 | Medium | — | current_stock = -5 | âm | 400 (min 0) | | |
| TC-INV-005 | Inventory | List low-stock | P1 | High | staffRead | GET /ingredients/low-stock | — | 200, nguyên liệu ≤ minimum_stock (cảnh báo bổ sung) | | |
| TC-INV-006 | Inventory | Scope | P1 | Critical | BRANCH_MANAGER cty X | GET nguyên liệu cty Y | — | Không thấy (scope company_id) | | |
| TC-INV-007 | Inventory | Super scope | P2 | Medium | SUPER_ADMIN | GET /ingredients?companyId=5 | — | Trả nguyên liệu công ty 5 (resolveCompanyScope) | | |
| TC-INV-008 | Inventory | Super no-company | P2 | Medium | SUPER_ADMIN | GET /ingredients không companyId | — | ⚠️ASSUMED: company_id undefined → trả rỗng/lỗi. Kiểm tra hành vi | | |
| TC-INV-009 | Inventory | Update | P2 | Medium | Manager | PUT /ingredients/:id | valid | 200 | | |
| TC-INV-010 | Inventory | Delete | P1 | High | Manager | DELETE /ingredients/:id | — | 200; soft-delete nếu đang dùng trong công thức | | |
| TC-INV-011 | Inventory | Delete/in-recipe | P1 | High | Nguyên liệu trong công thức món | DELETE /ingredients/:id | — | ⚠️ASSUMED: chặn/soft-delete để không phá công thức. Kiểm tra FK | | |
| TC-INV-012 | Inventory | Set recipe | P1 | Critical | Manager | PUT /recipes/menu-item/:id | `{items:[{ingredient_id,quantity:0.2}]}` | 200; định lượng dùng để trừ kho khi nấu | | |
| TC-INV-013 | Inventory | Recipe/empty | P1 | High | — | items rỗng | `[]` | 400 "Công thức phải có ít nhất 1 nguyên liệu" | | |
| TC-INV-014 | Inventory | Recipe/qty | P2 | Medium | — | quantity = 0 | `0` | 400 "Định lượng phải > 0" | | |
| TC-INV-015 | Inventory | Recipe/permission | P1 | High | KITCHEN | PUT /recipes/... | Bearer | 403 (managerOnly ghi); GET thì được | | |

### D.2 Stock Transactions

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-INV-016 | Inventory | Purchase txn | P1 | Critical | Manager | POST /transactions PURCHASE | `{ingredientId,type:"PURCHASE",quantity:100}` | 201; current_stock tăng 100 | | |
| TC-INV-017 | Inventory | Waste txn | P1 | High | Manager | POST /transactions WASTE | `{ingredientId,type:"WASTE",quantity:5}` | current_stock giảm 5 (hủy hao) | | |
| TC-INV-018 | Inventory | Stock count | P1 | High | Manager | POST /transactions STOCK_COUNT | `{ingredientId,type:"STOCK_COUNT",actualStock:80}` | current_stock đặt = 80 (kiểm kê); ghi chênh lệch | | |
| TC-INV-019 | Inventory | Adjustment/negative | P1 | Critical | current_stock=10 | POST WASTE quantity 20 | quá tồn | ⚠️ASSUMED: nên chặn tồn kho âm hoặc cho phép có kiểm soát. Kiểm tra business rule | | |
| TC-INV-020 | Inventory | Txn/validation | P2 | Medium | — | type = "STEAL" | invalid | 400 (enum) | | |
| TC-INV-021 | Inventory | Txn/concurrency | P1 | Critical | 2 txn cùng nguyên liệu | đồng thời | — | Lock row → tồn kho nhất quán, không mất update | | |
| TC-INV-022 | Inventory | Txn/audit-trail | P2 | High | — | Xem GET /transactions | — | Mọi biến động kho có bản ghi (không sửa tay không dấu vết) | | |
| TC-INV-023 | Inventory | Estimate order | P2 | Medium | staffRead | GET /estimate/order/:orderId | — | 200, ước tính nguyên liệu tiêu hao cho đơn | | |
| TC-INV-024 | Inventory | Deduct-on-cook | P1 | Critical | Order cook (module Order) | POST /orders/:id/cook | — | Trừ kho theo công thức × số lượng món; liên kết đúng inventory | | |

---

## PART E — Procurement (nhà cung cấp + phiếu nhập kho)
Base `/api/internal/procurement`. `managerOnly` ghi; `staffRead`=+KITCHEN đọc.
`createReceiptSchema`: supplier_id>0, items[] min1 (ingredient_id>0, quantity>0, unit_price?≥0), receipt_date YYYY-MM-DD?.

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-PROC-001 | Procurement | Create supplier | P1 | High | Manager | POST /suppliers | `{supplier_code,supplier_name}` | 201 | | |
| TC-PROC-002 | Procurement | Supplier/email | P2 | Medium | — | email sai format | `"abc"` | 400 "Email không hợp lệ" | | |
| TC-PROC-003 | Procurement | Supplier/duplicate | P2 | High | code trùng | POST /suppliers | trùng | ⚠️ASSUMED: UNIQUE code → 409/400. Kiểm tra | | |
| TC-PROC-004 | Procurement | Supplier/permission | P1 | High | KITCHEN | POST /suppliers | Bearer | 403 (chỉ managerOnly ghi) | | |
| TC-PROC-005 | Procurement | Supplier delete | P2 | Medium | Manager | DELETE /suppliers/:id | — | 200; soft-delete nếu có phiếu nhập liên quan | | |
| TC-PROC-006 | Procurement | Create receipt | P1 | Critical | Manager | POST /receipts | `{supplier_id,items:[{ingredient_id,quantity:50,unit_price:10000}]}` | 201, phiếu DRAFT/PENDING (chưa cộng kho tới khi confirm) | | |
| TC-PROC-007 | Procurement | Receipt/no-items | P1 | High | — | items rỗng | `[]` | 400 "Phiếu nhập phải có ít nhất 1 dòng" | | |
| TC-PROC-008 | Procurement | Receipt/qty | P2 | Medium | — | quantity = 0 | `0` | 400 "Số lượng phải > 0" | | |
| TC-PROC-009 | Procurement | Receipt/date | P2 | Low | — | receipt_date sai format | `2026/07/20` | 400 "Ngày không hợp lệ (YYYY-MM-DD)" | | |
| TC-PROC-010 | Procurement | Confirm receipt | P1 | Critical | Phiếu PENDING | POST /receipts/:id/confirm | — | **Cộng kho** theo từng dòng; cập nhật cost_price; phiếu CONFIRMED | | |
| TC-PROC-011 | Procurement | Confirm/double | P1 | Critical | Phiếu đã CONFIRMED | POST /receipts/:id/confirm lại | — | 400/idempotent; **không** cộng kho 2 lần | | |
| TC-PROC-012 | Procurement | Confirm/transaction | P1 | Critical | Lỗi giữa cộng kho | mô phỏng | — | ROLLBACK: không cộng kho một phần | | |
| TC-PROC-013 | Procurement | Cancel receipt | P1 | High | Phiếu PENDING | DELETE /receipts/:id | — | Hủy phiếu | | |
| TC-PROC-014 | Procurement | Cancel/confirmed | P1 | High | Phiếu đã CONFIRMED (đã cộng kho) | DELETE /receipts/:id | — | ⚠️ASSUMED: hủy phiếu đã cộng kho phải trừ kho lại hoặc chặn. Kiểm tra, ghi nhận | | |
| TC-PROC-015 | Procurement | Scope | P1 | Critical | Manager cty X | thao tác phiếu/NCC cty Y | — | 403/404 | | |
| TC-PROC-016 | Procurement | Cross-branch ingredient | P1 | High | items có ingredient_id của công ty khác | POST /receipts | mismatch | ⚠️ASSUMED: validate nguyên liệu thuộc đúng công ty. Kiểm tra | | |
| TC-PROC-017 | Procurement | Audit | P2 | Medium | — | Confirm/cancel phiếu | — | Ghi audit log | | |

---

## PART F — Audit Log
Base `/api/internal/audit-logs` — SUPER/COMPANY_ADMIN/BRANCH_MANAGER. `autoAuditMiddleware` ghi mọi hành động ghi trên `/internal`.

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-AUD-001 | Audit | List | P1 | High | BRANCH_MANAGER | GET / | — | 200, nhật ký hành động trong scope | | |
| TC-AUD-002 | Audit | Auto-capture | P1 | Critical | Thực hiện 1 hành động ghi (vd void món) | Sau đó GET /audit-logs | — | Có bản ghi: ai, hành động gì, khi nào, đối tượng nào | | |
| TC-AUD-003 | Audit | Scope | P1 | Critical | BRANCH_MANAGER A | GET / | — | Chỉ log chi nhánh A (không xem toàn hệ thống) | | |
| TC-AUD-004 | Audit | Permission | P1 | High | WAITER | GET / | Bearer | 403 | | |
| TC-AUD-005 | Audit | Immutability | P1 | Critical | — | Thử sửa/xóa audit log | — | Không có endpoint sửa/xóa; log bất biến (chỉ đọc) | | |
| TC-AUD-006 | Audit | Sensitive-data | P2 | High | — | Kiểm tra nội dung log | — | Không lưu password/PIN/token trong payload log | | |
| TC-AUD-007 | Audit | Pagination | P2 | Medium | Nhiều log | GET /?page&limit | — | ⚠️ASSUMED: cần phân trang; kiểm tra tránh trả toàn bộ bảng | | |
| TC-AUD-008 | Audit | Filter | P3 | Low | Manager | GET /?action&user&date | filters | Lọc theo hành động/người/ngày (nếu hỗ trợ) | | |
| TC-AUD-009 | Audit | Perf | P3 | Medium | Bảng log lớn | GET / | — | Có index theo thời gian/chi nhánh; response time chấp nhận | | |

---

## Phụ lục — Non-functional & Cross-cutting (áp cho toàn hệ thống)

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-SYS-001 | System | Security/JWT | P1 | Critical | — | Gọi API internal bằng token customer & ngược lại | cross-type | 403 sai loại tài khoản mọi endpoint | | |
| TC-SYS-002 | System | Security/headers | P2 | Medium | — | Kiểm tra response headers | — | Có helmet/security headers; không lộ `X-Powered-By` | | |
| TC-SYS-003 | System | Security/CORS | P2 | High | — | Request từ origin lạ | — | CORS chỉ cho phép origin whitelisted | | |
| TC-SYS-004 | System | Security/rate-limit | P2 | High | — | Flood endpoint không có authLimiter | — | ⚠️ASSUMED: chỉ auth có rate limit → cân nhắc global limiter chống DoS | | |
| TC-SYS-005 | System | Security/.env | P1 | Critical | — | Kiểm tra secrets | — | PayOS keys/JWT secret/DB pass chỉ ở .env, không hardcode, không trả ra client | | |
| TC-SYS-006 | System | Error/500 | P1 | High | DB/Redis down | Gọi API bất kỳ | — | 500 message chung; **không** lộ stack trace/SQL/đường dẫn ra client | | |
| TC-SYS-007 | System | Integration/DB | P1 | High | — | Mất kết nối Postgres giữa chừng | — | Transaction rollback; không để dữ liệu nửa vời | | |
| TC-SYS-008 | System | Integration/Redis | P1 | High | Redis down | Checkout voucher / QR pending | — | Xử lý lỗi rõ ràng; xác định tính năng nào phụ thuộc cứng Redis | | |
| TC-SYS-009 | System | Integration/PayOS | P1 | High | PayOS timeout | Tạo link/nạp ví | — | Timeout xử lý, đánh dấu topup FAILED, không treo request | | |
| TC-SYS-010 | System | Integration/Mail | P2 | Medium | SMTP down | forgot-password/verify | — | Best-effort, log warn, không chặn luồng chính | | |
| TC-SYS-011 | System | Perf/load | P2 | High | — | 1000 user đồng thời (login, order, checkout) | load test | Response time trong SLA; không rò rỉ connection pool; SSE ổn định | | |
| TC-SYS-012 | System | UI/responsive | P3 | Low | — | igourmet-app & internal trên mobile/tablet/desktop | — | Responsive; loading/empty/error state đầy đủ | | |
| TC-SYS-013 | System | Edge/token-expired | P1 | High | Access token hết hạn giữa phiên | Gọi API | — | Auto refresh; refresh fail → về màn Login | | |
| TC-SYS-014 | System | Edge/multi-tab | P2 | Medium | Đăng nhập 2 tab | Thao tác song song | — | Trạng thái nhất quán; logout 1 tab không phá tab kia bất ngờ (hoặc đồng bộ) | | |
| TC-SYS-015 | System | Migration integrity | P2 | High | — | Chạy migrations 001→025 sạch | — | Không lỗi; redeem_code (025), home_banners (024), rescheduled (023) đúng schema | | |
