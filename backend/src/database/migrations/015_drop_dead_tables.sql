-- 015: Xoa 2 bang chet.
--  * payments: 0 dong, khong code nao dung, khong FK tro toi. Da bi thay bang
--    invoice_payments (doi soat PayOS) + wallet_transactions (vi).
--  * branch_menu_items: khong code nao doc (menu lay gia thang tu menu_items),
--    khong FK tro toi. Bang gia-theo-chi-nhanh chua bao gio duoc noi day.
BEGIN;

DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS branch_menu_items;

COMMIT;
