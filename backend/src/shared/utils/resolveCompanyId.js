// src/shared/utils/resolveCompanyId.js
// SUPER_ADMIN tu chon cong ty (body/query); vai tro khac khoa theo cong ty cua minh.
function resolveCompanyId(req) {
  if (req.user.role === "SUPER_ADMIN") {
    return req.body?.company_id || req.query?.company_id;
  }
  return req.user.company_id;
}

module.exports = { resolveCompanyId };
