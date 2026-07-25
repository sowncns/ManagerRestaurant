# Feature: Gọi xác nhận đặt bàn (lễ tân)

**Ngày:** 2026-07-25

## Mục tiêu
Lễ tân có một trang riêng liệt kê **các lịch đặt bàn trong ngày** để gọi điện xác
nhận lần cuối trước giờ khách đến, và đánh dấu **"Đã gọi xác nhận"** để không gọi
trùng.

## Phạm vi hiển thị
- Chỉ phiếu **hôm nay** (`reservation_date = CURRENT_DATE`), status `PENDING` hoặc
  `CONFIRMED` (chưa check-in, chưa kết thúc).
- Sắp xếp theo `reservation_time` tăng dần.
- Mỗi dòng hiển thị: **giờ** (+ còn ~X phút), **số bàn**, tên khách, **SĐT** (bấm
  gọi `tel:`), và **món đặt trước** nếu có.
- Tách 2 nhóm: **Chưa gọi** (nổi bật, trên) / **Đã gọi** (xám, dưới, kèm giờ đã gọi).

## Backend

### Migration `027_reservation_call_confirm.sql`
Thêm 2 cột (idempotent, `call_confirmed_by` là INT thường — không FK, theo pattern
migration 006/007):
- `call_confirmed_at TIMESTAMPTZ`
- `call_confirmed_by INTEGER`

### `GET /api/internal/reservations/call-list` (deskRoles)
1 query trả phiếu hôm nay theo scope chi nhánh (giống `findAlerts`), mỗi phiếu gồm:
`id, reservation_code, customer_name, customer_phone, guest_count,
reservation_date, reservation_time, status, table_id, table_number, table_name,
call_confirmed_at, minutes_until`, và **`preorder_items`** = `json_agg` các
`{item_name, quantity}` từ đơn `SCHEDULED` gắn `reservation_id` (mặc định `[]`).

### `PATCH /api/internal/reservations/:id/confirm-call` (deskRoles)
Body `{ confirmed?: boolean }` (mặc định `true`). Set/clear `call_confirmed_at` +
`call_confirmed_by` qua `repo.update` (đã có), kèm `assertBranchScope` + ghi audit.
UPDATE bảng `reservations` tự đẩy SSE qua Supabase realtime → các máy lễ tân khác
tự refetch.

## Frontend (`igourmet-internal`)

- `api/reservations.ts`: thêm type `CallListItem` + `PreorderItem`, hàm
  `callList()` và `confirmCall(id, confirmed)`.
- `pages/CallConfirmPage.tsx`: trang mới, route `/reservation-calls`, dùng
  `useRealtime('/internal/reservations/stream', load)`.
- `config/nav.ts`: thêm mục **"Gọi xác nhận"** (icon `PhoneCall`), scope
  `RECEPTIONIST`.
- `App.tsx`: thêm route dưới nhóm `RECEPTIONIST`.

## Không làm (YAGNI)
- Không phân loại kết quả gọi (đến/dời/hủy) — chỉ 1 cờ "đã gọi".
- Không hiển thị "ai đã gọi" (chỉ lưu `call_confirmed_by` cho audit).
- Không đụng `list()` / `ReservationsPage.tsx` (code chết, chưa route).
- Nav chỉ lễ tân thấy (endpoint vẫn deskRoles nên quản lý gọi được nếu cần sau).
