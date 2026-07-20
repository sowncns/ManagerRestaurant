-- 009_drop_menu_items_company_fk.sql
-- Muc tieu: bo khoa ngoai THUA menu_items.company_id -> companies.
--   company suy ra duoc qua menu_items.category_id -> menu_categories.company_id
--   (category_id la NOT NULL), nen FK company_id la du thua ve chuan hoa.
--   GIU LAI cot company_id: van dung de scope multi-tenant truc tiep trong query
--   (WHERE company_id = req.user.company_id, khong can JOIN menu_categories).
--
-- Cung nguyen tac an toan nhu 007:
--   (1) companies gan nhu khong bao gio bi xoa cung.
--   (2) Orphan khong lam sai tien / ton kho / don hang.
--   (3) Gia tri company_id duoc kiem soat o tang ung dung (JWT, controller).
--
-- Chi bo RANG BUOC, khong bo cot -> cat 1 duong noi quanh hub 'companies' tren ERD.
-- Idempotent: DROP ... IF EXISTS chay lai an toan.

BEGIN;

ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS fk_menu_items_company;

COMMIT;

-- Neu ten constraint khac, tra ten that:
--   SELECT conname FROM pg_constraint
--   WHERE contype='f' AND conrelid='menu_items'::regclass
--     AND confrelid='companies'::regclass;
