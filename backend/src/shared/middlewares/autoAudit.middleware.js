// src/shared/middlewares/autoAudit.middleware.js
const audit = require("../services/audit.service");

// Middleware tự động lưu log cho các thao tác POST, PUT, PATCH, DELETE 
// đối với các route /internal/
function autoAuditMiddleware(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Bỏ qua các route auth (đăng nhập, lấy token)
  if (req.originalUrl.includes('/internal/auth/')) {
    return next();
  }

  const originalJson = res.json;

  res.json = function (body) {
    // Khôi phục lại json gốc
    res.json = originalJson;

    // Nếu controller đã tự gọi thủ công audit.record() thì bỏ qua
    if (req._auditManuallyLogged) {
      return originalJson.call(this, body);
    }

    // Xác định hành động (CREATE, UPDATE, DELETE)
    let action = 'UPDATE';
    if (req.method === 'POST') action = 'CREATE';
    if (req.method === 'DELETE') action = 'DELETE';

    // Parse entityType từ URL (vd: /api/internal/vouchers -> VOUCHER)
    const pathParts = req.originalUrl.split('?')[0].split('/').filter(Boolean);
    const internalIdx = pathParts.indexOf('internal');
    let entityType = 'UNKNOWN';
    let entityId = null;

    if (internalIdx >= 0 && pathParts[internalIdx + 1]) {
      let rawEntity = pathParts[internalIdx + 1].toUpperCase();
      if (rawEntity.endsWith('S') && rawEntity !== 'STATUS') {
        rawEntity = rawEntity.slice(0, -1);
      }
      entityType = rawEntity;
      
      // Nếu có param ID phía sau
      if (pathParts[internalIdx + 2] && !isNaN(Number(pathParts[internalIdx + 2]))) {
        entityId = Number(pathParts[internalIdx + 2]);
      }
    }

    // Nếu không có mô tả từ manual, dùng message từ API response
    let description = body?.message || `${action} thao tác trên ${entityType}`;

    // Ghi log tự động
    audit.record(audit.ctx(req), {
      action,
      entityType,
      entityId,
      description,
      metadata: { path: req.originalUrl, method: req.method }
    });

    return originalJson.call(this, body);
  };

  next();
}

module.exports = { autoAuditMiddleware };
