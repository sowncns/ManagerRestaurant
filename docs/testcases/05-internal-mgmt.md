# Module 05 — Internal Management (Voucher, Menu, Combo, Cashback, Home Banner, Branch, Company, Customer)

---

## PART A — Voucher Management
Base `/api/internal/vouchers` — chỉ SUPER_ADMIN + COMPANY_ADMIN (`assertOwnVoucher`: SUPER mọi voucher; COMPANY_ADMIN chỉ voucher công ty mình).
`createVoucherSchema`: code min1, name min1, discount_type percent|fixed, discount_value >0, min_order_amount ≥0, max_discount_amount ≥0, start_date/end_date ISO datetime, usage_limit ≥0, per_customer_limit ≥1, apply_scope all_branches|selected_branches, type min1, status enum, image_url URL|"", refine end_date > start_date.
`assignSchema`: đúng **một** trong customerIds / rank / birthMonth / all_customers.

### A.1 Create — Happy & Validation

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-IVOU-001 | Voucher | Create | P1 | Critical | COMPANY_ADMIN | POST / hợp lệ | percent 20%, min 100k, cap 50k | 201 tạo voucher (company_id ép theo user) | | |
| TC-IVOU-002 | Voucher | Create/super-company | P1 | High | SUPER_ADMIN | POST / kèm company_id | valid | 201 tạo cho công ty chỉ định | | |
| TC-IVOU-003 | Voucher | Create/super-no-company | P1 | High | SUPER_ADMIN | POST / thiếu company_id | bỏ | 400 "Thiếu company_id cho voucher" | | |
| TC-IVOU-004 | Voucher | Create/duplicate | P1 | High | code đã tồn tại | POST / | trùng code | 400 "Mã voucher đã tồn tại" (bắt lỗi 23505) | | |
| TC-IVOU-005 | Voucher | Create/validation | P1 | High | — | thiếu code | bỏ | 400 "Vui lòng nhập mã voucher" | | |
| TC-IVOU-006 | Voucher | Create/validation | P1 | High | — | discount_type = "gift" | invalid | 400 "discount_type phải là percent hoặc fixed" | | |
| TC-IVOU-007 | Voucher | Create/boundary | P1 | High | — | discount_value = 0 | `0` | 400 "discount_value phải lớn hơn 0" | | |
| TC-IVOU-008 | Voucher | Create/date | P1 | Critical | — | end_date ≤ start_date | end<start | 400 "end_date phải sau start_date" (refine) | | |
| TC-IVOU-009 | Voucher | Create/date-boundary | P2 | Medium | — | end_date == start_date | bằng | 400 (yêu cầu `>` strict) | | |
| TC-IVOU-010 | Voucher | Create/date-format | P2 | Medium | — | start_date = "2026-07-20" (không ISO datetime) | như bên | 400 "start_date phải là ISO datetime" | | |
| TC-IVOU-011 | Voucher | Create/boundary | P2 | Medium | — | per_customer_limit = 0 | `0` | 400 (min 1) | | |
| TC-IVOU-012 | Voucher | Create/image | P2 | Low | — | image_url không phải URL | `"abc"` | 400 "URL ảnh không hợp lệ" | | |
| TC-IVOU-013 | Voucher | Create/image-empty | P3 | Low | — | image_url = "" | rỗng | 201 (cho phép rỗng) | | |
| TC-IVOU-014 | Voucher | Create/XSS | P2 | Medium | — | name có `<script>` | như bên | Lưu literal, hiển thị escape | | |
| TC-IVOU-015 | Voucher | Create/permission | P1 | Critical | BRANCH_MANAGER | POST / | Bearer | 403 (route authorize) | | |

