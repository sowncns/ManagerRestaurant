-- 007_reduce_redundant_fks.sql
-- Muc tieu: giam bot khoa ngoai "thua/coupling thap" de ERD gon hon, GIU nguyen
--   toan bo cot du lieu (chi bo rang buoc DB, khong bo cot, khong doi ten).
--
-- Nguyen tac an toan (chi bo khi thoa CA 3):
--   (1) Bang cha gan nhu khong bao gio bi xoa cung.
--   (2) Orphan KHONG lam sai tien / ton kho / don hang.
--   (3) Gia tri duoc kiem soat o tang ung dung (scope theo company_id, JWT).
--
-- === Nhom 1: company_id THUA (bang da co branch_id -> company suy ra qua branches) ===
--   companies gan nhu khong xoa duoc (bi orders ON DELETE NO ACTION chan).
--   Cot company_id GIU LAI (van dung de scope multi-tenant trong moi query).
--   Chi bo FK -> cat 5 duong noi quanh hub 'companies' tren ERD.
--
-- === Nhom 2: attribution phat voucher ===
--   customer_vouchers.assigned_by_employee_id = "nhan vien nao phat voucher".
--   Chi phuc vu audit; employees khong xoa cung (soft-delete). Giu cot, bo FK.
--
-- KHONG dung toi (theo yeu cau giu tai chinh/nghiep vu cot loi):
--   payments.*, invoices.reservation_id/customer_id/table_id, reservations.customer_id,
--   toan bo FK ton kho / nha cung cap / lookup / cau truc cha-con.
--
-- Idempotent: DROP ... IF EXISTS chay lai an toan.

BEGIN;

-- ===== Nhom 1: company_id thua (giu cot, bo FK) =====
ALTER TABLE carts             DROP CONSTRAINT IF EXISTS fk_carts_company;
ALTER TABLE employees         DROP CONSTRAINT IF EXISTS fk_employee_company;
ALTER TABLE orders            DROP CONSTRAINT IF EXISTS fk_order_company;
ALTER TABLE purchase_receipts DROP CONSTRAINT IF EXISTS purchase_receipts_company_id_fkey;
ALTER TABLE reservations      DROP CONSTRAINT IF EXISTS reservations_company_id_fkey;

-- invoices.company_id: invoices la BAN GHI TAI CHINH. Mac dinh GIU (ton trong rule #3).
-- Bo comment dong duoi neu ban chap nhan bo de gon them 1 duong:
-- ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_company_id_fkey;

-- ===== Nhom 2: attribution phat voucher =====
ALTER TABLE customer_vouchers DROP CONSTRAINT IF EXISTS fk_cvc_assigner;

COMMIT;

-- ============================================================================
-- LUU Y sau khi bo Nhom 1: DB khong con tu kiem tra company_id ton tai. Tang ung
-- dung PHAI dam bao moi INSERT/UPDATE dat company_id = req.user.company_id (da lam
-- san trong cac controller). Vi companies khong xoa cung nen rui ro orphan ~ 0.
--
-- Neu ten constraint khac voi ERD, tra ten that:
--   SELECT conname, conrelid::regclass AS tbl
--   FROM pg_constraint
--   WHERE contype='f'
--     AND conrelid::regclass::text IN
--         ('carts','employees','orders','purchase_receipts','reservations',
--          'invoices','customer_vouchers');
-- ============================================================================
