-- 014: Bang cau hinh % cashback theo hang thanh vien.
-- Nghiep vu: truoc day rate hard-code trong code (cashback.service.js, order.service.js).
-- Dua ra bang de SUPER_ADMIN chinh duoc. `rate` la ti le thap phan (0.03 = 3%).
BEGIN;

CREATE TABLE IF NOT EXISTS cashback_rates (
  rank       VARCHAR(20) PRIMARY KEY,
  rate       NUMERIC(5,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_cashback_rate_range CHECK (rate >= 0 AND rate <= 1)
);

-- Seed dung gia tri dang hard-code hien tai.
INSERT INTO cashback_rates (rank, rate) VALUES
  ('normal',   0.0000),
  ('silver',   0.0100),
  ('gold',     0.0300),
  ('platinum', 0.0500)
ON CONFLICT (rank) DO NOTHING;

COMMIT;
