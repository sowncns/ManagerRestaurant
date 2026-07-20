# ĐẶC TẢ USE CASE – HỆ THỐNG QUẢN LÝ CHUỖI NHÀ HÀNG

> Tài liệu mô tả các tác nhân (actor) và ca sử dụng (use case) của hệ thống backend
> quản lý chuỗi nhà hàng đa công ty – đa chi nhánh: đặt món/POS, thanh toán, kho, đặt bàn,
> nhân viên & phân quyền. Dùng cho báo cáo.

---

## 1. Tác nhân (Actors)

### 1.1. Nhóm khách hàng
| Tác nhân | Mô tả |
|----------|-------|
| **Khách vãng lai (Guest)** | Chưa đăng nhập. Xem công ty/chi nhánh/thực đơn công khai, gửi yêu cầu đặt bàn không cần tài khoản. |
| **Khách hàng (Customer)** | Có tài khoản. Quản lý hồ sơ, điểm tích lũy/số dư, voucher, đặt bàn, thanh toán QR tại bàn. |

### 1.2. Nhóm nội bộ (7 vai trò – RBAC theo phạm vi)
| Tác nhân | Phạm vi dữ liệu |
|----------|-----------------|
| **SUPER_ADMIN** | Toàn hệ thống – mọi công ty, mọi chi nhánh. |
| **COMPANY_ADMIN** | Toàn bộ chuỗi trong công ty của mình. |
| **BRANCH_MANAGER** | Chỉ chi nhánh của mình. |
| **RECEPTIONIST** (Lễ tân) | Đặt bàn, check-in tại chi nhánh. |
| **WAITER** (Phục vụ) | Gọi món, mở bàn, phục vụ tại chi nhánh. |
| **CASHIER** (Thu ngân) | Lập hóa đơn, xử lý thanh toán, giảm giá/void món. |
| **KITCHEN** (Bếp) | Xử lý hàng bếp theo loại bếp (kitchen_type). |

**Quy tắc phân quyền:** mỗi vai trò chỉ được cấp/quản lý nhân viên có vai trò **thấp hơn** mình
(riêng SUPER_ADMIN toàn quyền). Dữ liệu luôn bị giới hạn theo phạm vi công ty/chi nhánh của người dùng.

### 1.3. Tác nhân hệ thống (ngoài)
| Tác nhân | Vai trò |
|----------|---------|
| **Cổng thanh toán PayOS** | Nhận yêu cầu tạo link/QR thanh toán và gọi lại webhook xác nhận. |
| **Dịch vụ Email (SMTP)** | Gửi email xác thực tài khoản, quên mật khẩu. |

---

## 2. Danh sách Use Case theo nhóm chức năng

### UC nhóm A – Khách hàng (Customer/Guest)
- A1. Đăng ký tài khoản & xác thực email
- A2. Đăng nhập / Làm mới token / Đăng xuất
- A3. Quên & đặt lại mật khẩu
- A4. Quản lý hồ sơ cá nhân
- A5. Thiết lập & xác minh mã PIN thanh toán
- A6. Nạp/tích điểm & xem lịch sử giao dịch
- A7. Xem danh sách voucher của tôi
- A8. Đặt bàn trực tuyến (khách có tài khoản)
- A9. Đặt bàn không cần tài khoản (khách vãng lai)
- A10. Xem thông tin công ty/chi nhánh/thực đơn công khai
- A11. Thanh toán QR tại bàn (xác nhận bằng PIN)
- A12. Thanh toán online qua PayOS

### UC nhóm B – Vận hành phục vụ / POS
- B1. Quản lý khu vực (section) & bàn ăn
- B2. Mở bàn & tạo đơn gọi món
- B3. Thêm món vào đơn đang phục vụ
- B4. Quét QR thành viên để áp ưu đãi vào đơn
- B5. Yêu cầu & duyệt hủy món (cancel request)

### UC nhóm C – Bếp (Kitchen)
- C1. Xem hàng đợi bếp (real-time qua SSE)
- C2. Bắt đầu nấu / cập nhật trạng thái món
- C3. Hoàn tất món bằng quét QR
- C4. Xử lý đơn đặt trước (pre-order) của khách đặt bàn
- C5. Xem lịch sử bếp

