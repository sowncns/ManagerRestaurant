-- 016: Xoa tinh nang combo de lam lai sau.
-- Da go: module internal/combo, route /internal/combos, cac endpoint combo o public.
-- combo_items truoc (con), roi combos (cha). Khong bang nao khac tro toi combos.
BEGIN;

DROP TABLE IF EXISTS combo_items;
DROP TABLE IF EXISTS combos;

COMMIT;
