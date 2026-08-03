-- 031: Xóa các cột không sử dụng
BEGIN;

ALTER TABLE recipes DROP COLUMN IF EXISTS waste_rate;
ALTER TABLE reservations DROP COLUMN IF EXISTS confirmed_by;
ALTER TABLE reservations DROP COLUMN IF EXISTS confirmed_at;
ALTER TABLE customers DROP COLUMN IF EXISTS supabase_uid;
ALTER TABLE voucher_branches DROP COLUMN IF EXISTS created_at;

COMMIT;
