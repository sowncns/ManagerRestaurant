-- 003_combo_verify_audit.sql
-- Hoan thien 3 muc "Chua lam":
--   1) Combo mon (combos + combo_items).
--   2) Email xac thuc khi dang ky (email_verification_tokens + cot customers.email_verified).
--   3) Nhat ky he thong / audit log (audit_logs).
-- Ghi chu: idempotent (IF NOT EXISTS), chay lai an toan.

BEGIN;

-- ============ 1. COMBO MON ============
CREATE TABLE IF NOT EXISTS combos (
  combo_id    SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  combo_code  VARCHAR(50) NOT NULL,
  name        VARCHAR(150) NOT NULL,
  description TEXT,
  image_url   TEXT,
  price       NUMERIC(14,2) NOT NULL DEFAULT 0,
  status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_combos_company_code UNIQUE (company_id, combo_code),
  CONSTRAINT chk_combos_status CHECK (status IN ('ACTIVE','INACTIVE')),
  CONSTRAINT chk_combos_price CHECK (price >= 0)
);
CREATE INDEX IF NOT EXISTS idx_combos_company ON combos(company_id);
CREATE INDEX IF NOT EXISTS idx_combos_status  ON combos(status);

CREATE TABLE IF NOT EXISTS combo_items (
  combo_item_id SERIAL PRIMARY KEY,
  combo_id      INTEGER NOT NULL REFERENCES combos(combo_id) ON DELETE CASCADE,
  menu_item_id  INTEGER NOT NULL REFERENCES menu_items(menu_item_id) ON DELETE RESTRICT,
  quantity      INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uq_combo_items UNIQUE (combo_id, menu_item_id),
  CONSTRAINT chk_combo_items_qty CHECK (quantity > 0)
);
CREATE INDEX IF NOT EXISTS idx_combo_items_combo ON combo_items(combo_id);
CREATE INDEX IF NOT EXISTS idx_combo_items_menu  ON combo_items(menu_item_id);

-- ============ 2. EMAIL XAC THUC DANG KY ============
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_verified    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  verification_token_id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  used_at     TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_evt_token    ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_evt_customer ON email_verification_tokens(customer_id);

-- ============ 3. AUDIT LOG ============
CREATE TABLE IF NOT EXISTS audit_logs (
  audit_log_id SERIAL PRIMARY KEY,
  actor_type   VARCHAR(20),                 -- staff / customer / system
  actor_id     INTEGER,
  actor_name   VARCHAR(150),
  company_id   INTEGER,
  branch_id    INTEGER,
  action       VARCHAR(50) NOT NULL,        -- LOGIN, CREATE, UPDATE, DELETE, CONFIRM...
  entity_type  VARCHAR(50),                 -- EMPLOYEE, BRANCH, RESERVATION, PURCHASE_RECEIPT...
  entity_id    INTEGER,
  description  TEXT,
  ip           VARCHAR(64),
  metadata     JSONB,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_actor   ON audit_logs(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity  ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

COMMIT;
