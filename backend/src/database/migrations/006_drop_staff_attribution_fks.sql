-- 006_drop_staff_attribution_fks.sql
-- Bo 8 khoa ngoai "gan nguoi thao tac" (staff attribution) tro toi employees.
-- Ly do an toan (da kiem chung trong code):
--   * Cac cot nay chi luu "nhan vien nao da thao tac" (created_by, confirmed_by,
--     checked_in_by, cancelled_by, served_by) - chi phuc vu hien thi/audit,
--     KHONG anh huong dung dan nghiep vu (tien, ton kho, don hang).
--   * Gia tri luon lay tu JWT da xac thuc (req.user), khong phai input client
--     -> khong the gia mao id tuy y.
--   * employees KHONG BAO GIO bi xoa cung (hard-delete): module employee chi co
--     PATCH /:id/status -> INACTIVE (soft-delete), khong co route/cau lenh
--     DELETE FROM employees. => cac FK nay thuc te khong bao gio kich hoat.
--   * Cac truy van hien thi dung LEFT JOIN employees (inventory, procurement)
--     nen id "treo" chi hien ten NULL, khong gay loi doc.
-- Giu nguyen:
--   * Cot du lieu (van la INTEGER nullable) - van luu attribution, chi bo rang buoc DB.
--   * orders.waiter_id (doc bang INNER JOIN, khong dropped).
-- Rieng order_items.served_by: GIU LAI cot de lam chuc nang "nhan vien nao them
--   mon vao don" (khac voi orders.waiter_id = nguoi tao don). Chi bo FK, giu cot,
--   va them index phuc vu thong ke KPI theo nhan vien phuc vu.
-- Idempotent: DROP ... IF EXISTS chay lai an toan.
-- Luu y: rang buoc toan ven employee_id gio dua vao quy uoc soft-delete o tang ung dung.

BEGIN;

-- ===== 1. inventory_transactions =====
ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_created_by_fkey;

-- ===== 2. purchase_receipts (2 FK) =====
ALTER TABLE purchase_receipts DROP CONSTRAINT IF EXISTS purchase_receipts_created_by_fkey;
ALTER TABLE purchase_receipts DROP CONSTRAINT IF EXISTS purchase_receipts_confirmed_by_fkey;

-- ===== 3. reservations (4 FK) =====
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_created_by_fkey;
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_confirmed_by_fkey;
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_checked_in_by_fkey;
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_cancelled_by_fkey;

-- ===== 4. order_items.served_by (GIU cot, chi bo FK + them index) =====
-- FK nay dung ten tuy chinh 'fk_order_item_waiter' (khong theo quy uoc _fkey).
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS fk_order_item_waiter;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_served_by_fkey; -- phong khi ton tai ca ten mac dinh
-- Dam bao cot ton tai (phong khi DB cu chua co) va cho phep NULL (don dat truoc chua gan NV).
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS served_by INTEGER;
-- Index phuc vu thong ke "moi nhan vien phuc vu bao nhieu mon" (KPI/hoa hong).
CREATE INDEX IF NOT EXISTS idx_order_items_served_by ON order_items(served_by);

COMMIT;

-- ============================================================================
-- Neu mot lenh DROP CONSTRAINT khong khop ten (constraint co ten khac), tra ten
-- that roi thay vao:
--   SELECT conname, conrelid::regclass AS tbl
--   FROM pg_constraint
--   WHERE contype = 'f'
--     AND conrelid::regclass::text IN
--         ('inventory_transactions','purchase_receipts','reservations','order_items');
-- ============================================================================
