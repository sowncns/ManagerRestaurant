-- 004_consolidate_tables.sql
-- Gom bang de giam so luong bang (giu nguyen toan ven du lieu):
--   1) Gop password_reset_tokens + email_verification_tokens -> customer_tokens
--      (them cot purpose de phan biet). Di chuyen du lieu cu roi drop 2 bang.
--   2) Drop cac bang "chet" khong duoc dung o code, 0 dong, khong FK:
--      promotions, media_files, wallet_adjustments.
-- Ket qua: 38 -> 34 bang. Idempotent (IF EXISTS / IF NOT EXISTS).

BEGIN;

-- ===== 1. Gop bang token =====
CREATE TABLE IF NOT EXISTS customer_tokens (
  token_id    SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  purpose     VARCHAR(30) NOT NULL,                 -- RESET_PASSWORD | VERIFY_EMAIL
  token_hash  VARCHAR(64) NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  used_at     TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_customer_tokens_purpose CHECK (purpose IN ('RESET_PASSWORD','VERIFY_EMAIL'))
);
CREATE INDEX IF NOT EXISTS idx_customer_tokens_lookup   ON customer_tokens(token_hash, purpose);
CREATE INDEX IF NOT EXISTS idx_customer_tokens_customer ON customer_tokens(customer_id);

-- Di chuyen du lieu cu (chi chay khi bang cu con ton tai -> an toan khi chay lai)
DO $$
BEGIN
  IF to_regclass('public.password_reset_tokens') IS NOT NULL THEN
    INSERT INTO customer_tokens (customer_id, purpose, token_hash, expires_at, used_at, created_at)
    SELECT customer_id, 'RESET_PASSWORD', token_hash, expires_at, used_at, created_at
    FROM password_reset_tokens;
  END IF;
  IF to_regclass('public.email_verification_tokens') IS NOT NULL THEN
    INSERT INTO customer_tokens (customer_id, purpose, token_hash, expires_at, used_at, created_at)
    SELECT customer_id, 'VERIFY_EMAIL', token_hash, expires_at, used_at, created_at
    FROM email_verification_tokens;
  END IF;
END $$;

DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS email_verification_tokens;

-- ===== 2. Drop cac bang chet =====
DROP TABLE IF EXISTS promotions;
DROP TABLE IF EXISTS media_files;
DROP TABLE IF EXISTS wallet_adjustments;

COMMIT;
