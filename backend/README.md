# Restaurant Backend

Backend quản lý chuỗi nhà hàng (đa công ty – đa chi nhánh): đặt món / POS, thanh toán,
kho nguyên liệu, nhân viên & phân quyền theo chi nhánh.

- **Runtime:** Node.js + Express 5
- **Database:** PostgreSQL (`pg`)
- **Auth:** JWT (access/refresh qua cookie), bcrypt
- **Validate:** Zod
- **Thanh toán:** PayOS + QR payment nội bộ
- **Khác:** Redis, Nodemailer, Pino (log), Helmet, rate-limit

---

## 1. Cài đặt & chạy

```bash
npm install
cp .env.example .env   # tạo file .env và điền cấu hình (xem mục 2)
npm run dev            # chạy dev (nodemon)
npm start              # chạy production
```

Server mặc định chạy tại `http://localhost:5000`, tất cả API dưới tiền tố **`/api`**.

## 2. Biến môi trường (`.env`)

| Biến | Mô tả |
|------|-------|
| `PORT` | Cổng server (mặc định 5000) |
| `NODE_ENV` | `development` / `production` |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL |
| `REDIS_URL` | Kết nối Redis |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Khóa ký JWT |
| `JWT_ACCESS_EXPIRES` / `JWT_REFRESH_EXPIRES` | Thời hạn token |
| `CORS_ORIGINS` | Danh sách origin cho phép |
| `MAIL_USER` / `MAIL_PASS` | Tài khoản gửi email |
| `RESERVATION_ALERT_MINUTES` | Số phút trước giờ hẹn bắt đầu cảnh báo lễ tân (mặc định 30) |
| `PAYOS_CLIENT_ID` / `PAYOS_API_KEY` / `PAYOS_CHECKSUM_KEY` | Cấu hình PayOS |

## 3. Cấu trúc thư mục

```
src/
├─ config/            # db, env, cấu hình
├─ modules/
│  ├─ customer/       # API cho khách hàng (auth, profile, voucher, reservation, payment)
│  ├─ internal/       # API nội bộ (auth, employee, tables, order, checkout, inventory)
│  ├─ qr_payment/     # thanh toán QR (customer + internal)
│  └─ public/         # API công khai (không cần đăng nhập)
├─ routes/index.js    # gom toàn bộ route
├─ shared/            # middlewares, errors, utils (jwt, permission, mail...)
└─ server.js
```

Mỗi module theo mô hình phân tầng: `*.route.js` → `*.controller.js` → `*.service.js` → `*.repository.js` (+ `*.schema.js` để validate).

---

## 4. Phân quyền (RBAC theo phạm vi)

7 vai trò: `SUPER_ADMIN`, `COMPANY_ADMIN`, `BRANCH_MANAGER`, `RECEPTIONIST`, `WAITER`, `CASHIER`, `KITCHEN`.

| Vai trò | Phạm vi dữ liệu |
|---------|-----------------|
| `SUPER_ADMIN` | Toàn hệ thống – mọi công ty / chi nhánh |
| `COMPANY_ADMIN` | Toàn bộ chuỗi trong công ty của mình |
| `BRANCH_MANAGER` | Chỉ chi nhánh của mình |
| Nhân viên khác | Theo chi nhánh, quyền hạn hẹp |

Quy tắc cấp vai trò: chỉ được cấp/quản lý nhân viên có vai trò **thấp hơn** mình (riêng `SUPER_ADMIN` toàn quyền). Chi tiết ở `src/shared/utils/permission.js`.

---

## 5. Tiến độ chức năng

**Tất cả 20/20 chức năng đã hoàn thiện.**

