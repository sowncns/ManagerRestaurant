// src/modules/internal/procurement/procurement.repository.js
// PK: suppliers.supplier_id, purchase_receipts.purchase_receipt_id,
//     purchase_receipt_items.purchase_receipt_item_id. (alias AS id cho tang tren)
// Pham vi: theo company_id (giong module inventory).
const pool = require("../../../config/db");

// ================= SUPPLIERS =================
exports.findSuppliers = (companyId, { status, search } = {}) => {
  const values = [companyId];
  let where = "WHERE company_id = $1";
  if (status) { values.push(status); where += ` AND status = $${values.length}`; }
  if (search) {
    values.push(`%${search}%`);
    where += ` AND (supplier_name ILIKE $${values.length} OR supplier_code ILIKE $${values.length} OR phone ILIKE $${values.length})`;
  }
  return pool
    .query(`SELECT *, supplier_id AS id FROM suppliers ${where} ORDER BY supplier_name`, values)
    .then((r) => r.rows);
};

exports.findSupplierById = (id, companyId) =>
  pool
    .query("SELECT *, supplier_id AS id FROM suppliers WHERE supplier_id = $1 AND company_id = $2", [id, companyId])
    .then((r) => r.rows[0]);

exports.insertSupplier = (companyId, d) =>
  pool
    .query(
      `INSERT INTO suppliers (company_id, supplier_code, supplier_name, phone, email, address, tax_code, contact_name, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *, supplier_id AS id`,
      [companyId, d.supplier_code, d.supplier_name, d.phone ?? null, d.email ?? null,
       d.address ?? null, d.tax_code ?? null, d.contact_name ?? null, d.note ?? null]
    )
    .then((r) => r.rows[0]);

exports.updateSupplier = (id, companyId, fields) => {
  const cols = [];
  const values = [];
  for (const [key, val] of Object.entries(fields)) {
    values.push(val);
    cols.push(`${key} = $${values.length}`);
  }
  if (cols.length === 0) return exports.findSupplierById(id, companyId);
  values.push(id, companyId);
  return pool
    .query(
      `UPDATE suppliers SET ${cols.join(", ")}, updated_at = NOW()
       WHERE supplier_id = $${values.length - 1} AND company_id = $${values.length}
       RETURNING *, supplier_id AS id`,
      values
    )
    .then((r) => r.rows[0]);
};

// ================= PURCHASE RECEIPTS =================
exports.findReceipts = (companyId, { status, supplierId, limit = 100 } = {}) => {
  const values = [companyId];
  let where = "WHERE pr.company_id = $1";
  if (status) { values.push(status); where += ` AND pr.status = $${values.length}`; }
  if (supplierId) { values.push(supplierId); where += ` AND pr.supplier_id = $${values.length}`; }
  values.push(limit);
  return pool
    .query(
      `SELECT pr.*, pr.purchase_receipt_id AS id, s.supplier_name, s.supplier_code,
              b.name AS branch_name, e.full_name AS created_by_name
       FROM purchase_receipts pr
       JOIN suppliers s ON s.supplier_id = pr.supplier_id
       LEFT JOIN branches b ON b.branch_id = pr.branch_id
       LEFT JOIN employees e ON e.employee_id = pr.created_by
       ${where}
       ORDER BY pr.receipt_date DESC, pr.created_at DESC LIMIT $${values.length}`,
      values
    )
    .then((r) => r.rows);
};

exports.findReceiptById = (id, companyId) =>
  pool
    .query(
      `SELECT pr.*, pr.purchase_receipt_id AS id, s.supplier_name, s.supplier_code,
              b.name AS branch_name, e.full_name AS created_by_name
       FROM purchase_receipts pr
       JOIN suppliers s ON s.supplier_id = pr.supplier_id
       LEFT JOIN branches b ON b.branch_id = pr.branch_id
       LEFT JOIN employees e ON e.employee_id = pr.created_by
       WHERE pr.purchase_receipt_id = $1 AND pr.company_id = $2`,
      [id, companyId]
    )
    .then((r) => r.rows[0]);

exports.findReceiptItems = (receiptId) =>
  pool
    .query(
      `SELECT pri.*, pri.purchase_receipt_item_id AS id,
              i.ingredient_code, i.ingredient_name, i.unit
       FROM purchase_receipt_items pri
       JOIN ingredients i ON i.ingredient_id = pri.ingredient_id
       WHERE pri.purchase_receipt_id = $1
       ORDER BY pri.purchase_receipt_item_id`,
      [receiptId]
    )
    .then((r) => r.rows);

