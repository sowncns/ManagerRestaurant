-- 002_supplier_purchase_reservation.sql
-- Hoan thien 2 muc dang do dang:
--   1) Nha cung cap (suppliers) + Phieu nhap kho (purchase_receipts) gan NCC.
--   2) Dat ban (reservations) - dam bao bang + cac cot module dat ban can dung.
-- Ghi chu thiet ke:
--  * PK dat ten mo ta <entity>_id, dong bo he thong.
--  * suppliers gan company_id (multi-tenant: moi cong ty co NCC rieng).
--  * purchase_receipts la "phieu" tong; purchase_receipt_items la cac dong nguyen lieu.
--  * Khi CONFIRM phieu nhap -> sinh inventory_transactions (PURCHASE, reference_type
--    = 'PURCHASE_RECEIPT') va cong ton kho. Day la lien ket con thieu truoc do.

BEGIN;

-- ============ 1. NHA CUNG CAP ============
CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id   SERIAL PRIMARY KEY,
  company_id    INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  supplier_code VARCHAR(50) NOT NULL,
  supplier_name VARCHAR(150) NOT NULL,
  phone         VARCHAR(30),
  email         VARCHAR(150),
  address       TEXT,
  tax_code      VARCHAR(50),
  contact_name  VARCHAR(150),
  note          TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_suppliers_company_code UNIQUE (company_id, supplier_code),
  CONSTRAINT chk_suppliers_status CHECK (status IN ('ACTIVE','INACTIVE'))
);
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_status  ON suppliers(status);

-- ============ 2. PHIEU NHAP KHO (tong) ============
CREATE TABLE IF NOT EXISTS purchase_receipts (
  purchase_receipt_id SERIAL PRIMARY KEY,
  company_id   INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  branch_id    INTEGER REFERENCES branches(branch_id) ON DELETE SET NULL,
  supplier_id  INTEGER NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
  receipt_code VARCHAR(50) NOT NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  status       VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  note         TEXT,
  created_by   INTEGER REFERENCES employees(employee_id) ON DELETE SET NULL,
  confirmed_by INTEGER REFERENCES employees(employee_id) ON DELETE SET NULL,
  confirmed_at TIMESTAMP,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_purchase_receipts_company_code UNIQUE (company_id, receipt_code),
  CONSTRAINT chk_purchase_receipts_status CHECK (status IN ('DRAFT','CONFIRMED','CANCELLED'))
);
CREATE INDEX IF NOT EXISTS idx_pr_company  ON purchase_receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_pr_supplier ON purchase_receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_pr_status   ON purchase_receipts(status);
CREATE INDEX IF NOT EXISTS idx_pr_date     ON purchase_receipts(receipt_date);

-- ============ 3. DONG PHIEU NHAP ============
CREATE TABLE IF NOT EXISTS purchase_receipt_items (
  purchase_receipt_item_id SERIAL PRIMARY KEY,
  purchase_receipt_id INTEGER NOT NULL REFERENCES purchase_receipts(purchase_receipt_id) ON DELETE CASCADE,
  ingredient_id       INTEGER NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE RESTRICT,
  quantity            NUMERIC(14,3) NOT NULL,
  unit_price          NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_amount         NUMERIC(16,2) NOT NULL DEFAULT 0,
  note                TEXT,
  CONSTRAINT chk_pri_quantity CHECK (quantity > 0),
  CONSTRAINT chk_pri_price    CHECK (unit_price >= 0)
);
CREATE INDEX IF NOT EXISTS idx_pri_receipt    ON purchase_receipt_items(purchase_receipt_id);
CREATE INDEX IF NOT EXISTS idx_pri_ingredient ON purchase_receipt_items(ingredient_id);

-- ============ 4. DAT BAN (reservations) ============
-- Bang co the da ton tai (logic checkin/checkout dung truoc do). Tao neu chua co,
-- va bo sung cac cot module dat ban can (idempotent).
CREATE TABLE IF NOT EXISTS reservations (
  reservation_id   SERIAL PRIMARY KEY,
  branch_id        INTEGER REFERENCES branches(branch_id) ON DELETE CASCADE,
  table_id         INTEGER REFERENCES dining_tables(table_id) ON DELETE SET NULL,
  customer_id      INTEGER,
  customer_name    VARCHAR(150) NOT NULL,
  customer_phone   VARCHAR(30),
  guest_count      INTEGER NOT NULL DEFAULT 1,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
  note             TEXT,
  checked_in_by    INTEGER REFERENCES employees(employee_id) ON DELETE SET NULL,
  checked_in_at    TIMESTAMP,
  created_by       INTEGER REFERENCES employees(employee_id) ON DELETE SET NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reservation_code VARCHAR(50);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS company_id     INTEGER REFERENCES companies(company_id) ON DELETE CASCADE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_email VARCHAR(150);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS special_request TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmed_by   INTEGER REFERENCES employees(employee_id) ON DELETE SET NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmed_at   TIMESTAMP;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancelled_by   INTEGER REFERENCES employees(employee_id) ON DELETE SET NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancelled_at   TIMESTAMP;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancel_reason  TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS branch_id      INTEGER REFERENCES branches(branch_id) ON DELETE CASCADE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS table_id       INTEGER REFERENCES dining_tables(table_id) ON DELETE SET NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_id    INTEGER;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_name  VARCHAR(150);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(30);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS guest_count    INTEGER NOT NULL DEFAULT 1;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reservation_date DATE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reservation_time TIME;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS status         VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED';
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS note           TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS checked_in_by  INTEGER REFERENCES employees(employee_id) ON DELETE SET NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS checked_in_at  TIMESTAMP;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS created_by     INTEGER REFERENCES employees(employee_id) ON DELETE SET NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_reservations_branch ON reservations(branch_id);
CREATE INDEX IF NOT EXISTS idx_reservations_table  ON reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date   ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

COMMIT;
