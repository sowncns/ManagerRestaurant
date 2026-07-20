-- 005_invoice_payos.sql
-- Bang doi soat thanh toan hoa don qua PayOS (chuyen khoan).
-- Moi lan thu ngan chon TRANSFER -> sinh PayOS link voi order_code, luu o day.
-- Webhook PayOS tra ve -> tra order_code o bang nay de danh dau hoa don PAID.
-- Idempotent (IF NOT EXISTS).

BEGIN;

CREATE TABLE IF NOT EXISTS invoice_payments (
  order_code  BIGINT PRIMARY KEY,
  invoice_id  INTEGER NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_invoice_payments_status CHECK (status IN ('PENDING','SUCCESS','FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);

COMMIT;
