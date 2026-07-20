// src/modules/internal/company/company.service.js
// SUPER_ADMIN: quan ly moi cong ty (+ tao moi).
// COMPANY_ADMIN: chi xem/sua CONG TY CUA MINH, khong thay cong ty khac, khong tao moi.
const repo = require("./company.repository");
const { Forbidden, NotFound, BadRequest } = require("../../../shared/errors/AppError");

function assertOwnCompany(currentUser, id) {
  if (currentUser.role === "SUPER_ADMIN") return;
  if (currentUser.role === "COMPANY_ADMIN" && Number(currentUser.company_id) === Number(id)) return;
  throw new Forbidden("Bạn không có quyền với công ty này");
}

exports.getCompanies = (currentUser) => {
  if (currentUser.role === "SUPER_ADMIN") return repo.listAll();
  if (currentUser.role === "COMPANY_ADMIN") {
    if (!currentUser.company_id) return [];
    return repo.findById(currentUser.company_id).then((c) => (c ? [c] : []));
  }
  throw new Forbidden("Bạn không có quyền xem công ty");
};

exports.getCompany = async (currentUser, id) => {
  assertOwnCompany(currentUser, id);
  const company = await repo.findById(id);
  if (!company) throw new NotFound("Công ty không tồn tại");
  return company;
};

exports.createCompany = (currentUser, data) => {
  if (currentUser.role !== "SUPER_ADMIN") {
    throw new Forbidden("Chỉ quản trị hệ thống được tạo công ty mới");
  }
  if (!data.name) throw new BadRequest("Vui lòng nhập tên công ty");
  return repo.create(data);
};

exports.updateCompany = async (currentUser, id, data) => {
  assertOwnCompany(currentUser, id);
  const existing = await repo.findById(id);
  if (!existing) throw new NotFound("Công ty không tồn tại");
  return repo.update(id, data);
};
