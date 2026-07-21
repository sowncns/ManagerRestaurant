# Test Case Suite — NhaHang / iGourmet

Bộ test case đầy đủ (Functional, Business Rule, Security, Permission, API Error, Edge, UI, Performance) cho toàn bộ hệ thống.

## Quy ước

- **ID**: `TC-<MODULE>-<số>` (đánh số liên tục trong mỗi module).
- **Priority**: P1 (blocker/critical flow) · P2 (important) · P3 (minor/edge).
- **Severity**: Critical · High · Medium · Low.
- **Actual Result / Status**: để trống cho tester điền (Pass/Fail/Blocked).
- Roles trong hệ thống: **Guest** (chưa đăng nhập), **Customer** (khách đăng nhập app), **Staff/Waiter**, **Kitchen**, **Cashier**, **Manager**, **Admin**, **Owner** (nhân viên internal theo `role` + `branch_id`).

## Giả định (khi tài liệu/code chưa nêu rõ) — ký hiệu `⚠️ASSUMED`

- Rate limit `authLimiter` áp cho các endpoint auth nhạy cảm → vượt ngưỡng trả **429**.
- JWT access token TTL ngắn, refresh token TTL dài (giá trị cụ thể trong `config/env`).
- Password chỉ ràng buộc `min 6` ở schema — **không** có yêu cầu độ mạnh (chữ hoa/số/ký tự đặc biệt). Test theo hiện trạng và note đề xuất.
- Không có max length ở schema cho `full_name`, `email`, `password` → kiểm tra giới hạn cột DB (thường `varchar(255)`).

## Danh mục file

| File | Module | Nhóm |
|------|--------|------|
| `01-customer-auth.md` | Customer Auth (đăng ký/đăng nhập/mật khẩu/xác thực email) | Customer |
| `02-customer-profile-voucher-reservation.md` | Profile, Voucher redeem, Reservation | Customer |
| `03-public-payment-qr.md` | Public catalog, PayOS payment, QR payment | Public/Payment |
| `04-internal-core.md` | Internal Auth, Order, Checkout, Reservation, Tables | Internal core |
| `05-internal-mgmt.md` | Voucher, Menu, Combo, Cashback, HomeBanner, Branch, Company, Customer | Internal mgmt |
| `06-internal-ops.md` | Employee, Cancel, Report, Inventory, Procurement, Audit | Internal ops |