### A.2 List / Get / Update / Delete — Scope & Permission

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-IVOU-016 | Voucher | List/scope | P1 | Critical | COMPANY_ADMIN cty X | GET / | Bearer | Chỉ voucher công ty X (ép companyId) | | |
| TC-IVOU-017 | Voucher | List/super-filter | P2 | Medium | SUPER_ADMIN | GET /?company_id=Y&status=active | filter | Lọc theo công ty + trạng thái | | |
| TC-IVOU-018 | Voucher | Get/stats | P2 | Medium | COMPANY_ADMIN | GET /:id | own | 200, kèm issued/used stats | | |
| TC-IVOU-019 | Voucher | Get/cross-company | P1 | Critical | COMPANY_ADMIN X | GET /:id voucher công ty Y | id Y | 403 "Bạn không có quyền với voucher này" | | |
| TC-IVOU-020 | Voucher | Update | P1 | High | own voucher | PUT /:id | valid | 200 cập nhật | | |
| TC-IVOU-021 | Voucher | Update/date-refine | P2 | Medium | own | PUT với end_date ≤ start_date | như bên | 400 "end_date phải sau start_date" | | |
| TC-IVOU-022 | Voucher | Update/empty | P2 | Low | own | PUT /:id `{}` | rỗng | 400 "Không có dữ liệu cập nhật" | | |
| TC-IVOU-023 | Voucher | Update/cross | P1 | Critical | COMPANY_ADMIN X | PUT voucher Y | id Y | 403 | | |
| TC-IVOU-024 | Voucher | Delete(deactivate) | P1 | High | own | DELETE /:id | — | 200; voucher → inactive (soft) | | |
| TC-IVOU-025 | Voucher | Delete/cross | P1 | Critical | COMPANY_ADMIN X | DELETE voucher Y | id Y | 403 | | |
| TC-IVOU-026 | Voucher | 404 | P2 | Low | — | GET /:id id lạ | — | 404 "Không tìm thấy voucher" | | |

### A.3 Assign — Business Rule (per-customer limit, targeting)

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-IVOU-027 | Voucher | Assign/customerIds | P1 | Critical | Voucher active còn hạn | POST /:id/assign | `{customerIds:[1,2,3]}` | 200 `{issued:3,skipped:0}`; tạo customer_vouchers | | |
| TC-IVOU-028 | Voucher | Assign/rank | P1 | High | Voucher active | POST /:id/assign | `{rank:"gold"}` | Phát cho toàn bộ khách hạng gold | | |
| TC-IVOU-029 | Voucher | Assign/birthMonth | P2 | Medium | Voucher active | POST /:id/assign | `{birthMonth:7}` | Phát cho khách sinh tháng 7 | | |
| TC-IVOU-030 | Voucher | Assign/all | P1 | High | Voucher active | POST /:id/assign | `{all_customers:true}` | Phát cho tất cả khách | | |
| TC-IVOU-031 | Voucher | Assign/exclusive | P1 | High | — | POST /:id/assign nhiều tiêu chí | `{customerIds,rank}` | 400 "Cung cấp đúng một trong customerIds, rank, birthMonth hoặc all_customers" | | |
| TC-IVOU-032 | Voucher | Assign/none | P2 | Medium | — | POST /:id/assign body rỗng | `{}` | 400 (refine đúng một tiêu chí) | | |
| TC-IVOU-033 | Voucher | Assign/limit | P1 | Critical | per_customer_limit=1, khách đã có 1 voucher unused | POST /:id/assign customerIds cùng khách | như bên | Khách đó bị skip (`held >= limit`); `issued` giảm, `skipped` tăng | | |
| TC-IVOU-034 | Voucher | Assign/inactive | P1 | High | Voucher status != active | POST /:id/assign | — | 400 "Voucher không ở trạng thái active" | | |
| TC-IVOU-035 | Voucher | Assign/expired | P1 | High | Voucher end_date đã qua | POST /:id/assign | — | 400 "Voucher đã hết hạn" | | |
| TC-IVOU-036 | Voucher | Assign/empty-target | P2 | Low | rank không có khách nào | POST /:id/assign | rank hiếm | 200 `{issued:0,skipped:0}` | | |
| TC-IVOU-037 | Voucher | Assign/rollback | P2 | High | Lỗi giữa vòng lặp | mô phỏng | — | ROLLBACK toàn bộ (transaction) — không phát nửa vời | | |
| TC-IVOU-038 | Voucher | Assign/concurrency | P2 | High | 2 assign cùng voucher cùng khách | đồng thời | — | ⚠️ASSUMED: countUnusedForCustomer trong TX nhưng 2 TX song song có thể vượt limit. Kiểm tra, ghi nhận | | |
| TC-IVOU-039 | Voucher | Assign/perf | P3 | Medium | all_customers = 100.000 khách | POST /:id/assign | — | ⚠️ASSUMED: vòng lặp tuần tự + insert từng cái → chậm/timeout. Đề xuất batch insert. Ghi nhận | | |

