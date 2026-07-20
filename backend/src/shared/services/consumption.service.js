// src/shared/services/consumption.service.js
// OrderConsumptionService: TU DONG tru kho nguyen lieu khi BEP BAT DAU NAU
// (order_items.kitchen_status: WAITING -> COOKING). Day la thoi diem nguyen lieu
// bi tieu hao KHONG THE DAO NGUOC (da nau thi khong hoan kho duoc).
//
// Chinh sach:
//   * Chi tru khi mon chuyen tu WAITING sang trang thai nau (COOKING/READY/SERVED).
//   * Huy mon TRUOC khi nau -> khong tru gi (chua tieu hao).
//   * Huy mon SAU khi nau -> khong hoan kho (nguyen lieu da mat -> WASTE o cap ban hang).
//   * KHONG chan nau khi thieu ton kho (ton co the am); chi canh bao de nhap them.

const logger = require("../utils/logger");

// Tinh nhu cau nguyen lieu cho danh sach mon [{menu_item_id, qty}] (KHONG tru kho).
async function calculateNeeds(db, dishItems, branchId) {
  if (!dishItems.length) return [];
  const menuIds = dishItems.map((d) => d.menu_item_id);
  const qtyByMenu = new Map(dishItems.map((d) => [d.menu_item_id, Number(d.qty)]));

  const recipes = await db.query(
    `SELECT r.menu_item_id, r.ingredient_id, r.quantity,
            i.ingredient_name, i.unit, bi.current_stock, bi.minimum_stock
     FROM recipes r
     JOIN ingredients i ON i.ingredient_id = r.ingredient_id
     LEFT JOIN branch_inventory bi ON bi.ingredient_id = i.ingredient_id AND bi.branch_id = $2
     WHERE r.menu_item_id = ANY($1::int[]) AND i.status = 'ACTIVE'`,
    [menuIds, branchId]
  );

  const needs = new Map();
  for (const r of recipes.rows) {
    const dishQty = qtyByMenu.get(r.menu_item_id) || 0;
    const amount = dishQty * Number(r.quantity);
    const cur = needs.get(r.ingredient_id);
    if (cur) cur.required += amount;
    else
      needs.set(r.ingredient_id, {
        ingredient_id: r.ingredient_id,
        ingredient_name: r.ingredient_name,
        unit: r.unit,
        required: amount,
        current_stock: Number(r.current_stock),
        minimum_stock: Number(r.minimum_stock),
      });
  }
  return [...needs.values()];
}

// Core: tru kho theo danh sach nhu cau (needs) - PHAI chay trong transaction (client).
async function deductNeeds(client, branchId, needs, { referenceType, referenceId, createdBy = null, note }) {
  if (!needs.length) return { consumed: [], lowStock: [] };

  const ids = needs.map((n) => n.ingredient_id).sort((a, b) => a - b);
  const locked = await client.query(
    `SELECT bi.ingredient_id AS id, bi.current_stock, bi.minimum_stock 
     FROM branch_inventory bi 
     WHERE bi.ingredient_id = ANY($1::int[]) AND bi.branch_id = $2
     ORDER BY bi.ingredient_id FOR UPDATE`,
    [ids, branchId]
  );
  const stockById = new Map(locked.rows.map((r) => [r.id, r]));

  const consumed = [];
  const lowStock = [];

  for (const n of needs) {
    const row = stockById.get(n.ingredient_id);
    if (!row) continue;
    const before = Number(row.current_stock);
    const after = before - n.required;

    await client.query("UPDATE branch_inventory SET current_stock = $1, updated_at = NOW() WHERE ingredient_id = $2 AND branch_id = $3", [
      after,
      n.ingredient_id,
      branchId,
    ]);
    await client.query(
      `INSERT INTO inventory_transactions
         (ingredient_id, branch_id, transaction_type, reference_type, reference_id, quantity, stock_before, stock_after, created_by, note)
       VALUES ($1, $2, 'SALE_CONSUMPTION', $3, $4, $5, $6, $7, $8, $9)`,
      [n.ingredient_id, branchId, referenceType, referenceId || null, -n.required, before, after, createdBy, note]
    );

    consumed.push({ ...n, stock_before: before, stock_after: after });
    if (after <= Number(row.minimum_stock)) lowStock.push({ ...n, stock_after: after });
  }

  if (lowStock.length) {
    logger.warn(
      { lowStock: lowStock.map((l) => `${l.ingredient_name}: ${l.stock_after}${l.unit} (min ${l.minimum_stock})`) },
      "⚠️ CANH BAO TON KHO: nguyen lieu duoi muc toi thieu"
    );
  }
  return { consumed, lowStock };
}

// Tru kho cho MOT mon an duoc bep bat dau nau.
// dish = { menu_item_id, quantity }. referenceId = order_id.
async function consumeForDish(client, dish, { orderId, branchId, orderItemId, createdBy = null }) {
  const needs = await calculateNeeds(client, [{ menu_item_id: dish.menu_item_id, qty: dish.quantity }], branchId);
  return deductNeeds(client, branchId, needs, {
    referenceType: "ORDER",
    referenceId: orderId,
    createdBy,
    note: `Tiêu hao khi nấu (order #${orderId}, món #${orderItemId})`,
  });
}

module.exports = { calculateNeeds, deductNeeds, consumeForDish };
