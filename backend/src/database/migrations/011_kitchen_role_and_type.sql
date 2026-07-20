-- 011_kitchen_role_and_type.sql
-- BEP (Kitchen): gan nhan vien bep theo LOAI bep (nong/lanh/bar) + dam bao du role.
-- Mo hinh:
--   * kitchen_types: HOT (nong) / COLD (lanh) / BAR (quay bar). menu_items.kitchen_type_id
--     quyet dinh mon thuoc bep nao.
--   * employees.kitchen_type_id: nhan vien BEP thuoc 1 loai bep -> chi thay mon dung loai.
-- Idempotent: chay lai an toan (khong tao trung).

BEGIN;

-- ====== 1. Dam bao cac role van hanh ton tai (seed theo code) ======
-- roles.role_id la integer PK (khong serial) -> tu sinh id = MAX+1 khi thieu.
INSERT INTO roles (role_id, code, name, description)
SELECT (SELECT COALESCE(MAX(role_id), 0) FROM roles) + row_number() OVER (),
       v.code, v.name, v.description
FROM (VALUES
  ('KITCHEN',      'Bếp',       'Nhân viên bếp: nhận order, nấu món, báo nấu xong'),
  ('WAITER',       'Phục vụ',   'Nhân viên phục vụ: gọi món, phục vụ bàn'),
  ('CASHIER',      'Thu ngân',  'Nhân viên thu ngân: thanh toán, xuất hóa đơn'),
  ('RECEPTIONIST', 'Lễ tân',    'Nhân viên lễ tân: đặt bàn, sơ đồ bàn')
) AS v(code, name, description)
WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.code = v.code);

-- ====== 2. Seed 3 loai bep (idempotent theo code) ======
-- kitchen_types.kitchen_type_id la integer PK (khong serial).
INSERT INTO kitchen_types (kitchen_type_id, code, name, description, status)
SELECT (SELECT COALESCE(MAX(kitchen_type_id), 0) FROM kitchen_types) + row_number() OVER (),
       v.code, v.name, v.description, 'active'
FROM (VALUES
  ('HOT',  'Bếp nóng', 'Món nóng: xào, chiên, nướng, canh...'),
  ('COLD', 'Bếp lạnh', 'Món lạnh: salad, gỏi, khai vị lạnh...'),
  ('BAR',  'Quầy bar', 'Đồ uống: cocktail, nước ép, cafe...')
) AS v(code, name, description)
WHERE NOT EXISTS (SELECT 1 FROM kitchen_types kt WHERE kt.code = v.code);

-- ====== 3. Gan nhan vien bep theo loai bep ======
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS kitchen_type_id INTEGER
  REFERENCES kitchen_types(kitchen_type_id);

CREATE INDEX IF NOT EXISTS idx_employees_kitchen_type
  ON employees(kitchen_type_id) WHERE kitchen_type_id IS NOT NULL;

COMMIT;