---

## PART B — Menu Items & Categories
Base `/api/internal/menu-items` & `/api/internal/menu-categories`. `adminOnly`=SUPER/COMPANY_ADMIN ghi; `canRead`=+BRANCH_MANAGER/WAITER/CASHIER/KITCHEN đọc.
`createItemSchema`: category_id>0, kitchen_type_id>0, name min1, price ≥0, vat?, is_available?.

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-MENU-001 | Menu | Create item | P1 | High | COMPANY_ADMIN | POST /menu-items | `{category_id,kitchen_type_id,name,price:50000}` | 201 tạo món | | |
| TC-MENU-002 | Menu | Create/validation | P1 | High | — | thiếu name | bỏ | 400 "Thiếu tên món" | | |
| TC-MENU-003 | Menu | Create/price | P1 | High | — | price = -1 | âm | 400 "Giá không hợp lệ" | | |
| TC-MENU-004 | Menu | Create/price-boundary | P2 | Medium | — | price = 0 | `0` | 201 (min 0 cho phép — món tặng?) — kiểm tra rule | | |
| TC-MENU-005 | Menu | Create/category-invalid | P2 | Medium | — | category_id không tồn tại | id lạ | 400/FK error | | |
| TC-MENU-006 | Menu | Create/permission | P1 | High | WAITER | POST /menu-items | Bearer | 403 (adminOnly) | | |
| TC-MENU-007 | Menu | Read/permission | P2 | Medium | KITCHEN | GET /menu-items | Bearer | 200 (canRead cho KITCHEN đọc) | | |
| TC-MENU-008 | Menu | Update | P2 | Medium | COMPANY_ADMIN | PUT /:id | valid | 200 | | |
| TC-MENU-009 | Menu | Update/empty | P2 | Low | — | PUT /:id `{}` | rỗng | 400 "Không có dữ liệu cập nhật" | | |
| TC-MENU-010 | Menu | Availability toggle | P1 | High | COMPANY_ADMIN | PATCH /:id/availability | `{is_available:false}` | 200; món hết hàng không đặt được | | |
| TC-MENU-011 | Menu | Availability/coerce | P3 | Low | — | is_available = "false" (string) | như bên | coerce → false | | |
| TC-MENU-012 | Menu | Delete | P1 | High | COMPANY_ADMIN | DELETE /:id | — | 200; soft-delete (status inactive) — kiểm tra | | |
| TC-MENU-013 | Menu | Delete/in-order | P1 | High | Món đang trong đơn active | DELETE /:id | — | ⚠️ASSUMED: soft-delete để không phá đơn cũ. Kiểm tra không cascade xóa order_items | | |
| TC-MENU-014 | Menu | Scope | P1 | Critical | COMPANY_ADMIN X | Sửa món công ty Y | id Y | 403/404 (scope service) | | |
| TC-MENU-015 | Menu | XSS/unicode | P3 | Low | — | name emoji/tiếng Việt/`<script>` | như bên | Lưu đúng, hiển thị escape | | |
| TC-MENU-016 | Menu | Category create | P2 | Medium | COMPANY_ADMIN | POST /menu-categories | `{name,category_type:"food"}` | 201 | | |
| TC-MENU-017 | Menu | Category validation | P2 | Medium | — | thiếu category_type | bỏ | 400 "Thiếu loại danh mục" | | |
| TC-MENU-018 | Menu | Category delete/FK | P1 | High | Danh mục còn món | DELETE category | — | ⚠️ASSUMED: chặn xóa/soft-delete khi còn món. Kiểm tra | | |

---