### UC nhóm D – Thu ngân & Thanh toán
- D1. Tạo phiếu kiểm món / checkout intent
- D2. Quét QR khách để định danh & áp ưu đãi
- D3. Void món / giảm giá từng món
- D4. Lập hóa đơn (VAT) & xác nhận đã thanh toán
- D5. Xem danh sách hóa đơn

### UC nhóm E – Đặt bàn nội bộ (Lễ tân)
- E1. Tiếp nhận & quản lý đơn đặt bàn
- E2. Gợi ý & gán bàn cho đơn đặt
- E3. Check-in khách & cảnh báo sắp đến giờ (SSE)

### UC nhóm F – Kho & Cung ứng
- F1. Quản lý nguyên liệu & cảnh báo tồn thấp
- F2. Định lượng công thức món (recipe)
- F3. Ghi giao dịch kho & ước lượng nguyên liệu cho đơn
- F4. Quản lý nhà cung cấp
- F5. Phiếu nhập kho (DRAFT → CONFIRMED, tự cộng tồn)

### UC nhóm G – Thực đơn & Khuyến mãi
- G1. Quản lý danh mục & món ăn (menu)
- G2. Bật/tắt tình trạng còn/hết món
- G3. Quản lý combo món
- G4. Quản lý voucher & phát cho khách
- G5. Cấu hình tỷ lệ hoàn tiền (cashback) theo hạng

### UC nhóm H – Quản trị & Báo cáo
- H1. Quản lý công ty
- H2. Quản lý chi nhánh
- H3. Quản lý nhân viên & phân quyền
- H4. Điều chỉnh điểm khách hàng
- H5. Báo cáo doanh thu & món bán chạy
- H6. Dashboard KPI tổng hợp
- H7. Nhật ký hệ thống (audit log)

---

## 3. Đặc tả chi tiết các Use Case chính

> Định dạng: Mã UC – Tên · Tác nhân · Điều kiện trước · Luồng chính · Luồng thay thế/ngoại lệ · Điều kiện sau.

---

### UC-A1 — Đăng ký tài khoản & xác thực email
- **Tác nhân:** Khách vãng lai.
- **Mô tả:** Khách tạo tài khoản mới, hệ thống gửi email chứa link xác thực.
- **Điều kiện trước:** Email chưa tồn tại trong hệ thống.
- **Luồng chính:**
  1. Khách nhập email, mật khẩu, họ tên, số điện thoại (`POST /customer/auth/register`).
  2. Hệ thống kiểm tra hợp lệ (Zod), mã hóa mật khẩu (bcrypt), tạo tài khoản trạng thái *chưa xác thực*.
  3. Hệ thống sinh token xác thực, gửi email chứa link.
  4. Khách bấm link → `GET /customer/auth/verify-email?token=...` → tài khoản chuyển sang *đã xác thực*.
- **Luồng thay thế:**
  - 3a. Không nhận được email → khách yêu cầu gửi lại (`POST /customer/auth/request-verification`).
- **Ngoại lệ:**
  - Email đã tồn tại → báo lỗi trùng.
  - Token hết hạn/không hợp lệ → yêu cầu gửi lại.
  - Vượt rate-limit đăng ký → chặn tạm thời.
- **Điều kiện sau:** Tài khoản tồn tại; sau khi verify mới được dùng các chức năng cần email đã xác thực.

---

### UC-A2 — Đăng nhập / Làm mới token / Đăng xuất
- **Tác nhân:** Khách hàng (và tương tự cho nội bộ ở `internal/auth`).
- **Điều kiện trước:** Đã có tài khoản.
- **Luồng chính:**
  1. Khách gửi email + mật khẩu (`POST /customer/auth/login`).
  2. Hệ thống xác minh mật khẩu, cấp **access token** + **refresh token** (JWT qua cookie).
  3. Khi access token hết hạn → `POST /refresh-token` cấp token mới bằng refresh token.
  4. Đăng xuất (`POST /logout`) → thu hồi/hủy cookie phiên.
