-- 027_reservation_call_confirm.sql
-- Le tan goi dien xac nhan lan cuoi truoc gio nhan ban -> danh dau "da goi".
-- call_confirmed_by la INT thuong (khong FK, theo pattern migration 006/007).
-- Idempotent: ADD COLUMN IF NOT EXISTS.

BEGIN;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS call_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_confirmed_by INTEGER;

COMMIT;
