-- 008_drop_cart_tables.sql
-- Muc tieu: XOA han tinh nang gio hang khach (cart) khoi CSDL.
--   Module code src/modules/customer/cart da bi go, route /customer/cart da bo dang ky.
--   Hai bang carts / cart_items KHONG con duoc code nao su dung va CHUA tung
--   duoc noi vao luong dat mon (orders). Vi vay xoa han cho gon schema.
--
-- Thu tu xoa: cart_items truoc (con) roi carts (cha) vi cart_items.cart_id -> carts.
-- Khong bang nao khac tham chieu toi carts/cart_items nen khong can CASCADE.
--
-- Idempotent: DROP TABLE IF EXISTS chay lai an toan.
-- Khong the hoan tac (mat du lieu gio hang). Neu can giu du lieu, backup truoc khi chay.

BEGIN;

DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;

COMMIT;
