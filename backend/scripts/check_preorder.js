// E2E self-check: don dat truoc -> gan ban -> Dong y (bep) -> vao hang doi bep. + Huy -> hoan coc.
// Chay: node scripts/check_preorder.js
const assert = require("assert");
const pool = require("../src/config/db");
const orderService = require("../src/modules/internal/order/order.service");
const orderRepo = require("../src/modules/internal/order/order.repository");

const CO = 4, BR = 17, TABLE = 7, CUST = 1, MENU = 1;
const kitchenUser = { company_id: CO, branch_id: BR, role: "KITCHEN", id: 55, employee_id: 55 };

async function mkReservation(depositStatus = "NONE", depositAmount = 0) {
  const r = await pool.query(
    `INSERT INTO reservations (reservation_code, company_id, branch_id, customer_id, customer_name,
       customer_phone, reservation_date, reservation_time, guest_count, status, deposit_amount, deposit_status)
     VALUES ($1,$2,$3,$4,'E2E Test','0900000000',CURRENT_DATE, '19:00', 2, 'PENDING', $5, $6)
     RETURNING reservation_id`,
    [`E2E-${Date.now()}-${Math.floor(Math.random()*1000)}`, CO, BR, CUST, depositAmount, depositStatus]
  );
  return r.rows[0].reservation_id;
}

async function cleanup(reservationId) {
  await pool.query("DELETE FROM order_items WHERE order_id IN (SELECT order_id FROM orders WHERE reservation_id=$1)", [reservationId]);
  await pool.query("DELETE FROM orders WHERE reservation_id=$1", [reservationId]);
  await pool.query("DELETE FROM wallet_transactions WHERE reference_id=$1 AND reference_type='REFUND'", [reservationId]);
  await pool.query("DELETE FROM reservations WHERE reservation_id=$1", [reservationId]);
}

async function testConfirm() {
  const resId = await mkReservation();
  try {
    // 1. Tao don dat truoc (SCHEDULED, chua ban)
    const pre = await orderService.createScheduledPreorder({
      company_id: CO, branch_id: BR, customer_id: CUST, reservation_id: resId,
      guest_count: 2, items: [{ menu_item_id: MENU, quantity: 2 }],
    });
    // 2. Truoc khi gan ban -> bep KHONG thay
    let list = await orderService.listPreorders(kitchenUser);
    assert(!list.find((p) => p.reservation_id === resId), "Chua gan ban ma bep da thay (sai)");

    // 3. Le tan gan ban -> gan table cho order SCHEDULED (mo phong assignTable)
    await orderRepo.setScheduledOrderTable(pool, resId, TABLE);
    await pool.query("UPDATE reservations SET table_id=$1 WHERE reservation_id=$2", [TABLE, resId]);

    // 4. Bep thay don dat truoc
    list = await orderService.listPreorders(kitchenUser);
    const seen = list.find((p) => p.reservation_id === resId);
    assert(seen, "Da gan ban ma bep khong thay (sai)");
    assert.strictEqual(seen.table_number != null, true, "Thieu so ban");
    assert.strictEqual(seen.items.length, 1, "Sai so mon");

    // 5. Dong y -> activate
    const confirmed = await orderService.confirmPreorder(kitchenUser, resId);
    assert.strictEqual(confirmed.order_id, pre.id, "order_id tra ve sai");

    // 6. Kiem tra DB: order CONFIRMED + table dung + item WAITING
    const o = await pool.query("SELECT status, table_id FROM orders WHERE order_id=$1", [pre.id]);
    assert.strictEqual(o.rows[0].status, "CONFIRMED", "Order chua CONFIRMED");
    assert.strictEqual(o.rows[0].table_id, TABLE, "Table sai");
    const it = await pool.query("SELECT kitchen_status FROM order_items WHERE order_id=$1", [pre.id]);
    assert.strictEqual(it.rows[0].kitchen_status, "WAITING", "Item khong WAITING");

    // 7. Mon vao hang doi bep
    const queue = await orderRepo.findKitchenQueue(CO, BR);
    assert(queue.find((q) => q.order_id === pre.id), "Mon khong xuong hang doi bep");

    // 8. Khong con o muc dat truoc
    list = await orderService.listPreorders(kitchenUser);
    assert(!list.find((p) => p.reservation_id === resId), "Van con o muc dat truoc sau khi Dong y");

    // 9. Dong y lai -> loi
    await assert.rejects(() => orderService.confirmPreorder(kitchenUser, resId), /không tồn tại|đã được xử lý/, "Confirm lai phai loi");

    console.log("PASS confirm flow");
  } finally {
    await cleanup(resId);
  }
}

async function testCancelRefund() {
  const DEPOSIT = 50000;
  const resId = await mkReservation("HELD", DEPOSIT);
  try {
    await orderService.createScheduledPreorder({
      company_id: CO, branch_id: BR, customer_id: CUST, reservation_id: resId,
      guest_count: 2, items: [{ menu_item_id: MENU, quantity: 1 }],
    });
    await orderRepo.setScheduledOrderTable(pool, resId, TABLE);

    // dam bao khach co vi
    await pool.query("INSERT INTO customer_wallets (customer_id, balance) VALUES ($1,0) ON CONFLICT (customer_id) DO NOTHING", [CUST]);
    const before = parseFloat((await pool.query("SELECT balance FROM customer_wallets WHERE customer_id=$1", [CUST])).rows[0].balance);

    await orderService.cancelPreorder(kitchenUser, resId);

    const after = parseFloat((await pool.query("SELECT balance FROM customer_wallets WHERE customer_id=$1", [CUST])).rows[0].balance);
    assert.strictEqual(after - before, DEPOSIT, `Hoan coc sai: ${before} -> ${after}`);

    const r = await pool.query("SELECT status, deposit_status FROM reservations WHERE reservation_id=$1", [resId]);
    assert.strictEqual(r.rows[0].status, "CANCELLED", "Reservation chua CANCELLED");
    assert.strictEqual(r.rows[0].deposit_status, "REFUNDED", "deposit chua REFUNDED");

    const tx = await pool.query("SELECT transaction_type, description FROM wallet_transactions WHERE reference_id=$1 AND reference_type='REFUND'", [resId]);
    assert.strictEqual(tx.rows[0].transaction_type, "REFUND", "Khong ghi REFUND");

    console.log("PASS cancel+refund flow (log:", tx.rows[0].description + ")");
  } finally {
    await cleanup(resId);
  }
}

(async () => {
  try {
    await testConfirm();
    await testCancelRefund();
    console.log("ALL PASS");
    process.exit(0);
  } catch (e) {
    console.error("FAIL:", e.message);
    process.exit(1);
  }
})();
