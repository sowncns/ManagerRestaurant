// src/modules/internal/audit/audit.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const audit = require("../../../shared/services/audit.service");

exports.list = asyncHandler(async (req, res) => {
  const { action, entityType, actorId, from, to } = req.query;
  // SUPER_ADMIN xem toan bo; con lai gioi han trong cong ty cua minh.
  const companyId = req.user.role === "SUPER_ADMIN" ? null : req.user.company_id;
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const { rows: logs, total } = await audit.query(companyId, {
    action,
    entityType,
    actorId: actorId ? Number(actorId) : undefined,
    from,
    to,
    limit,
    offset: (page - 1) * limit,
  });
  const mappedLogs = logs.map(log => ({
    id: log.id,
    employee_name: log.actor_name,
    action: log.action,
    entity: log.entity_type || 'UNKNOWN',
    entity_id: log.entity_id,
    details: log.metadata ? { thao_tac: log.description, ...log.metadata } : { thao_tac: log.description },
    ip_address: log.ip,
    created_at: log.created_at,
  }));

  res.json({
    message: "Lấy nhật ký hệ thống thành công",
    logs: mappedLogs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