### ✅ Đã hoàn thành
- [x] Quản lý chi nhánh (`internal/branch` – CRUD, xóa mềm, lọc theo phạm vi)
- [x] Quản lý bàn ăn + khu vực (`internal/tables`)
- [x] Quản lý menu (đọc/đặt món)
- [x] Khuyến mãi – voucher (`customer/voucher` + validate ở checkout)
- [x] POS bán / gọi món (`internal/order` – gồm hàng bếp)
- [x] Thanh toán (PayOS + QR nội bộ + webhook)
- [x] Tạo hóa đơn + VAT (`internal/checkout`) – *dữ liệu sẵn, việc in do frontend*
- [x] Quản lý kho nguyên liệu (`internal/inventory` – nguyên liệu, định lượng, giao dịch kho)
- [x] Quản lý nhân viên (`internal/employee` – CRUD đầy đủ)
- [x] Phân quyền theo vai trò & phạm vi chi nhánh
- [x] API công khai (`public` – công ty, chi nhánh, thực đơn)
- [x] Báo cáo doanh thu (`internal/report` – theo ngày/tháng, lọc theo chi nhánh)
- [x] Báo cáo món bán chạy (`internal/report`)
- [x] Dashboard tổng hợp KPI (`internal/report`)
- [x] **Đặt bàn** (`internal/reservation` – CRUD, đổi trạng thái, check-in gán bàn, hủy; lọc theo phạm vi chi nhánh)
- [x] **Nhà cung cấp + Phiếu nhập kho** (`internal/procurement` – NCC CRUD; phiếu nhập DRAFT→CONFIRMED tự cộng tồn kho & sinh `inventory_transactions` gắn `PURCHASE_RECEIPT`)
- [x] **Combo món** (`internal/combo` CRUD + hiển thị công khai `public` – combo giá cố định gồm nhiều món)
- [x] **Email xác thực khi đăng ký** (`customer/auth` – gửi link xác thực, verify token, gửi lại)
- [x] **Nhật ký hệ thống / audit log** (`shared/services/audit.service` + đọc qua `internal/audit-logs`; ghi log login, thao tác nhân viên, xác nhận phiếu nhập, đặt bàn, combo)

---

## 6. Danh sách API

> Tiền tố chung: **`/api`**. Cột "Auth": 🔓 công khai · 🔑 khách hàng · 🛡️ nội bộ (nhân viên).

### 6.1. Public — `/api/public` 🔓
| Method | Path | Chức năng |
|--------|------|-----------|
| GET | `/companies` | Danh sách công ty |
| GET | `/companies/:companyId` | Chi tiết công ty (kèm chi nhánh) |
| GET | `/companies/:companyId/branches` | Chi nhánh của công ty |
| GET | `/branches/:branchId` | Chi tiết chi nhánh |
| GET | `/companies/:companyId/categories` | Danh mục món |
| GET | `/companies/:companyId/menu` | Thực đơn (gom theo danh mục) |
| GET | `/menu-items/:menuItemId` | Chi tiết món |
| GET | `/companies/:companyId/combos` | Danh sách combo của công ty |
| GET | `/combos/:comboId` | Chi tiết combo (kèm món thành phần) |

### 6.2. Customer Auth — `/api/customer/auth` 🔑
| Method | Path | Chức năng |
|--------|------|-----------|
| POST | `/register` | Đăng ký |
| POST | `/login` | Đăng nhập |
| POST | `/refresh-token` | Làm mới token |
| POST | `/logout` | Đăng xuất |
| POST | `/forgot-password` | Quên mật khẩu (gửi email) |
| POST | `/reset-password` | Đặt lại mật khẩu |
| POST | `/change-password` | Đổi mật khẩu |
| GET/POST | `/verify-email` | Xác thực email (token qua query hoặc body) |
| POST | `/resend-verification` | Gửi lại email xác thực |

### 6.3. Customer Profile — `/api/customer/profile` 🔑
| Method | Path | Chức năng |
|--------|------|-----------|
| GET | `/me` | Thông tin cá nhân |
| PUT | `/me` | Cập nhật thông tin |
| GET | `/transactions` | Lịch sử giao dịch ví |
| POST | `/setup-pin` | Thiết lập mã PIN thanh toán |
| POST | `/verify-pin` | Xác thực PIN |
| POST | `/add-points` | Cộng điểm |

### 6.5. Customer Voucher & Payment 🔑
| Method | Path | Chức năng |
|--------|------|-----------|
| GET | `/customer/voucher` | Voucher của khách |
| POST | `/customer/payment/create` | Tạo link thanh toán (PayOS) |

### 6.5b. Customer Reservation — `/api/customer/reservations` 🔑
| Method | Path | Chức năng |
|--------|------|-----------|
| GET | `/` | Danh sách đặt bàn của tôi |
| GET | `/:id` | Chi tiết phiếu (kèm món đặt trước) |
| POST | `/` | Đặt bàn (chi nhánh, ngày, giờ, số khách) + **đặt món trước** (`items[]`, tùy chọn). Cần đã xác thực email |
| DELETE | `/:id` | Hủy phiếu đặt (khi chưa check-in) |

> Khách chỉ đặt chỗ, **không chọn bàn** — phiếu ở trạng thái `PENDING`. Đặt món trước tạo đơn `SCHEDULED` (chưa gán bàn, không trừ kho). Bàn được lễ tân gán và chỉ chuyển `SERVING` khi check-in.

