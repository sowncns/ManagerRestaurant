-- 020: Lien ket khach hang voi Supabase Auth user (mo hinh hybrid).
-- supabase_uid = auth.users.id ben Supabase (best-effort, co the NULL voi user cu).
BEGIN;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS supabase_uid UUID UNIQUE;

COMMIT;