## PART C — Combo
Base `/api/internal/combos`. `companyAdminOnly` ghi; `staffRead` đọc.
`createComboSchema`: name min1, price ≥0, items[] min1 (mỗi item menu_item_id>0, quantity?>0).

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CMB-001 | Combo | Create | P1 | High | COMPANY_ADMIN | POST / | `{name,price,items:[{menu_item_id,quantity:2}]}` | 201 | | |
| TC-CMB-002 | Combo | Create/no-items | P1 | High | — | items rỗng | `items:[]` | 400 "Combo phải có ít nhất 1 món" | | |
| TC-CMB-003 | Combo | Create/validation | P2 | Medium | — | thiếu name | bỏ | 400 "Thiếu tên combo" | | |
| TC-CMB-004 | Combo | Create/price | P2 | Medium | — | price âm | `-1` | 400 "Giá không hợp lệ" | | |
| TC-CMB-005 | Combo | Create/item-invalid | P2 | Medium | — | menu_item_id không tồn tại | id lạ | 400/FK | | |
| TC-CMB-006 | Combo | Create/quantity | P2 | Medium | — | quantity = 0 | `0` | 400 "Số lượng phải > 0" | | |
| TC-CMB-007 | Combo | Read | P2 | Low | WAITER | GET / | Bearer | 200 (staffRead) | | |
| TC-CMB-008 | Combo | Create/permission | P1 | High | WAITER | POST / | Bearer | 403 | | |
| TC-CMB-009 | Combo | Update/empty | P2 | Low | — | PUT /:id `{}` | rỗng | 400 "Không có dữ liệu cập nhật" | | |
| TC-CMB-010 | Combo | Delete | P2 | Medium | COMPANY_ADMIN | DELETE /:id | — | 200 | | |
| TC-CMB-011 | Combo | Scope | P1 | High | COMPANY_ADMIN X | thao tác combo Y | — | 403/404 | | |
| TC-CMB-012 | Combo | Business/price-logic | P3 | Low | — | Giá combo > tổng giá món lẻ | như bên | ⚠️ASSUMED: không chặn; combo lẽ ra rẻ hơn. Ghi nhận cân nhắc | | |

---

## PART D — Cashback Rates
Base `/api/internal/cashback-rates` — chỉ SUPER_ADMIN. `PUT /:rank` với `{percent}` (0–100).

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CB-001 | Cashback | List | P1 | Medium | SUPER_ADMIN | GET / | — | 200, tỷ lệ theo từng hạng | | |
| TC-CB-002 | Cashback | Update | P1 | High | SUPER_ADMIN | PUT /gold | `{percent:5}` | 200; áp dụng cho lần thanh toán sau | | |
| TC-CB-003 | Cashback | Update/boundary | P1 | High | SUPER_ADMIN | percent = 0 / 100 | biên | 200 | | |
| TC-CB-004 | Cashback | Update/boundary | P1 | High | SUPER_ADMIN | percent = -1 / 101 | ngoài | 400 "percent không được âm" / "percent tối đa là 100" | | |
| TC-CB-005 | Cashback | Update/type | P2 | Medium | SUPER_ADMIN | percent = "abc" | string | 400 "percent phải là số" | | |
| TC-CB-006 | Cashback | Update/invalid-rank | P2 | Medium | SUPER_ADMIN | PUT /diamond (không tồn tại) | — | 404/400 (rank không hợp lệ) | | |
| TC-CB-007 | Cashback | Permission | P1 | Critical | COMPANY_ADMIN | PUT /gold | Bearer | 403 (chỉ SUPER_ADMIN) | | |
| TC-CB-008 | Cashback | Business/integration | P1 | High | Đặt gold=5%, khách gold thanh toán 1tr | Thanh toán CASH | — | applyCashback hoàn 50k vào ví (module Checkout gọi) | | |

---

