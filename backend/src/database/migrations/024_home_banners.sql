-- 024_home_banners.sql
-- Anh trang chu do SUPER_ADMIN quan ly. Chi luu ANH + LOAI:
--   type = 1: anh slide (hero banner)
--   type = 2: anh muc "Hom nay an gi"
-- Idempotent: CREATE TABLE IF NOT EXISTS chay lai an toan.

BEGIN;

CREATE TABLE IF NOT EXISTS home_banners (
  banner_id  SERIAL PRIMARY KEY,
  image_url  TEXT NOT NULL,
  type       SMALLINT NOT NULL CHECK (type IN (1, 2)),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_banners_type ON home_banners(type);

COMMIT;