- **Ngoại lệ:** Sai thông tin đăng nhập → từ chối; vượt rate-limit → chặn tạm thời.
- **Điều kiện sau:** Người dùng có phiên hợp lệ để gọi các API cần xác thực.

---

### UC-A3 — Quên & đặt lại mật khẩu
- **Tác nhân:** Khách hàng.
- **Luồng chính:**
  1. Khách nhập email (`POST /forgot-password`) → hệ thống gửi email chứa token đặt lại.
  2. Khách nhập token + mật khẩu mới (`POST /reset-password`) → cập nhật mật khẩu.
- **Ngoại lệ:** Token sai/hết hạn → từ chối. (Không tiết lộ email có tồn tại hay không.)

---

### UC-A4 — Quản lý hồ sơ cá nhân
- **Tác nhân:** Khách hàng.
- **Điều kiện trước:** Đã đăng nhập; cập nhật hồ sơ yêu cầu **email đã xác thực**.
- **Luồng chính:**
  1. Xem hồ sơ (`GET /customer/profile/me`).
  2. Cập nhật thông tin (`PUT /customer/profile/me`).
- **Điều kiện sau:** Thông tin cá nhân được cập nhật.

---

### UC-A5 — Thiết lập & xác minh mã PIN thanh toán
- **Tác nhân:** Khách hàng.
- **Điều kiện trước:** Email đã xác thực (để thiết lập PIN).
- **Luồng chính:**
  1. Khách thiết lập PIN (`POST /customer/profile/setup-pin`).
  2. Khi thanh toán/xem giao dịch, khách xác minh PIN (`POST /customer/profile/verify-pin`).
- **Ngoại lệ:** PIN sai → từ chối thao tác cần PIN.
- **Điều kiện sau:** Các chức năng nhạy cảm (xem lịch sử giao dịch, xác nhận thanh toán QR) được mở khóa bằng PIN.

---

### UC-A6 — Nạp/tích điểm & xem lịch sử giao dịch
- **Tác nhân:** Khách hàng.
- **Luồng chính:**
  1. Cộng điểm/số dư (`POST /customer/profile/add-points`, yêu cầu email đã xác thực).
  2. Xem lịch sử giao dịch (`GET /customer/profile/transactions`, yêu cầu PIN hợp lệ).
- **Điều kiện sau:** Số dư điểm được cập nhật; lịch sử ghi nhận.

---

### UC-A7 — Xem voucher của tôi
- **Tác nhân:** Khách hàng.
- **Luồng chính:** Khách xem các voucher được cấp còn hiệu lực (`GET /customer/voucher`).

---

### UC-A8 — Đặt bàn trực tuyến (khách có tài khoản)
- **Tác nhân:** Khách hàng.
- **Điều kiện trước:** Đăng nhập + email đã xác thực (khi tạo đơn).
- **Luồng chính:**
  1. Khách chọn chi nhánh, thời gian, số người (`POST /customer/reservations`).
  2. Hệ thống tạo đơn đặt bàn trạng thái chờ xác nhận.
  3. Khách xem danh sách/chi tiết (`GET /customer/reservations`, `/:id`).
  4. Khách hủy đơn nếu cần (`DELETE /customer/reservations/:id`).
- **Ngoại lệ:** Thời gian không hợp lệ / ngoài giờ hoạt động → từ chối.
- **Điều kiện sau:** Đơn đặt bàn hiển thị cho lễ tân xử lý (UC-E1).

---

### UC-A9 — Đặt bàn không cần tài khoản (khách vãng lai)
- **Tác nhân:** Khách vãng lai.
- **Luồng chính:** Khách nhập tên, SĐT, chi nhánh, thời gian, số người (`POST /public/reservations`) → tạo đơn đặt bàn.
- **Ngoại lệ:** Thiếu/không hợp lệ dữ liệu → từ chối (Zod validate).

---

### UC-A10 — Xem thông tin công khai
- **Tác nhân:** Khách vãng lai / Khách hàng.
- **Luồng chính:** Xem danh sách công ty, chi nhánh, danh mục và thực đơn, chi tiết món
  (`GET /public/companies`, `/branches/:id`, `/companies/:id/menu`, `/menu-items/:id`). Không cần đăng nhập.

