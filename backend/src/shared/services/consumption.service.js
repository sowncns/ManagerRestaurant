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
const { BadRequest } = require("../errors/AppError");

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

// Chan oversell: kiem tra ton kho DU cho cac mon MOI truoc khi nhan vao don.
// Chinh sach A: available = current_stock - nhu cau cac mon dang WAITING (chua nau) cua chi nhanh.
//   - Mon da nau: da tru khoi current_stock -> khong tinh lai.
//   - Mon dang WAITING: chua tru -> la nhu cau da "giu cho".
// PHAI chay trong transaction. Khoa branch_inventory TRUOC khi tinh nhu cau WAITING (chong race 2 order dong thoi).
// newItems = [{ menu_item_id, quantity }].
async function assertStockForNewItems(client, branchId, newItems) {
  const needs = await calculateNeeds(
    client,
    newItems.map((i) => ({ menu_item_id: i.menu_item_id, qty: i.quantity })),
    branchId
  );
  if (!needs.length) return; // mon khong co cong thuc -> khong kiem tra

  const ids = needs.map((n) => n.ingredient_id).sort((a, b) => a - b);
  const locked = await client.query(
    `SELECT ingredient_id AS id, current_stock
     FROM branch_inventory WHERE ingredient_id = ANY($1::int[]) AND branch_id = $2
     ORDER BY ingredient_id FOR UPDATE`,
    [ids, branchId]
  );
  const stockById = new Map(locked.rows.map((r) => [r.id, Number(r.current_stock)]));

  // Nhu cau cac mon dang WAITING (chua tru kho) cua don dine-in dang hoat dong.
  // Chi tinh don dang phuc vu (khong tinh preorder SCHEDULED - dat cho tuong lai, kho co the nhap them truoc).
  // ponytail: danh sach status dine-in copy tu order.repository.ACTIVE_STATUSES; doi 1 cho thi sua ca 2.
  const waiting = await client.query(
    `SELECT r.ingredient_id, SUM(oi.quantity * r.quantity) AS required
     FROM order_items oi
     JOIN orders o ON o.order_id = oi.order_id
     JOIN recipes r ON r.menu_item_id = oi.menu_item_id
     WHERE o.branch_id = $2
       AND o.status = ANY('{PENDING,CONFIRMED,PREPARING,READY,SERVED}'::text[])
       AND COALESCE(oi.kitchen_status, 'WAITING') = 'WAITING'
       AND r.ingredient_id = ANY($1::int[])
     GROUP BY r.ingredient_id`,
    [ids, branchId]
  );
  const waitingById = new Map(waiting.rows.map((r) => [r.ingredient_id, Number(r.required)]));

  const shortIds = [];
  for (const n of needs) {
    const stock = stockById.get(n.ingredient_id);
    if (stock == null) continue; // chi nhanh chua khai bao ton kho nguyen lieu nay -> giu hanh vi cu (khong chan)
    const available = stock - (waitingById.get(n.ingredient_id) || 0);
    if (n.required > available) shortIds.push(n.ingredient_id);
  }
  if (!shortIds.length) return;

  // Map nguyen lieu thieu -> mon nao trong don khong lam duoc (chi bao ten MON, khong lo nguyen lieu).
  const affected = await client.query(
    `SELECT DISTINCT menu_item_id FROM recipes WHERE menu_item_id = ANY($1::int[]) AND ingredient_id = ANY($2::int[])`,
    [newItems.map((i) => i.menu_item_id), shortIds]
  );
  const nameById = new Map(newItems.map((i) => [i.menu_item_id, i.item_name]));
  const dishes = [...new Set(affected.rows.map((r) => nameById.get(r.menu_item_id)).filter(Boolean))];
  throw new BadRequest(dishes.length ? `Đã hết món: ${dishes.join(", ")}` : "Món đã hết");
}

module.exports = { calculateNeeds, deductNeeds, consumeForDish, assertStockForNewItems };
