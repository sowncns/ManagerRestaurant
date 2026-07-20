

const pool = require("../../config/db");

const CASHBACK_RATES = { normal: 0, silver: 0.01, gold: 0.03, platinum: 0.05 };

// Doc ti le cashback theo hang tu bang config. Nhan `db` (pool hoac client transaction).
async function getCashbackRate(rank, db = pool) {
  const key = (rank || "normal").toLowerCase();
  const r = await db.query("SELECT rate FROM cashback_rates WHERE rank = $1", [key]);
  return r.rows[0] ? parseFloat(r.rows[0].rate) : (CASHBACK_RATES[key] || 0);
}

async function applyCashback(client, invoiceId) {
  const invRes = await client.query(
    "SELECT customer_id, amount, invoice_code FROM invoices WHERE invoice_id = $1",
    [invoiceId]
  );
  if (invRes.rowCount === 0) return;
  const inv = invRes.rows[0];
  if (!inv.customer_id) return; 
  const custRes = await client.query(
    `SELECT c.rank, w.wallet_id AS wallet_id, w.balance
     FROM customers c JOIN customer_wallets w ON c.customer_id = w.customer_id
     WHERE c.customer_id = $1 AND w.status = 'ACTIVE'`,
    [inv.customer_id]
  );
  if (custRes.rowCount === 0) return;
  const cust = custRes.rows[0];

  const rate = await getCashbackRate(cust.rank, client);
  if (rate <= 0) return;

  const cashbackAmount = parseFloat(inv.amount) * rate;
  if (cashbackAmount <= 0) return;

  const balanceBefore = parseFloat(cust.balance);
  const balanceAfter = balanceBefore + cashbackAmount;

  await client.query("UPDATE customer_wallets SET balance = $1 WHERE wallet_id = $2", [
    balanceAfter,
    cust.wallet_id,
  ]);

  await client.query(
    `INSERT INTO wallet_transactions (
       wallet_id, transaction_code, transaction_type, amount,
       balance_before, balance_after, reference_type, reference_id,
       description, status
     ) VALUES ($1, $2, 'TOPUP', $3, $4, $5, 'INVOICE', $6, $7, 'SUCCESS')`,
    [
      cust.wallet_id,
      `CB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      cashbackAmount,
      balanceBefore,
      balanceAfter,
      invoiceId,
      `Hoàn tiền Cashback cho hóa đơn ${inv.invoice_code}`,
    ]
  );
}

module.exports = { applyCashback, getCashbackRate, CASHBACK_RATES };