### 6.6. QR Payment — Customer `/api/customer/qr-payment` 🔑
| Method | Path | Chức năng |
|--------|------|-----------|
| GET | `/pending` | Yêu cầu thanh toán đang chờ |
| POST | `/confirm` | Xác nhận thanh toán |
| POST | `/generate-token` | Tạo token thanh toán |
| GET | `/invoices` | Lịch sử hóa đơn |
| GET | `/invoices/:id` | Chi tiết hóa đơn |

### 6.7. Internal Auth — `/api/internal/auth` 🛡️
| Method | Path | Chức năng |
|--------|------|-----------|
| POST | `/login` | Đăng nhập nhân viên |
| POST | `/refresh-token` | Làm mới token |
| POST | `/logout` | Đăng xuất |

### 6.8. Internal Employee — `/api/internal/employees` 🛡️ (quản lý trở lên)
| Method | Path | Chức năng |
|--------|------|-----------|
| GET | `/roles` | Danh sách vai trò |
| GET | `/` | Danh sách nhân viên (lọc theo phạm vi) |
| GET | `/:id` | Chi tiết nhân viên |
| POST | `/` | Tạo nhân viên |
| PUT | `/:id` | Cập nhật nhân viên |
| PATCH | `/:id/status` | Đổi trạng thái (ACTIVE/INACTIVE/LOCKED) |
| POST | `/:id/reset-password` | Đặt lại mật khẩu |

### 6.8b. Internal Report — `/api/internal/reports` 🛡️ (quản lý trở lên)
| Method | Path | Chức năng |
|--------|------|-----------|
| GET | `/dashboard` | KPI tổng hợp (doanh thu hôm nay/tháng, order, top món, trạng thái bàn) |
| GET | `/revenue?from=&to=&groupBy=day\|month` | Báo cáo doanh thu theo thời gian |
| GET | `/top-items?from=&to=&limit=` | Món bán chạy |

> Tất cả tự lọc theo phạm vi: `COMPANY_ADMIN` → toàn công ty, `BRANCH_MANAGER` → chi nhánh của mình.

### 6.8c. Internal Branch — `/api/internal/branches` 🛡️ (quản lý trở lên)
| Method | Path | Chức năng |
|--------|------|-----------|
| GET | `/` | Danh sách chi nhánh (lọc theo phạm vi) |
| GET | `/:id` | Chi tiết chi nhánh |
| POST | `/` | Tạo chi nhánh (SUPER_ADMIN / COMPANY_ADMIN) |
| PUT | `/:id` | Cập nhật chi nhánh |
| PATCH | `/:id/status` | Đổi trạng thái (ACTIVE/INACTIVE) |
| DELETE | `/:id` | Xóa mềm (chuyển INACTIVE) |

### 6.9. Internal Tables — `/api/internal/dining-tables` 🛡️
| Method | Path | Chức năng |
|--------|------|-----------|
| GET | `/sections` · `/sections/:id` | Danh sách / chi tiết khu vực |
| POST/PUT | `/sections` · `/sections/:id` | Tạo / sửa khu vực |
| PATCH | `/sections/:id/status` | Đổi trạng thái khu vực |
| DELETE | `/sections/:id` | Xóa khu vực |
| GET | `/tables` · `/tables/:id` | Danh sách / chi tiết bàn |
| POST/PUT | `/tables` · `/tables/:id` | Tạo / sửa bàn |
| PATCH | `/tables/:id/status` | Đổi trạng thái bàn |
| DELETE | `/tables/:id` | Xóa bàn |

### 6.10. Internal Order — `/api/internal/orders` 🛡️
| Method | Path | Chức năng |
|--------|------|-----------|
| POST | `/` | Tạo order |
| GET | `/kitchen/queue` | Hàng chờ bếp |
| GET | `/table/:tableId/active` | Order đang hoạt động của bàn |
| GET | `/:id` | Chi tiết order |
| PUT | `/:id/items` | Thêm món vào order |
| POST | `/:id/scan-qr` | Quét QR thành viên |
| POST | `/:id/cook` | Bắt đầu nấu |
| PATCH | `/items/:itemId/kitchen-status` | Cập nhật trạng thái bếp |