---

### UC-A11 — Thanh toán QR tại bàn (xác nhận bằng PIN) ⭐
- **Tác nhân chính:** Khách hàng. **Tác nhân phụ:** Thu ngân/Phục vụ (phía nội bộ).
- **Điều kiện trước:** Khách đã đăng nhập, email đã xác thực, đã thiết lập PIN; bàn có yêu cầu thanh toán đang chờ.
- **Luồng chính:**
  1. Thu ngân tạo yêu cầu thanh toán cho bàn (`POST /internal/qr-payment/request`).
  2. Khách xem thanh toán đang chờ (`GET /customer/qr-payment/pending`), có thể nhận cập nhật real-time qua SSE (`/stream`).
  3. Khách xác nhận thanh toán bằng PIN (`POST /customer/qr-payment/confirm`).
  4. Hệ thống trừ số dư/điểm của khách, ghi nhận giao dịch, cập nhật trạng thái yêu cầu.
  5. Thu ngân theo dõi trạng thái (`GET /internal/qr-payment/status/:requestId`) → thanh toán thành công.
  6. Khách xem lịch sử hóa đơn (`GET /customer/qr-payment/invoices`).
- **Luồng thay thế:**
  - Quét mã: khách sinh token (`/generate-token`) hoặc quét token (`/scan-token`) để định danh nhanh tại quầy.
  - Thu ngân hủy yêu cầu (`POST /internal/qr-payment/cancel`).
- **Ngoại lệ:** PIN sai, số dư không đủ, yêu cầu hết hạn/đã hủy → từ chối.
- **Điều kiện sau:** Hóa đơn được thanh toán; số dư khách giảm; giao dịch được ghi.

---

### UC-A12 — Thanh toán online qua PayOS ⭐
- **Tác nhân chính:** Khách hàng. **Tác nhân phụ:** Cổng PayOS.
- **Luồng chính:**
  1. Khách tạo yêu cầu thanh toán (`POST /customer/payment`) → hệ thống gọi PayOS tạo link/QR.
  2. Khách thanh toán trên cổng PayOS.
  3. PayOS gọi lại webhook (`POST /api/webhook`) → hệ thống xác thực chữ ký và cập nhật trạng thái đơn/hóa đơn.
- **Ngoại lệ:** Webhook sai chữ ký → bỏ qua; thanh toán thất bại/hủy → giữ trạng thái chưa thanh toán.
- **Điều kiện sau:** Trạng thái thanh toán được đồng bộ theo kết quả PayOS.

---

### UC-B1 — Quản lý khu vực & bàn ăn
- **Tác nhân:** BRANCH_MANAGER (tạo/sửa/xóa khu vực & xóa bàn); WAITER trở lên (tạo/sửa bàn, đổi trạng thái).
- **Luồng chính:**
  1. Quản lý xem/tạo/sửa/xóa khu vực (`/internal/dining-tables/sections`).
  2. Nhân viên xem/tạo/sửa bàn, đổi trạng thái bàn (`/internal/dining-tables/tables`, `.../:id/status`).
- **Quy tắc:** Xóa bàn chỉ dành cho quản lý; trạng thái bàn: AVAILABLE / SERVING / RESERVED…
- **Điều kiện sau:** Sơ đồ bàn phản ánh đúng hiện trạng để phục vụ.

---

### UC-B2 — Mở bàn & tạo đơn gọi món ⭐
- **Tác nhân:** WAITER (và các vai trò có quyền ghi).
- **Điều kiện trước:** Bàn ở trạng thái AVAILABLE / SERVING / RESERVED; món ăn ACTIVE.
- **Luồng chính:**
  1. Phục vụ chọn bàn và các món (`POST /internal/orders`).
  2. Hệ thống kiểm tra trạng thái bàn hợp lệ và món còn bán → tạo đơn, các món ở trạng thái bếp **WAITING**.
  3. Bàn chuyển sang SERVING.
