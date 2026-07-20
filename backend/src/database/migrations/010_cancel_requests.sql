-- 010_cancel_requests.sql
-- Nghiep vu HUY MON (xem docs/nghiep-vu-huy-mon.md).
-- Mo hinh: Phuc vu gui yeu cau huy -> BEP quyet dinh.
--   Bep chap nhan (chua lam)  -> mon CANCELLED.
--   Bep tu choi   (da lam)    -> mon danh dau NHAM LAN (is_mistake), thu ngan void khi thanh toan.
-- Idempotent: chay lai an toan.

BEGIN;

-- ====== 1. Bang yeu cau huy ======
CREATE TABLE IF NOT EXISTS cancel_requests (
  cancel_request_id      SERIAL PRIMARY KEY,
  order_id               INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  order_item_id          INTEGER NOT NULL REFERENCES order_items(order_item_id) ON DELETE CASCADE,
  company_id             INTEGER NOT NULL,
  branch_id              INTEGER NOT NULL,
  requested_by           INTEGER NOT NULL,           -- employee_id (WAITER)
  requested_qty          INTEGER NOT NULL DEFAULT 1,
  reason_code            VARCHAR(40) NOT NULL,       -- WRONG_ORDER/OUT_OF_STOCK/CUSTOMER_CHANGE/QUALITY/OTHER
  reason_note            TEXT,
  item_status_at_request VARCHAR(20) NOT NULL,       -- snapshot kitchen_status luc gui
  status                 VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING/ACCEPTED/REJECTED/WITHDRAWN
  decided_by             INTEGER,                    -- employee_id (BEP)
  decided_at             TIMESTAMP,
  decision_note          TEXT,
  stock_effect           VARCHAR(20),                -- NONE / WASTE
  created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_cr_status CHECK (status IN ('PENDING','ACCEPTED','REJECTED','WITHDRAWN')),
  CONSTRAINT chk_cr_reason CHECK (reason_code IN ('WRONG_ORDER','OUT_OF_STOCK','CUSTOMER_CHANGE','QUALITY','OTHER'))
);

-- Moi mon chi 1 yeu cau dang mo (PENDING).
CREATE UNIQUE INDEX IF NOT EXISTS uq_cancel_open_per_item
  ON cancel_requests(order_item_id) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_cr_branch_status ON cancel_requests(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_cr_order ON cancel_requests(order_id);

-- ====== 2. Co nham lan / void tren order_items ======
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS is_mistake         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mistake_reason     VARCHAR(40),
  ADD COLUMN IF NOT EXISTS mistake_note       TEXT,
  ADD COLUMN IF NOT EXISTS mistake_flagged_by INTEGER,
  ADD COLUMN IF NOT EXISTS mistake_flagged_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS billing_status     VARCHAR(20) NOT NULL DEFAULT 'BILLABLE',
  ADD COLUMN IF NOT EXISTS voided_by          INTEGER,
  ADD COLUMN IF NOT EXISTS voided_at          TIMESTAMP;

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS chk_oi_billing_status;
ALTER TABLE order_items ADD CONSTRAINT chk_oi_billing_status
  CHECK (billing_status IN ('BILLABLE','VOIDED'));

-- ====== 3. Nguong void can PIN quan ly (phase 2) ======
ALTER TABLE branches ADD COLUMN IF NOT EXISTS void_pin_threshold NUMERIC(14,2) NOT NULL DEFAULT 0;

COMMIT;
