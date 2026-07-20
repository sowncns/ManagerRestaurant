-- 013: Email khach hang KHONG con unique (chi username unique).
-- Nghiep vu: cho phep nhieu tai khoan dung chung 1 email. Dang ky trung email
-- truoc day nổ loi 23505 (unique_violation) vi DB con rang buoc UNIQUE tren email.
BEGIN;

-- Drop moi UNIQUE constraint dang tren cot email cua customers (ten khong chac).
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY (con.conkey)
    WHERE rel.relname = 'customers'
      AND con.contype = 'u'
      AND att.attname = 'email'
  LOOP
    EXECUTE format('ALTER TABLE customers DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

-- Drop unique INDEX tren email neu ton tai (khong phai constraint).
DO $$
DECLARE i text;
BEGIN
  FOR i IN
    SELECT ix.indexrelid::regclass::text
    FROM pg_index ix
    JOIN pg_class rel ON rel.oid = ix.indrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY (ix.indkey)
    WHERE rel.relname = 'customers'
      AND ix.indisunique
      AND att.attname = 'email'
  LOOP
    EXECUTE format('DROP INDEX %s', i);
  END LOOP;
END $$;

-- Giu index thuong cho luong reset/verify loc theo email.
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email);

COMMIT;
