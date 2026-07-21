-- 023_reservation_rescheduled.sql
-- Danh dau phieu dat vua bi doi lich hen (le tan reschedule). Bep dung cot nay de
-- hien canh bao "da doi gio hen" tren don dat mon truoc (SCHEDULED) cua ban do.
-- Idempotent: ADD COLUMN IF NOT EXISTS chay lai an toan.

BEGIN;

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMP;

COMMIT;
