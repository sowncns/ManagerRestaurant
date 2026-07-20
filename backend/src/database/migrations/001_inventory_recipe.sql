-- 001_inventory_recipe.sql
-- Nghiep vu: Quan ly nguyen lieu (Inventory) + Cong thuc mon an (Recipe/BOM)
-- + Lich su xuat nhap kho (inventory_transactions).
-- Ghi chu thiet ke:
--  * PK dat ten mo ta <entity>_id, dong bo voi cac bang khac cua he thong.
--  * unit luu truc tiep (kg, g, lit, cai...) vi he thong chua co bang units.
--  * ingredients gan company_id (multi-tenant: moi cong ty co kho rieng).
--  * inventory_transactions.quantity la DELTA CO DAU:
--      duong (+) = nhap kho, am (-) = xuat kho. stock_before/after de doi soat.
--  * Yeu cau: cac bang goc (companies, menu_items, employees) da dung PK moi
--    (company_id, menu_item_id, employee_id).

BEGIN;

-- 1. Nguyen lieu
CREATE TABLE IF NOT EXISTS ingredients (
  ingredient_id   SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  ingredient_code VARCHAR(50) NOT NULL,
  ingredient_name VARCHAR(150) NOT NULL,
  unit            VARCHAR(20) NOT NULL,                 -- kg, g, lit, ml, cai...
  current_stock   NUMERIC(14,3) NOT NULL DEFAULT 0,
  minimum_stock   NUMERIC(14,3) NOT NULL DEFAULT 0,
  cost_price      NUMERIC(14,2) NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  note            TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_ingredients_company_code UNIQUE (company_id, ingredient_code),
  CONSTRAINT chk_ingredients_status CHECK (status IN ('ACTIVE','INACTIVE')),
  CONSTRAINT chk_ingredients_min   CHECK (minimum_stock >= 0),
  CONSTRAINT chk_ingredients_cost  CHECK (cost_price >= 0)
);
CREATE INDEX IF NOT EXISTS idx_ingredients_company ON ingredients(company_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_status  ON ingredients(status);

-- 2. Cong thuc mon an (BOM) - quan he N-N giua menu_items va ingredients
CREATE TABLE IF NOT EXISTS recipes (
  recipe_id     SERIAL PRIMARY KEY,
  menu_item_id  INTEGER NOT NULL REFERENCES menu_items(menu_item_id)  ON DELETE CASCADE,
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE RESTRICT,
  quantity      NUMERIC(14,3) NOT NULL,                 -- luong nguyen lieu cho 1 phan an
  waste_rate    NUMERIC(5,2),                           -- % hao hut (nullable)
  notes         TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_recipes_item_ingredient UNIQUE (menu_item_id, ingredient_id),
  CONSTRAINT chk_recipes_quantity CHECK (quantity > 0),
  CONSTRAINT chk_recipes_waste    CHECK (waste_rate IS NULL OR (waste_rate >= 0 AND waste_rate <= 100))
);
CREATE INDEX IF NOT EXISTS idx_recipes_menu_item  ON recipes(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_recipes_ingredient ON recipes(ingredient_id);

-- 3. Lich su xuat nhap kho
CREATE TABLE IF NOT EXISTS inventory_transactions (
  inventory_transaction_id SERIAL PRIMARY KEY,
  ingredient_id    INTEGER NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE RESTRICT,
  transaction_type VARCHAR(30) NOT NULL,
  reference_type   VARCHAR(30),
  reference_id     INTEGER,
  quantity         NUMERIC(14,3) NOT NULL,              -- delta co dau: + nhap, - xuat
  stock_before     NUMERIC(14,3) NOT NULL,
  stock_after      NUMERIC(14,3) NOT NULL,
  note             TEXT,
  created_by       INTEGER REFERENCES employees(employee_id) ON DELETE SET NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_invtx_type CHECK (transaction_type IN
    ('PURCHASE','SALE_CONSUMPTION','INTERNAL_TRANSFER','STOCK_ADJUSTMENT','STOCK_COUNT','RETURN_SUPPLIER','WASTE')),
  CONSTRAINT chk_invtx_ref CHECK (reference_type IS NULL OR reference_type IN
    ('PURCHASE_RECEIPT','SALES_ORDER','ORDER','INVOICE','STOCK_COUNT','ADJUSTMENT')),
  CONSTRAINT chk_invtx_qty CHECK (quantity <> 0)
);
CREATE INDEX IF NOT EXISTS idx_invtx_ingredient ON inventory_transactions(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_invtx_type       ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_invtx_reference  ON inventory_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_invtx_created_at ON inventory_transactions(created_at);

COMMIT;