## PART E — Home Banner (mới, migration 024)
Base `/api/internal/home-banners` — chỉ SUPER_ADMIN. `GET /`, `POST /` (createBannerSchema: image_url URL bắt buộc, type 1|2), `DELETE /:id`.

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-HB-001 | Home Banner | List | P1 | Medium | SUPER_ADMIN | GET / | — | 200, danh sách banner | | |
| TC-HB-002 | Home Banner | Create slide | P1 | High | SUPER_ADMIN | POST / | `{image_url:"https://...jpg",type:1}` | 201 | | |
| TC-HB-003 | Home Banner | Create today | P1 | High | SUPER_ADMIN | POST / | `{image_url,type:2}` | 201 ("hôm nay ăn gì") | | |
| TC-HB-004 | Home Banner | Create/type-invalid | P1 | High | SUPER_ADMIN | type = 3 | `3` | 400 "Loại phải là 1 (slide) hoặc 2..." | | |
| TC-HB-005 | Home Banner | Create/url-invalid | P1 | High | SUPER_ADMIN | image_url = "abc" | không URL | 400 "URL ảnh không hợp lệ" | | |
| TC-HB-006 | Home Banner | Create/url-missing | P1 | High | SUPER_ADMIN | thiếu image_url | bỏ | 400 (required) | | |
| TC-HB-007 | Home Banner | Create/permission | P1 | Critical | COMPANY_ADMIN | POST / | Bearer | 403 (chỉ SUPER_ADMIN) | | |
| TC-HB-008 | Home Banner | Delete | P1 | High | SUPER_ADMIN | DELETE /:id | — | 200/204; biến mất khỏi public /home-banners | | |
| TC-HB-009 | Home Banner | Delete/404 | P2 | Low | SUPER_ADMIN | DELETE /:id lạ | — | 404 | | |
| TC-HB-010 | Home Banner | Integration | P1 | High | Tạo banner type 1 | GET /public/home-banners | — | Banner mới hiển thị trên app khách (Home.tsx slide) | | |
| TC-HB-011 | Home Banner | XSS/SSRF | P2 | Medium | SUPER_ADMIN | image_url = `javascript:alert(1)` | như bên | ⚠️ASSUMED: zod .url() chấp nhận nhiều scheme → app render `<img>` an toàn nhưng nên chặn non-http(s). Ghi nhận | | |
| TC-HB-012 | Home Banner | UI | P3 | Low | — | HomeBannersPage | — | Preview ảnh, loading/empty state | | |

---

## PART F — Branch
Base `/api/internal/branches` — `managerOnly`=SUPER/COMPANY_ADMIN/BRANCH_MANAGER.
`createBranchSchema`: name/code/address min1, phone?, email?, opening/closing_time HH:mm regex, status ACTIVE|INACTIVE.

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-BR-001 | Branch | Create | P1 | High | COMPANY_ADMIN | POST / | `{name,code,address}` | 201 (company_id ép theo user) | | |
| TC-BR-002 | Branch | Create/validation | P1 | High | — | thiếu name/code/address | bỏ | 400 tương ứng | | |
| TC-BR-003 | Branch | Create/time | P2 | Medium | — | opening_time = "25:00" | invalid | 400 "Giờ không hợp lệ (HH:mm)" | | |
| TC-BR-004 | Branch | Create/email | P2 | Medium | — | email sai format | `"abc"` | 400 "Email không hợp lệ" | | |
| TC-BR-005 | Branch | Create/duplicate-code | P2 | High | code trùng | POST / | trùng | ⚠️ASSUMED: UNIQUE code → 409/400. Kiểm tra | | |
| TC-BR-006 | Branch | List/scope | P1 | Critical | COMPANY_ADMIN X | GET / | Bearer | Chỉ chi nhánh công ty X | | |
| TC-BR-007 | Branch | Get/scope | P1 | Critical | BRANCH_MANAGER | GET /:id chi nhánh khác | id khác | 403/404 | | |
| TC-BR-008 | Branch | Update | P2 | Medium | manager | PUT /:id | valid | 200 | | |
| TC-BR-009 | Branch | Change status | P1 | High | manager | PATCH /:id/status INACTIVE | — | 200; chi nhánh INACTIVE ẩn khỏi public catalog | | |
| TC-BR-010 | Branch | Delete | P1 | High | manager | DELETE /:id | — | 200; kiểm tra FK (bàn/đơn/nhân viên) — soft hay hard? | | |
| TC-BR-011 | Branch | Delete/FK | P1 | Critical | Chi nhánh còn bàn/đơn | DELETE /:id | — | ⚠️ASSUMED: chặn/soft-delete để không mồ côi dữ liệu. Kiểm tra | | |
| TC-BR-012 | Branch | Permission | P1 | High | WAITER | POST / | Bearer | 403 | | |
| TC-BR-013 | Branch | Business/hours | P2 | Medium | closing < opening | Tạo chi nhánh qua đêm 18:00-02:00 | như bên | 201; logic đặt bàn hỗ trợ qua nửa đêm (đã test ở reservation) | | |

---

