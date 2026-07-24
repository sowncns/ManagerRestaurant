-- 026_voucher_welcome_flag.sql
-- Danh dau template la "qua chao mung": khach verify email xong duoc cap tat ca template is_welcome dang active.
-- Idempotent: ADD COLUMN IF NOT EXISTS.

BEGIN;

ALTER TABLE voucher_templates
  ADD COLUMN IF NOT EXISTS is_welcome BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
