-- 029: Xoa tinh nang nguong PIN quan ly khi void/giam gia mon o thu ngan.
BEGIN;

ALTER TABLE branches DROP COLUMN IF EXISTS void_pin_threshold;

COMMIT;
