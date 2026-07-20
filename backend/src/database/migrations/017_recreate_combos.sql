-- 017: Tao lai tinh nang combo (chi thuoc cong ty, chung cho moi chi nhanh).
-- Chi COMPANY_ADMIN/SUPER_ADMIN tao. Gom: name, description, price + danh sach mon.
-- Bo combo_code va image_url so voi ban cu.
BEGIN;

CREATE TABLE IF NOT EXISTS combos (
  combo_id    SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  name        VARCHAR(150) NOT NULL,
  description TEXT,
  price       NUMERIC(14,2) NOT NULL DEFAULT 0,
  status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_combos_status CHECK (status IN ('ACTIVE','INACTIVE')),
  CONSTRAINT chk_combos_price CHECK (price >= 0)
);
CREATE INDEX IF NOT EXISTS idx_combos_company ON combos(company_id);

CREATE TABLE IF NOT EXISTS combo_items (
  combo_item_id SERIAL PRIMARY KEY,
  combo_id      INTEGER NOT NULL REFERENCES combos(combo_id) ON DELETE CASCADE,
  menu_item_id  INTEGER NOT NULL REFERENCES menu_items(menu_item_id) ON DELETE RESTRICT,
  quantity      INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uq_combo_items UNIQUE (combo_id, menu_item_id),
  CONSTRAINT chk_combo_items_qty CHECK (quantity > 0)
);

COMMIT;