### 6.11. Internal Checkout — `/api/internal/checkout` 🛡️
| Method | Path | Chức năng |
|--------|------|-----------|
| POST | `/create-invoice` | Tạo hóa đơn |
| GET/DELETE | `/intent/:tableId` | Lấy / hủy ý định thanh toán |
| POST | `/validate-voucher` | Kiểm tra voucher |
| GET | `/table/:tableId/voucher` | Voucher áp cho bàn |
| GET | `/table/:tableId/latest-invoice` | Hóa đơn gần nhất |
| POST/GET | `/table/:tableId/vat` | Lưu / lấy thông tin VAT |

### 6.12. Internal Inventory — `/api/internal/inventory` 🛡️
| Method | Path | Chức năng |
|--------|------|-----------|
| GET | `/ingredients` · `/ingredients/low-stock` · `/ingredients/:id` | Nguyên liệu / sắp hết / chi tiết |
| POST/PUT/DELETE | `/ingredients` · `/ingredients/:id` | Tạo / sửa / xóa nguyên liệu |
| GET/PUT | `/recipes/menu-item/:menuItemId` | Định lượng theo món |
| DELETE | `/
recipes/:id` | Xóa dòng định lượng |
| POST/GET | `/transactions` | Tạo / xem giao dịch kho |
| GET | `/estimate/order/:orderId` | Ước tính nguyên liệu cho order |

### 6.12b. Internal Reservation — `/api/internal/reservations` 🛡️ (lễ tân trở lên)
| Method | Path | Chức năng |
|--------|------|-----------|
| GET | `/?date=&status=&branch_id=&search=` | Danh sách đặt bàn (lọc theo phạm vi) |
| GET | `/:id` | Chi tiết phiếu đặt |
| POST | `/` | Tạo phiếu đặt bàn |
| PUT | `/:id` | Cập nhật phiếu đặt (khi chưa kết thúc) |
| PATCH | `/:id/status` | Đổi trạng thái (PENDING/CONFIRMED/CHECKED_IN/COMPLETED/CANCELLED/NO_SHOW) |
| GET | `/alerts` | **Cảnh báo trước giờ hẹn** (trong `RESERVATION_ALERT_MINUTES`): READY / CONFLICT (đổi bàn) / NO_TABLE |
| GET | `/:id/suggest-table` | Gợi ý bàn trống phù hợp (đủ chỗ, không trùng giờ) |
| POST | `/:id/assign-table` | Gán bàn giữ chỗ (không khóa bàn — vẫn mở cho khách vãng lai) |
| POST | `/:id/checkin` | Check-in: gán bàn + kích hoạt đơn đặt trước + bàn chuyển SERVING |
| DELETE | `/:id` | Hủy phiếu đặt |

### 6.12c. Internal Procurement — `/api/internal/procurement` 🛡️ (quản lý trở lên)
| Method | Path | Chức năng |
|--------|------|-----------|
| GET | `/suppliers?status=&search=` | Danh sách nhà cung cấp |
| GET | `/suppliers/:id` | Chi tiết NCC |
| POST/PUT | `/suppliers` · `/suppliers/:id` | Tạo / sửa NCC |
| DELETE | `/suppliers/:id` | Ngưng sử dụng NCC (xóa mềm) |
| GET | `/receipts?status=&supplierId=&limit=` | Danh sách phiếu nhập |
| GET | `/receipts/:id` | Chi tiết phiếu nhập (kèm các dòng) |
| POST | `/receipts` | Tạo phiếu nhập (trạng thái DRAFT) |
| POST | `/receipts/:id/confirm` | Xác nhận phiếu → cộng tồn kho & ghi giao dịch kho |
| DELETE | `/receipts/:id` | Hủy phiếu nhập (chỉ khi DRAFT) |

### 6.12d. Internal Combo — `/api/internal/combos` 🛡️ (quản lý trở lên)
| Method | Path | Chức năng |
|--------|------|-----------|
| GET | `/?status=&search=` | Danh sách combo |
| GET | `/:id` | Chi tiết combo (kèm món thành phần) |
| POST | `/` | Tạo combo (kèm danh sách món) |
| PUT | `/:id` | Cập nhật combo / thay danh sách món |
| DELETE | `/:id` | Ngưng sử dụng combo (xóa mềm) |

### 6.12e. Internal Audit Log — `/api/internal/audit-logs` 🛡️ (quản lý trở lên)
| Method | Path | Chức năng |
|--------|------|-----------|
| GET | `/?action=&entityType=&actorId=&from=&to=&limit=` | Nhật ký hệ thống (SUPER_ADMIN xem toàn bộ, còn lại lọc theo công ty) |