- **Ngoại lệ:** Bàn không ở trạng thái cho phép, hoặc món đã ngừng bán → từ chối.
- **Điều kiện sau:** Đơn được tạo, hàng bếp nhận món (UC-C1).

---

### UC-B3 — Thêm món vào đơn đang phục vụ
- **Tác nhân:** WAITER.
- **Điều kiện trước:** Đơn chưa COMPLETED/CANCELLED.
- **Luồng chính:** Phục vụ thêm món (`PUT /internal/orders/:id/items`) → món mới vào hàng bếp trạng thái WAITING.
- **Ngoại lệ:** Đơn đã hoàn tất/đã hủy → không cho thêm.

---

### UC-B4 — Quét QR thành viên áp ưu đãi vào đơn
- **Tác nhân:** WAITER.
- **Luồng chính:** Phục vụ quét QR khách (`POST /internal/orders/:id/scan-qr`) → gắn khách hàng thành viên vào đơn để tính điểm/ưu đãi khi thanh toán.

---

### UC-B5 — Yêu cầu & duyệt hủy món (Cancel request)
- **Tác nhân:** Người yêu cầu (nhân viên phục vụ); Người duyệt (quản lý/thu ngân theo phân quyền).
- **Luồng chính:**
  1. Nhân viên tạo yêu cầu hủy món.
  2. Người có quyền xem danh sách (`GET /internal/cancel-requests`).
  3. Duyệt (`.../accept`) hoặc từ chối kèm lý do (`.../reject`).
  4. Người yêu cầu có thể rút lại yêu cầu (`.../withdraw`).
- **Điều kiện sau:** Món được hủy hợp lệ (có kiểm soát), tránh gian lận.

---

### UC-C1 — Xem hàng đợi bếp (real-time) ⭐
- **Tác nhân:** KITCHEN.
- **Điều kiện trước:** Nhân viên bếp thuộc một loại bếp (kitchen_type).
- **Luồng chính:**
  1. Bếp xem hàng đợi các món WAITING (`GET /internal/orders/kitchen/queue`), chỉ hiển thị món thuộc đúng loại bếp của mình.
  2. Nhận cập nhật đẩy real-time qua SSE (`GET /internal/orders/kitchen/stream`) thay cho polling.
- **Điều kiện sau:** Bếp thấy đúng phần việc của mình.

---

### UC-C2 — Bắt đầu nấu / cập nhật trạng thái món
- **Tác nhân:** KITCHEN.
- **Luồng trạng thái:** WAITING → (nấu) → READY → SERVED (hoặc CANCELLED).
- **Luồng chính:**
  1. Bếp bắt đầu nấu cả đơn (`POST /internal/orders/:id/cook`) hoặc cập nhật từng món (`PATCH /internal/orders/items/:itemId/kitchen-status`).
  2. Khi món rời WAITING sang trạng thái đã nấu (READY/SERVED), hệ thống **trừ kho nguyên liệu đúng một lần** theo công thức.
- **Quy tắc phân quyền:** Bếp chỉ thao tác được món thuộc đúng `kitchen_type` của mình.
- **Điều kiện sau:** Trạng thái món cập nhật; tồn kho giảm tương ứng.

---

### UC-C3 — Hoàn tất món bằng quét QR
- **Tác nhân:** KITCHEN.
- **Luồng chính:** Bếp quét QR của món (`POST /internal/orders/kitchen/scan`) → món chuyển READY + trừ kho.

---

### UC-C4 — Xử lý đơn đặt trước (Pre-order) của khách đặt bàn
- **Tác nhân:** KITCHEN.
- **Điều kiện trước:** Có đơn đặt bàn kèm chọn món trước (đơn trạng thái SCHEDULED, chưa gán bàn/nhân viên).
- **Luồng chính:**
  1. Bếp xem danh sách pre-order (`GET /internal/orders/kitchen/preorders`).
  2. Xác nhận (`.../:reservationId/confirm`) hoặc hủy (`.../cancel`) khi khách đến/không đến.
- **Điều kiện sau:** Món pre-order được đưa vào chế biến đúng thời điểm.

---