// Tao phieu nhap (DRAFT) + cac dong, trong 1 transaction.
// items da duoc validate & tinh line_amount o tang service.
exports.createReceipt = async (companyId, header, items) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const total = items.reduce((s, it) => s + Number(it.line_amount), 0);
    const receipt = (
      await client.query(
        `INSERT INTO purchase_receipts
           (company_id, branch_id, supplier_id, receipt_code, receipt_date, total_amount, status, note, created_by)
         VALUES ($1,$2,$3,$4,COALESCE($5, CURRENT_DATE),$6,'DRAFT',$7,$8)
         RETURNING purchase_receipt_id AS id`,
        [companyId, header.branch_id ?? null, header.supplier_id, header.receipt_code,
         header.receipt_date ?? null, total, header.note ?? null, header.created_by ?? null]
      )
    ).rows[0];

    for (const it of items) {
      await client.query(
        `INSERT INTO purchase_receipt_items
           (purchase_receipt_id, ingredient_id, quantity, unit_price, line_amount, note)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [receipt.id, it.ingredient_id, it.quantity, it.unit_price, it.line_amount, it.note ?? null]
      );
    }
    await client.query("COMMIT");
    return receipt.id;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

// Xac nhan phieu: cong ton kho tung nguyen lieu + sinh inventory_transactions (PURCHASE),
// cap nhat cost_price theo don gia moi (neu > 0), chuyen phieu -> CONFIRMED. Nguyen tu.
exports.confirmReceipt = async (receiptId, companyId, staffId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const receipt = (
      await client.query(
        "SELECT purchase_receipt_id AS id, status FROM purchase_receipts WHERE purchase_receipt_id = $1 AND company_id = $2 FOR UPDATE",
        [receiptId, companyId]
      )
    ).rows[0];
    if (!receipt) { await client.query("ROLLBACK"); return { error: "NOT_FOUND" }; }
    if (receipt.status !== "DRAFT") { await client.query("ROLLBACK"); return { error: "NOT_DRAFT", status: receipt.status }; }

    const items = (
      await client.query(
        "SELECT ingredient_id, quantity, unit_price FROM purchase_receipt_items WHERE purchase_receipt_id = $1",
        [receiptId]
      )
    ).rows;

    for (const it of items) {
      const ing = (
        await client.query(
          "SELECT ingredient_id AS id, current_stock FROM ingredients WHERE ingredient_id = $1 AND company_id = $2 FOR UPDATE",
          [it.ingredient_id, companyId]
        )
      ).rows[0];
      if (!ing) { await client.query("ROLLBACK"); return { error: "INGREDIENT_NOT_FOUND", ingredientId: it.ingredient_id }; }

      const before = Number(ing.current_stock);
      const after = before + Number(it.quantity);
      const price = Number(it.unit_price);

      await client.query(
        `UPDATE ingredients
         SET current_stock = $1,
             cost_price = CASE WHEN $2 > 0 THEN $2 ELSE cost_price END,
             updated_at = NOW()
         WHERE ingredient_id = $3`,
        [after, price, it.ingredient_id]
      );
      await client.query(
        `INSERT INTO inventory_transactions
           (ingredient_id, transaction_type, reference_type, reference_id, quantity, stock_before, stock_after, created_by, note)
         VALUES ($1,'PURCHASE','PURCHASE_RECEIPT',$2,$3,$4,$5,$6,$7)`,
        [it.ingredient_id, receiptId, it.quantity, before, after, staffId ?? null,
         `Nhập kho theo phiếu #${receiptId}`]
      );
    }

    await client.query(
      `UPDATE purchase_receipts
       SET status = 'CONFIRMED', confirmed_by = $1, confirmed_at = NOW(), updated_at = NOW()
       WHERE purchase_receipt_id = $2`,
      [staffId ?? null, receiptId]
    );
    await client.query("COMMIT");
    return { ok: true };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

exports.cancelReceipt = (id, companyId) =>
  pool
    .query(
      `UPDATE purchase_receipts SET status = 'CANCELLED', updated_at = NOW()
       WHERE purchase_receipt_id = $1 AND company_id = $2 AND status = 'DRAFT'
       RETURNING purchase_receipt_id AS id`,
      [id, companyId]
    )
    .then((r) => r.rows[0]);
