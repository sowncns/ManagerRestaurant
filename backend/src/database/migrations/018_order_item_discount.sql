-- 018: Giam gia rieng tung mon o thu ngan (theo % tren tung dong order_item).
-- Truong hop giam gia rieng cho khach. 0 = khong giam, 100 = mien phi.
BEGIN;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0
  CHECK (discount_percent >= 0 AND discount_percent <= 100);

COMMIT;