### 6.13. QR Payment — Internal `/api/internal/qr-payment` 🛡️
| Method | Path | Chức năng |
|--------|------|-----------|
| POST | `/request` | Tạo yêu cầu thanh toán |
| GET | `/status/:requestId` | Trạng thái yêu cầu |
| POST | `/cancel` | Hủy yêu cầu |

### 6.14. Webhook 🔓
| Method | Path | Chức năng |
|--------|------|-----------|
| POST | `/api/webhook` | PayOS gọi về (không auth) |

---

## 7. Ghi chú

- Định dạng response chung: `{ "message": "...", <data>: ... }`.
- Lỗi trả về qua `AppError` (400/401/403/404/409) với `{ "message": "..." }`.
- **Migration:** chạy thủ công theo thứ tự trong `src/database/migrations/` (idempotent, chạy lại an toàn):
  - `002_supplier_purchase_reservation.sql` – `suppliers`, `purchase_receipts`, `purchase_receipt_items`, bảng/cột `reservations`.
  - `003_combo_verify_audit.sql` – `combos`, `combo_items`, `email_verification_tokens` + cột `customers.email_verified`, `audit_logs`.
  - `004_consolidate_tables.sql` – gộp bảng để gọn schema: `password_reset_tokens` + `email_verification_tokens` → **`customer_tokens`** (cột `purpose`); drop các bảng chết không dùng (`promotions`, `media_files`, `wallet_adjustments`).
  - `005_reservation_preorder.sql` – nới `orders.table_id` + `waiter_id` thành nullable để chứa đơn đặt trước (`SCHEDULED`) chưa gán bàn/nhân viên. Không thêm bảng.
  - `006_drop_staff_attribution_fks.sql` – bỏ các FK "ai thực hiện" ít giá trị (giữ cột), gọn liên kết quanh `employees`.
  - `007_reduce_redundant_fks.sql` – bỏ FK **thừa** (giữ cột) để ERD gọn: `company_id` ở `carts`, `employees`, `orders`, `purchase_receipts`, `reservations` (company suy ra qua `branches`); và attribution phát voucher. `invoices.company_id` **giữ FK** vì là bản ghi tài chính.
  - `008_drop_cart_tables.sql` – **xóa hẳn** tính năng giỏ hàng: drop `cart_items`, `carts` (module `customer/cart` đã gỡ, chưa từng nối vào luồng đặt món). **Còn 32 bảng.**
  - `009_drop_menu_items_company_fk.sql` – bỏ FK thừa `menu_items.company_id` (company suy ra qua `menu_categories`); giữ cột để scope multi-tenant.
  - Vd: `psql $DATABASE_URL -f src/database/migrations/004_consolidate_tables.sql`
  - **ERD:** sơ đồ quan hệ hiện tại xem ở `docs/erd.html` (32 bảng, có cột & khóa ngoại) hoặc `ERD.pgerd` (mở bằng pgAdmin ERD Tool).
- **Xác thực email khách hàng:** đăng ký (`full_name, username, email, password`) tự gửi mail xác thực. Khách **chưa xác thực vẫn đăng nhập & xem được** (GET), nhưng bị chặn (403) mọi **thao tác nhạy cảm**: sửa hồ sơ, thiết lập PIN, cộng điểm, đặt bàn, nạp tiền (`payment/create`), xác nhận/tạo token thanh toán QR. Middleware `requireVerifiedEmail` kiểm tra trực tiếp DB.
- **PIN ví bắt buộc:** mọi thao tác/xem liên quan **ví** đều yêu cầu khách **đã thiết lập mã PIN** (`requirePaymentPin`, kiểm tra `customers.payment_pin`): xem lịch sử giao dịch ví (`profile/transactions`), nạp tiền (`payment/create`), xem/tạo/xác nhận thanh toán QR (`qr-payment/*`). Chưa có PIN → 403 "Vui lòng thiết lập mã PIN thanh toán". Thiết lập PIN qua `POST /customer/profile/setup-pin` (cần đã xác thực email). Ngoài ra `GET /customer/profile/me` **ẩn số dư ví** (`wallet_balance = null`) khi chưa có PIN; frontend dựa vào cờ `has_payment_pin` để hiển thị nút "Thiết lập PIN".
- Token nội bộ và khách hàng tách riêng qua cookie (`internalAccessToken` / `customerAccessToken`); ngoài ra hỗ trợ header `Authorization: Bearer <token>`.
