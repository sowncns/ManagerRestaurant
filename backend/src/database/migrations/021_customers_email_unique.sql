-- 021: Khoi phuc UNIQUE tren customers.email.
-- Migration 013 tung bo UNIQUE khi email con la truong phu. Nay email la dinh danh
-- dang nhap chinh (bo username o luong khach) nen bat buoc phai duy nhat.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY (con.conkey)
    WHERE rel.relname = 'customers'
      AND con.contype = 'u'
      AND att.attname = 'email'
  ) THEN
    ALTER TABLE customers ADD CONSTRAINT customers_email_key UNIQUE (email);
  END IF;
END $$;

COMMIT;
