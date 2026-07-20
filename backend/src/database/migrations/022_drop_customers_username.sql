-- 022: Bo cot customers.username o luong khach.
-- Khach dang ky/dang nhap/xac thuc deu bang EMAIL (da UNIQUE tu migration 021).
-- username truoc day chi duoc tu sinh tu email de lap cot NOT NULL cu -> nay du thua.
-- Code phia customer (auth.repository/service, frontend AuthContext) da bo tham chieu username;
-- CHAY MIGRATION NAY CUNG DOT VOI DEPLOY CODE (khong deploy code truoc roi de migration sau,
-- vi cot con NOT NULL se lam INSERT dang ky that bai trong khoang giua).
-- DROP COLUMN se tu go luon unique index customers_username_key.
-- Luu y: employees.username KHONG lien quan, van giu (login noi bo + email Supabase).
BEGIN;

ALTER TABLE customers DROP COLUMN IF EXISTS username;

COMMIT;