### UC-C5 — Xem lịch sử bếp
- **Tác nhân:** KITCHEN.
- **Luồng chính:** Xem các món đã xử lý (`GET /internal/orders/kitchen/history`), lọc theo loại bếp.

---

### UC-D1 — Tạo phiếu kiểm món / Checkout intent ⭐
- **Tác nhân:** Nhân viên phục vụ trở lên (staffUp).
- **Luồng chính:**
  1. Lấy phiếu kiểm món của bàn (`GET /internal/checkout/table/:tableId/kiem-mon`).
  2. Tạo/lấy checkout intent cho bàn (`GET /internal/checkout/intent/:tableId`); hủy nếu cần (`DELETE`).
- **Điều kiện sau:** Có bảng tạm tính để thu ngân xử lý.

---

### UC-D2 — Quét QR khách để định danh & áp ưu đãi
- **Tác nhân:** Thu ngân/phục vụ.
- **Luồng chính:**
  1. Quét QR khách (`POST /internal/checkout/scan`) để gắn thành viên.
  2. Kiểm tra & áp voucher cho bàn (`POST /internal/checkout/validate-voucher`, `GET .../table/:tableId/voucher`).
- **Ngoại lệ:** Voucher không hợp lệ/hết hạn/không đủ điều kiện → từ chối áp.

---

### UC-D3 — Void món / Giảm giá từng món
- **Tác nhân:** CASHIER trở lên (cashierUp).
- **Luồng chính:**
  1. Void một món khỏi hóa đơn (`POST /internal/checkout/items/:order_item_id/void`, kèm lý do).
  2. Giảm giá một món (`POST .../items/:order_item_id/discount`).
- **Điều kiện sau:** Tổng tiền cập nhật; thao tác được ghi log (audit).

---

### UC-D4 — Lập hóa đơn (VAT) & xác nhận thanh toán ⭐
- **Tác nhân:** CASHIER trở lên.
- **Điều kiện trước:** Bàn có đơn đang phục vụ đã kiểm món.
- **Luồng chính:**
  1. Lưu/lấy cấu hình VAT cho bàn (`POST/GET /internal/checkout/table/:tableId/vat`).
  2. Tạo hóa đơn (`POST /internal/checkout/create-invoice`) – tính tổng, VAT, giảm giá, voucher.
  3. Khách thanh toán (tiền mặt / QR nội bộ UC-A11 / PayOS UC-A12).
  4. Thu ngân đánh dấu đã thanh toán (`POST /internal/checkout/invoices/:invoiceId/pay`).
- **Điều kiện sau:** Hóa đơn hoàn tất; bàn được giải phóng; dữ liệu vào báo cáo doanh thu.
- **Ghi chú:** Hệ thống chuẩn bị dữ liệu hóa đơn; việc in do frontend đảm nhiệm.

---

### UC-D5 — Xem danh sách hóa đơn
- **Tác nhân:** CASHIER trở lên.
- **Luồng chính:** Xem/lọc hóa đơn (`GET /internal/checkout/invoices`), xem hóa đơn mới nhất của bàn (`.../table/:tableId/latest-invoice`).

---

### UC-E1 — Tiếp nhận & quản lý đơn đặt bàn
- **Tác nhân:** RECEPTIONIST (deskRoles).
- **Luồng chính:**
  1. Lễ tân xem danh sách/chi tiết đơn đặt (`GET /internal/reservations`, `/:id`), lọc theo phạm vi chi nhánh.
  2. Tạo đơn tại quầy (`POST`), cập nhật (`PUT`), đổi trạng thái (`PATCH .../status`), hủy (`DELETE`).
- **Điều kiện sau:** Đơn đặt bàn được quản lý theo vòng đời.

---

### UC-E2 — Gợi ý & gán bàn cho đơn đặt
- **Tác nhân:** RECEPTIONIST.
- **Luồng chính:**
  1. Xem gợi ý bàn phù hợp (`GET /internal/reservations/:id/suggest-table`).
  2. Gán bàn (`POST .../:id/assign-table`).
- **Ngoại lệ:** Không còn bàn phù hợp → thông báo để xử lý thủ công.

---

