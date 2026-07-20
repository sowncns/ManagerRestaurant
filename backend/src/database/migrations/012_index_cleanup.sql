-- 012_index_cleanup.sql
-- Muc tieu: don index TRUNG LAP (thua) va bo sung index cho cot email dung trong
--   luong quen mat khau / gui lai mail xac thuc. KHONG doi du lieu, KHONG bo cot.
--
-- Boi canh (audit hieu suat):
--   - employees co 2 UNIQUE index tren cung cot username:
--       employees_email_key  (ten cu, nham) + uq_employees_username
--     => giu uq_employees_username (ten dung nghia), bo cai con lai.
--   - wallet_topups co ca UNIQUE key va index thuong tren order_code:
--       wallet_topups_order_code_key (UNIQUE) da du -> bo idx_wallet_topups_order_code.
--   - customers.email chua co index; findForReset / findForVerify loc theo email
--     (WHERE username = $1 OR email = $1) -> them index de tranh seq scan.

BEGIN;

-- 1. Bo index UNIQUE trung tren employees.username (giu uq_employees_username).
DROP INDEX IF EXISTS employees_email_key;

-- 2. Bo index thuong thua tren wallet_topups.order_code (da co UNIQUE key).
DROP INDEX IF EXISTS idx_wallet_topups_order_code;

-- 3. Them index cho customers.email (luong reset/verify loc theo email).
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email);

COMMIT;
