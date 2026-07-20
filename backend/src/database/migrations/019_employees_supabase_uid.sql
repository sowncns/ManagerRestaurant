-- 019: Lien ket nhan vien voi Supabase Auth user (mo hinh hybrid).
-- supabase_uid = auth.users.id ben Supabase (best-effort, co the NULL voi user cu).
BEGIN;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS supabase_uid UUID UNIQUE;

COMMIT;
