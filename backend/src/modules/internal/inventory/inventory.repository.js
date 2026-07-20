// src/modules/internal/inventory/inventory.repository.js
// PK: ingredients.ingredient_id, recipes.recipe_id, inventory_transactions.inventory_transaction_id,
//     menu_items.menu_item_id, employees.employee_id, orders.order_id. (alias AS id cho tang tren)
const pool = require("../../../config/db");

// ================= INGREDIENTS =================
exports.findIngredients = (companyId, branchId, { status, search } = {}) => {
  const values = [companyId];
  let where = "WHERE i.company_id = $1";
  if (status) { values.push(status); where += ` AND i.status = $${values.length}`; }
  if (search) { values.push(`%${search}%`); where += ` AND (i.ingredient_name ILIKE $${values.length} OR i.ingredient_code ILIKE $${values.length})`; }
  
  if (branchId) {
    values.push(branchId);
    where += ` AND bi.branch_id = $${values.length}`;
    return pool
      .query(`SELECT i.*, bi.current_stock, bi.minimum_stock, i.ingredient_id AS id 
              FROM ingredients i 
              JOIN branch_inventory bi ON bi.ingredient_id = i.ingredient_id
              ${where} ORDER BY i.ingredient_name`, values)
      .then((r) => r.rows);
  } else {
    return pool
      .query(`SELECT i.*, i.ingredient_id AS id 
              FROM ingredients i 
              ${where} ORDER BY i.ingredient_name`, values)
      .then((r) => r.rows);
  }
};

exports.findLowStock = (companyId, branchId) =>
  pool
    .query(
      `SELECT i.*, bi.current_stock, bi.minimum_stock, i.ingredient_id AS id 
       FROM ingredients i
       JOIN branch_inventory bi ON bi.ingredient_id = i.ingredient_id
       WHERE i.company_id = $1 AND bi.branch_id = $2 AND i.status = 'ACTIVE' AND bi.current_stock <= bi.minimum_stock
       ORDER BY (bi.current_stock - bi.minimum_stock) ASC`,
      [companyId, branchId]
    )
    .then((r) => r.rows);

exports.findIngredientById = (id, companyId, branchId) =>
  pool
    .query(`SELECT i.*, bi.current_stock, bi.minimum_stock, i.ingredient_id AS id 
            FROM ingredients i 
            LEFT JOIN branch_inventory bi ON bi.ingredient_id = i.ingredient_id AND bi.branch_id = $3
            WHERE i.ingredient_id = $1 AND i.company_id = $2`, [id, companyId, branchId])
    .then((r) => r.rows[0]);