### UC-E3 — Check-in khách & cảnh báo sắp đến giờ ⭐
- **Tác nhân:** RECEPTIONIST.
- **Luồng chính:**
  1. Hệ thống cảnh báo các đơn sắp đến giờ (`GET /internal/reservations/alerts`, cấu hình `RESERVATION_ALERT_MINUTES`), đẩy real-time qua SSE (`/stream`).
  2. Khách đến → lễ tân check-in và gán bàn (`POST /internal/reservations/:id/checkin`).
- **Điều kiện sau:** Khách được nhận bàn; bàn chuyển sang phục vụ.

---

### UC-F1 — Quản lý nguyên liệu & cảnh báo tồn thấp
- **Tác nhân:** Nhân viên xem (staffRead); BRANCH_MANAGER tạo/sửa/xóa (managerOnly).
- **Luồng chính:**
  1. Xem danh sách nguyên liệu, chi tiết, danh sách tồn thấp (`GET /internal/inventory/ingredients`, `.../low-stock`).
  2. Quản lý tạo/sửa/xóa nguyên liệu.
- **Điều kiện sau:** Danh mục nguyên liệu và cảnh báo tồn được duy trì.

---

### UC-F2 — Định lượng công thức món (Recipe)
- **Tác nhân:** BRANCH_MANAGER.
- **Luồng chính:** Xem công thức của món (`GET .../recipes/menu-item/:menuItemId`); thiết lập/sửa/xóa dòng công thức (`PUT`/`DELETE`).
- **Điều kiện sau:** Công thức làm cơ sở trừ kho tự động khi nấu (UC-C2).

---

### UC-F3 — Ghi giao dịch kho & ước lượng nguyên liệu
- **Tác nhân:** BRANCH_MANAGER (ghi); nhân viên (xem).
- **Luồng chính:**
  1. Ghi giao dịch kho thủ công (`POST /internal/inventory/transactions`).
  2. Xem lịch sử giao dịch (`GET .../transactions`).
  3. Ước lượng nguyên liệu cần cho một đơn (`GET .../estimate/order/:orderId`).

---

### UC-F4 — Quản lý nhà cung cấp
- **Tác nhân:** BRANCH_MANAGER.
- **Luồng chính:** Xem/tạo/sửa/xóa nhà cung cấp (`/internal/procurement/suppliers`).

---

### UC-F5 — Phiếu nhập kho ⭐
- **Tác nhân:** BRANCH_MANAGER.
- **Luồng chính:**
  1. Tạo phiếu nhập trạng thái **DRAFT** (`POST /internal/procurement/receipts`) gồm nhiều dòng nguyên liệu.
  2. Xác nhận phiếu (`POST .../:id/confirm`) → chuyển **CONFIRMED**, **tự cộng tồn kho** và sinh `inventory_transactions` gắn loại `PURCHASE_RECEIPT`.
  3. Hủy phiếu (`DELETE .../:id`) khi còn DRAFT.
- **Điều kiện sau:** Tồn kho tăng theo phiếu; giao dịch được ghi và audit.

---

### UC-G1 — Quản lý danh mục & món ăn
- **Tác nhân:** COMPANY_ADMIN (adminOnly ghi); nhân viên xem (canRead).
- **Luồng chính:** Xem/tạo/sửa/xóa danh mục (`/internal/menu-categories`) và món ăn (`/internal/menu-items`).

### UC-G2 — Bật/tắt tình trạng còn/hết món
- **Tác nhân:** COMPANY_ADMIN.
- **Luồng chính:** Đổi tình trạng còn/hết của món (`PATCH /internal/menu-items/:id/availability`).

### UC-G3 — Quản lý combo món
- **Tác nhân:** COMPANY_ADMIN (companyAdminOnly ghi); nhân viên xem.
- **Luồng chính:** Xem/tạo/sửa/xóa combo giá cố định gồm nhiều món (`/internal/combos`); hiển thị công khai qua `public`.

### UC-G4 — Quản lý voucher & phát cho khách
- **Tác nhân:** Quản trị (COMPANY_ADMIN/BRANCH_MANAGER theo phạm vi).
- **Luồng chính:** Tạo/sửa/xóa voucher (`/internal/vouchers`); phát cho khách (`POST .../:id/assign`). Voucher được validate khi checkout (UC-D2).

