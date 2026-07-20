// src/shared/services/deposit.service.js
// Xu ly dat coc cho phieu dat ban (khi khach dat mon truoc).
// Tien coc lay tu VI khach. Vong doi: HELD -> APPLIED | REFUNDED | FORFEITED.
const pool = require("../../config/db");
const env = require("../../config/env");
const { verifyPaymentPin } = require("../../modules/customer/profile/profile.service");
const { BadRequest, NotFound } = require("../errors/AppError");

const RATE = Math.min(1, Math.max(0, Number(env.RESERVATION_DEPOSIT_RATE) || 0));

const fmt = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

// So tien coc = lam tron theo dong VND.
function computeDeposit(total) {
  return Math.round((Number(total) || 0) * RATE);
}

// Tru coc tu vi khach (co xac thuc PIN). Ghi wallet_transactions + set reservation.
async function chargeDeposit({ customerId, reservationId, orderId, amount, pin }) {
  if (!amount || amount <= 0) return;
  if (!pin) throw new BadRequest("Vui lòng nhập mã PIN để đặt cọc cho đơn đặt món trước.");
  await verifyPaymentPin(customerId, pin); // sai PIN -> nem loi tai day

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const w = await client.query(
      "SELECT wallet_id AS id, balance FROM customer_wallets WHERE customer_id = $1 FOR UPDATE",
      [customerId]
    );
    let wallet = w.rows[0];
    if (!wallet) {
      // Auto-create wallet if it doesn't exist (e.g. for old accounts)
      const ins = await client.query(
        "INSERT INTO customer_wallets (customer_id, balance) VALUES ($1, 0) RETURNING wallet_id AS id, balance",
        [customerId]
      );
      wallet = ins.rows[0];
    }

    const before = parseFloat(wallet.balance);
    if (before < amount) {
      throw new BadRequest(`Số dư ví không đủ để đặt cọc ${fmt(amount)}. Vui lòng nạp thêm.`);
    }
    const after = before - amount;

    await client.query("UPDATE customer_wallets SET balance = $1 WHERE customer_id = $2", [after, customerId]);
    await client.query(
      `INSERT INTO wallet_transactions
         (wallet_id, transaction_code, transaction_type, amount, balance_before, balance_after,
          reference_type, reference_id, description, status)
       VALUES ($1,$2,'PAY_ORDER',$3,$4,$5,'ORDER',$6,$7,'SUCCESS')`,
      [wallet.id, `DEP-${Date.now()}`, amount, before, after, orderId || 0,
       `Đặt cọc đơn đặt món trước (phiếu #${reservationId})`]
    );
    await client.query(
      "UPDATE reservations SET deposit_amount = $1, deposit_status = 'HELD', updated_at = NOW() WHERE reservation_id = $2",
      [amount, reservationId]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Hoan coc ve vi khach (khi huy phieu con hop le). Chi hoan neu dang HELD.
async function refundDeposit(reservationId) {
  const r = await pool.query(
    "SELECT customer_id, deposit_amount, deposit_status FROM reservations WHERE reservation_id = $1",
    [reservationId]
  );
  const row = r.rows[0];
  if (!row || row.deposit_status !== "HELD") return;
  const amount = parseFloat(row.deposit_amount);
  if (!amount || amount <= 0) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const w = await client.query(
      "SELECT wallet_id AS id, balance FROM customer_wallets WHERE customer_id = $1 FOR UPDATE",
      [row.customer_id]
    );
    const wallet = w.rows[0];
    if (!wallet) throw new NotFound("Không tìm thấy ví của khách hàng.");

    const before = parseFloat(wallet.balance);
    const after = before + amount;
    await client.query("UPDATE customer_wallets SET balance = $1 WHERE customer_id = $2", [after, row.customer_id]);
    await client.query(
      `INSERT INTO wallet_transactions
         (wallet_id, transaction_code, transaction_type, amount, balance_before, balance_after,
          reference_type, reference_id, description, status)
       VALUES ($1,$2,'REFUND',$3,$4,$5,'REFUND',$6,$7,'SUCCESS')`,
      [wallet.id, `REF-${Date.now()}`, amount, before, after, reservationId,
       `Hoàn cọc do hủy phiếu đặt bàn #${reservationId}`]
    );
    await client.query(
      "UPDATE reservations SET deposit_status = 'REFUNDED', updated_at = NOW() WHERE reservation_id = $1",
      [reservationId]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Mat coc (NO_SHOW): tien da tru truoc do, chi doi trang thai. Chi ap khi dang HELD.
async function forfeitDeposit(reservationId) {
  await pool.query(
    "UPDATE reservations SET deposit_status = 'FORFEITED', updated_at = NOW() WHERE reservation_id = $1 AND deposit_status = 'HELD'",
    [reservationId]
  );
}

module.exports = { RATE, computeDeposit, chargeDeposit, refundDeposit, forfeitDeposit };