exports.insertIngredient = async (companyId, branchId, d) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ing = (await client.query(
      `INSERT INTO ingredients (company_id, ingredient_code, ingredient_name, unit, cost_price, note)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *, ingredient_id AS id`,
      [companyId, d.ingredient_code, d.ingredient_name, d.unit, d.cost_price || 0, d.note || null]
    )).rows[0];

    const current = d.current_stock || 0;
    const minimum = d.minimum_stock || 0;
    
    // Insert for the specific branch
    if (branchId) {
      await client.query(
        `INSERT INTO branch_inventory (branch_id, ingredient_id, current_stock, minimum_stock)
         VALUES ($1,$2,$3,$4)`,
        [branchId, ing.id, current, minimum]
      );
    }
    
    await client.query("COMMIT");
    return { ...ing, current_stock: current, minimum_stock: minimum };
  } catch(e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

exports.updateIngredient = async (id, companyId, branchId, d) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ing = (await client.query(
      `UPDATE ingredients
       SET ingredient_code = COALESCE($3, ingredient_code),
           ingredient_name = COALESCE($4, ingredient_name),
           unit            = COALESCE($5, unit),
           cost_price      = COALESCE($6, cost_price),
           status          = COALESCE($7, status),
           note            = COALESCE($8, note),
           updated_at = NOW()
       WHERE ingredient_id = $1 AND company_id = $2 RETURNING *, ingredient_id AS id`,
      [id, companyId, d.ingredient_code, d.ingredient_name, d.unit,
       d.cost_price, d.status, d.note]
    )).rows[0];

    if (ing && branchId) {
      await client.query(
        `INSERT INTO branch_inventory (branch_id, ingredient_id, minimum_stock)
         VALUES ($1,$2,COALESCE($3, 0))
         ON CONFLICT (branch_id, ingredient_id) DO UPDATE SET minimum_stock = COALESCE($3, branch_inventory.minimum_stock)`,
        [branchId, id, d.minimum_stock]
      );
    }

    await client.query("COMMIT");
    return ing;
  } catch(e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

exports.deactivateIngredient = (id, companyId) =>
  pool
    .query(
      "UPDATE ingredients SET status = 'INACTIVE', updated_at = NOW() WHERE ingredient_id = $1 AND company_id = $2 RETURNING *, ingredient_id AS id",
      [id, companyId]
    )
    .then((r) => r.rows[0]);

// ================= RECIPES =================
exports.findMenuItem = (menuItemId, companyId) =>
  pool
    .query("SELECT menu_item_id AS id, name FROM menu_items WHERE menu_item_id = $1 AND company_id = $2", [menuItemId, companyId])
    .then((r) => r.rows[0]);

exports.findRecipeByMenuItem = (menuItemId) =>
  pool
    .query(
      `SELECT r.recipe_id AS id, r.menu_item_id, r.ingredient_id, r.quantity, r.notes,
              i.ingredient_code, i.ingredient_name, i.unit, i.cost_price
       FROM recipes r JOIN ingredients i ON i.ingredient_id = r.ingredient_id
       WHERE r.menu_item_id = $1 ORDER BY i.ingredient_name`,
      [menuItemId]
    )
    .then((r) => r.rows);

// Thay toan bo cong thuc cua 1 mon (xoa cu, chen moi) trong transaction
exports.replaceRecipe = async (menuItemId, items) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM recipes WHERE menu_item_id = $1", [menuItemId]);
    for (const it of items) {
      await client.query(
        `INSERT INTO recipes (menu_item_id, ingredient_id, quantity, notes)
         VALUES ($1,$2,$3,$4)`,
        [menuItemId, it.ingredient_id, it.quantity, it.notes || null]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

exports.deleteRecipeLine = (recipeId) =>
  pool.query("DELETE FROM recipes WHERE recipe_id = $1 RETURNING recipe_id AS id", [recipeId]).then((r) => r.rows[0]);

// ================= INVENTORY TRANSACTIONS =================
exports.applyStockChange = async ({ ingredientId, companyId, branchId, delta, type, referenceType, referenceId, note, createdBy }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Lock branch inventory instead
    const ing = (
      await client.query(
        `SELECT bi.current_stock, bi.minimum_stock 
         FROM branch_inventory bi 
         JOIN ingredients i ON i.ingredient_id = bi.ingredient_id
         WHERE bi.ingredient_id = $1 AND i.company_id = $2 AND bi.branch_id = $3 FOR UPDATE`,
        [ingredientId, companyId, branchId]
      )
    ).rows[0];
    
    if (!ing) { await client.query("ROLLBACK"); return null; }

    const before = Number(ing.current_stock);
    const after = before + Number(delta);

    await client.query("UPDATE branch_inventory SET current_stock = $1, updated_at = NOW() WHERE ingredient_id = $2 AND branch_id = $3", [after, ingredientId, branchId]);
    const tx = (
      await client.query(
        `INSERT INTO inventory_transactions
           (ingredient_id, branch_id, transaction_type, reference_type, reference_id, quantity, stock_before, stock_after, created_by, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *, inventory_transaction_id AS id`,
        [ingredientId, branchId, type, referenceType || null, referenceId || null, delta, before, after, createdBy || null, note || null]
      )
    ).rows[0];

    await client.query("COMMIT");
    return { transaction: tx, lowStock: after <= Number(ing.minimum_stock) };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

exports.findTransactions = (companyId, branchId, { ingredientId, type, limit = 100 } = {}) => {
  const values = [companyId];
  let where = "WHERE i.company_id = $1";
  
  if (branchId) {
    values.push(branchId);
    where += ` AND t.branch_id = $${values.length}`;
  }
  
  if (ingredientId) { values.push(ingredientId); where += ` AND t.ingredient_id = $${values.length}`; }
  if (type) { values.push(type); where += ` AND t.transaction_type = $${values.length}`; }
  values.push(limit);
  return pool
    .query(
      `SELECT t.*, t.inventory_transaction_id AS id, i.ingredient_code, i.ingredient_name, i.unit, e.full_name AS created_by_name
       FROM inventory_transactions t
       JOIN ingredients i ON i.ingredient_id = t.ingredient_id
       LEFT JOIN employees e ON e.employee_id = t.created_by
       ${where}
       ORDER BY t.created_at DESC LIMIT $${values.length}`,
      values
    )
    .then((r) => r.rows);
};

// Lay danh sach mon cua 1 order (de tinh nhu cau nguyen lieu)
exports.findOrderDishes = (orderId, companyId, branchId) =>
  pool
    .query(
      `SELECT oi.menu_item_id, SUM(oi.quantity) AS qty
       FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
       WHERE o.order_id = $1 AND o.company_id = $2 AND o.branch_id = $3
       GROUP BY oi.menu_item_id`,
      [orderId, companyId, branchId]
    )
    .then((r) => r.rows);