### UC-G5 — Cấu hình tỷ lệ hoàn tiền theo hạng
- **Tác nhân:** Quản trị.
- **Luồng chính:** Xem danh sách và cập nhật tỷ lệ cashback theo từng hạng khách (`GET/PUT /internal/cashback-rates/:rank`).

---

### UC-H1 — Quản lý công ty
- **Tác nhân:** SUPER_ADMIN (tạo công ty & COMPANY_ADMIN đầu tiên); COMPANY_ADMIN (sửa công ty của mình).
- **Luồng chính:** Xem/tạo/sửa công ty (`/internal/companies`).

### UC-H2 — Quản lý chi nhánh
- **Tác nhân:** SUPER_ADMIN / COMPANY_ADMIN.
- **Luồng chính:** Xem/tạo/sửa/đổi trạng thái/xóa mềm chi nhánh (`/internal/branches`), lọc theo phạm vi.

### UC-H3 — Quản lý nhân viên & phân quyền ⭐
- **Tác nhân:** SUPER_ADMIN / COMPANY_ADMIN / BRANCH_MANAGER (theo phạm vi).
- **Điều kiện trước:** Người thao tác chỉ quản lý được vai trò **thấp hơn** mình.
- **Luồng chính:**
  1. Xem danh sách vai trò, loại bếp, nhân viên (`GET /internal/employees/roles`, `/kitchen-types`, `/`).
  2. Tạo/sửa nhân viên, đổi trạng thái, đặt lại mật khẩu (`POST`, `PUT`, `PATCH .../status`, `POST .../:id/reset-password`).
- **Ngoại lệ:** Cấp vai trò cao hơn/bằng mình, hoặc ngoài phạm vi → từ chối.
- **Điều kiện sau:** Nhân sự và quyền hạn được quản lý an toàn.

### UC-H4 — Điều chỉnh điểm khách hàng
- **Tác nhân:** Quản trị.
- **Luồng chính:** Cộng/trừ điểm cho khách (`POST /internal/customers/:id/points`) – có kiểm soát & audit.

### UC-H5 — Báo cáo doanh thu & món bán chạy
- **Tác nhân:** Quản trị (theo phạm vi).
- **Luồng chính:** Xem doanh thu theo ngày/tháng (`GET /internal/reports/revenue`), món bán chạy (`.../top-items`), lọc theo chi nhánh.

### UC-H6 — Dashboard KPI tổng hợp
- **Tác nhân:** Quản trị.
- **Luồng chính:** Xem KPI tổng hợp (`GET /internal/reports/dashboard`); riêng SUPER_ADMIN xem toàn hệ thống (`.../admin-overview`).

### UC-H7 — Nhật ký hệ thống (Audit log)
- **Tác nhân:** Quản trị.
- **Luồng chính:** Xem nhật ký thao tác (`GET /internal/audit-logs`). Hệ thống tự động ghi log qua middleware cho các thao tác nội bộ: đăng nhập, thao tác nhân viên, xác nhận phiếu nhập, đặt bàn, combo…

---

## 4. Ghi chú kỹ thuật liên quan đến Use Case
- **Bảo mật:** JWT (access/refresh qua cookie), bcrypt băm mật khẩu, Helmet, rate-limit ở các API nhạy cảm (login/register/forgot).
- **Phân quyền theo phạm vi (RBAC):** mọi truy vấn dữ liệu bị giới hạn theo `company_id`/`branch_id` của người dùng; middleware kiểm tra vai trò tối thiểu (`staffRead`, `staffUp`, `cashierUp`, `managerOnly`, `adminOnly`, `companyAdminOnly`).
- **Real-time (SSE):** hàng đợi bếp, cảnh báo đặt bàn, và thanh toán QR đang chờ dùng Server-Sent Events thay cho polling.
- **Tự động hóa nghiệp vụ:** trừ kho tự động khi nấu món (theo recipe), cộng kho khi xác nhận phiếu nhập, ghi audit log tự động cho thao tác nội bộ.
