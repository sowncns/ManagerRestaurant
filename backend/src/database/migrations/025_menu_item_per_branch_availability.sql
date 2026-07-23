-- 025_menu_item_per_branch_availability.sql
-- Cho phep BRANCH_MANAGER danh dau mon "het" chi trong chi nhanh cua minh,
-- ma khong anh huong cac chi nhanh khac hoac cot is_available chung cua cong ty.
-- Effective availability = is_available AND NOT (branch_id = ANY(unavailable_branch_ids))
-- Idempotent: ADD COLUMN IF NOT EXISTS.

BEGIN;

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS unavailable_branch_ids INT[] NOT NULL DEFAULT '{}';

COMMIT;