## PART G — Company
Base `/api/internal/companies` — `adminOnly`=SUPER/COMPANY_ADMIN; **service chặn COMPANY_ADMIN tạo mới**.
`createCompanySchema`: name min1, logo_url URL|"", email email|"".

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-CO-001 | Company | Create | P1 | High | SUPER_ADMIN | POST / | `{name}` | 201 | | |
| TC-CO-002 | Company | Create/permission | P1 | Critical | COMPANY_ADMIN | POST / | Bearer | 403 (service chặn COMPANY_ADMIN tạo công ty) | | |
| TC-CO-003 | Company | Create/validation | P1 | High | SUPER_ADMIN | thiếu name | bỏ | 400 "Vui lòng nhập tên công ty" | | |
| TC-CO-004 | Company | Create/logo | P2 | Low | SUPER_ADMIN | logo_url không URL | `"abc"` | 400 "Logo phải là URL hợp lệ" | | |
| TC-CO-005 | Company | Create/email | P2 | Low | SUPER_ADMIN | email = "" | rỗng | 201 (cho phép rỗng) | | |
| TC-CO-006 | Company | List/scope | P1 | Critical | COMPANY_ADMIN | GET / | Bearer | Chỉ công ty của mình (service siết) | | |
| TC-CO-007 | Company | Get/cross | P1 | Critical | COMPANY_ADMIN X | GET /:id công ty Y | id Y | 403/404 | | |
| TC-CO-008 | Company | Update | P2 | Medium | SUPER_ADMIN / COMPANY_ADMIN own | PUT /:id | valid | 200 | | |
| TC-CO-009 | Company | Update/empty | P2 | Low | — | PUT /:id `{}` | rỗng | 400 "Không có dữ liệu cập nhật" | | |
| TC-CO-010 | Company | Update/status | P1 | High | SUPER_ADMIN | PATCH status INACTIVE | — | Công ty INACTIVE ẩn khỏi public /companies | | |

---

## PART H — Customer (điều chỉnh điểm — cấp quản lý)
Base `/api/internal/customers` — COMPANY_ADMIN + SUPER_ADMIN. `POST /:id/points` với `{points}` (int ≥ 0) — **set điểm tuyệt đối** (setPointsAndProcessRank → tính lại hạng).

| ID | Module | Feature | Priority | Severity | Preconditions | Test Steps | Test Data | Expected Result | Actual | Status |
|----|--------|---------|----------|----------|---------------|------------|-----------|-----------------|--------|--------|
| TC-ICUS-001 | Int Customer | Adjust points | P1 | Critical | COMPANY_ADMIN | POST /:id/points | `{points:15000000}` | 200; set điểm tuyệt đối, tính lại hạng (→ silver) | | |
| TC-ICUS-002 | Int Customer | Adjust/validation | P1 | High | — | points = -100 | âm | 400 "points không được âm" | | |
| TC-ICUS-003 | Int Customer | Adjust/validation | P2 | Medium | — | points = 1.5 | thập phân | 400 "points phải là số nguyên" | | |
| TC-ICUS-004 | Int Customer | Adjust/type | P2 | Medium | — | points = "abc" | string | 400 "points phải là số" | | |
| TC-ICUS-005 | Int Customer | Adjust/permission | P1 | Critical | BRANCH_MANAGER | POST /:id/points | Bearer | 403 (chỉ COMPANY_ADMIN/SUPER_ADMIN) | | |
| TC-ICUS-006 | Int Customer | Adjust/not-found | P2 | Medium | id lạ | POST /:id/points | — | 404 "Không tìm thấy khách hàng" | | |
| TC-ICUS-007 | Int Customer | Adjust/rank-recompute | P1 | High | Set điểm về 0 | POST /:id/points 0 | `{points:0}` | Tính lại hạng theo ngưỡng (có thể rớt về normal) | | |
| TC-ICUS-008 | Int Customer | Adjust/concurrency | P2 | High | 2 request set điểm | đồng thời | — | lockCustomer (FOR UPDATE) → nhất quán | | |
| TC-ICUS-009 | Int Customer | Adjust/audit | P2 | Medium | — | POST /:id/points | — | Ghi audit log (ai chỉnh điểm khách nào) | | |
| TC-ICUS-010 | Int Customer | Adjust/boundary | P2 | Medium | — | points cực lớn (80tr+) | như bên | Lên platinum, reset điểm về 0 theo computeRank | | |
