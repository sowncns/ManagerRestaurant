-- 005_reservation_preorder.sql
-- Ho tro dat mon truoc (pre-order) gan voi phieu dat ban:
--   * Don dat truoc co status = 'SCHEDULED', CHUA gan ban / nhan vien phuc vu
--     (le tan gan khi check-in). Nen phai noi 2 cot nay thanh nullable.
--   * Khong them bang moi; tan dung orders/order_items san co.
-- Idempotent: DROP NOT NULL chay lai an toan.

BEGIN;

ALTER TABLE orders ALTER COLUMN table_id  DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN waiter_id DROP NOT NULL;

-- Index tra cuu don dat truoc theo phieu dat
CREATE INDEX IF NOT EXISTS idx_orders_reservation ON orders(reservation_id);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders(status);

COMMIT;
