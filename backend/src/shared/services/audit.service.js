
const pool = require("../../config/db");
const logger = require("../utils/logger");

// Trich thong tin nguoi thuc hien tu req.user (neu co).
function actorFrom(user) {
  if (!user) return { actor_type: "system", actor_id: null, actor_name: null, company_id: null, branch_id: null };
  return {
    actor_type: user.type || "staff",
    actor_id: user.id ?? null,
    actor_name: user.full_name || user.username || null,
    company_id: user.company_id ?? null,
    branch_id: user.branch_id ?? null,
  };
}

// Ghi 1 dong audit. entry: { action, entityType, entityId, description, metadata }
// context: { user, ip } (thuong lay tu req).
async function record({ user, ip } = {}, entry = {}) {
  try {
    const a = actorFrom(user);
    await pool.query(
      `INSERT INTO audit_logs
         (actor_type, actor_id, actor_name, company_id, branch_id,
          action, entity_type, entity_id, description, ip, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        a.actor_type, a.actor_id, a.actor_name, a.company_id, a.branch_id,
        entry.action, entry.entityType ?? null, entry.entityId ?? null,
        entry.description ?? null, ip ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
      ]
    );
  } catch (err) {
    logger.warn({ err }, "Ghi audit log thất bại (bỏ qua)");
  }
}

// Helper lay context tu request Express.
function ctx(req) {
  req._auditManuallyLogged = true; // Đánh dấu là đã log thủ công để middleware không log trùng
  return { user: req.user, ip: req.ip };
}

// Truy van log (cho API doc noi bo). Loc theo pham vi cong ty.
async function query(companyId, { action, entityType, actorId, from, to, limit = 100, offset = 0 } = {}) {
  const values = [];
  const conds = [];
  // SUPER_ADMIN (companyId = null/undefined) xem toan bo; con lai loc theo cong ty.
  if (companyId != null) { values.push(companyId); conds.push(`company_id = $${values.length}`); }
  if (action) { values.push(action); conds.push(`action = $${values.length}`); }
  if (entityType) { values.push(entityType); conds.push(`entity_type = $${values.length}`); }
  if (actorId) { values.push(actorId); conds.push(`actor_id = $${values.length}`); }
  if (from) { values.push(from); conds.push(`created_at >= $${values.length}`); }
  if (to) { values.push(to); conds.push(`created_at <= $${values.length}`); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  values.push(limit); const limitIdx = values.length;
  values.push(offset); const offsetIdx = values.length;
  // COUNT(*) OVER() tra ve tong so dong (sau filter) ngay trong cung 1 query.
  const r = await pool.query(
    `SELECT *, audit_log_id AS id, COUNT(*) OVER() AS total FROM audit_logs ${where}
     ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    values
  );
  const total = r.rows.length ? Number(r.rows[0].total) : 0;
  const rows = r.rows.map(({ total: _t, ...row }) => row);
  return { rows, total };
}

module.exports = { record, ctx, query };
