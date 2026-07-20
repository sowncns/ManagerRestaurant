// src/modules/internal/branch/branch.service.js
// Tang nghiep vu quan ly chi nhanh + kiem soat pham vi.
//  - SUPER_ADMIN : moi cong ty. COMPANY_ADMIN: trong cong ty minh. BRANCH_MANAGER: chi xem/sua chi nhanh minh.
const repo = require("./branch.repository");
const { NotFound, BadRequest, Forbidden } = require("../../../shared/errors/AppError");
const {
  assertManager,
  assertBranchScope,
  buildScopedBranchWhere,
} = require("../../../shared/utils/permission");

// Tao / xoa chi nhanh la thao tac cap cong ty: chi SUPER_ADMIN & COMPANY_ADMIN.
function assertCompanyAdmin(currentUser) {
  if (!["SUPER_ADMIN", "COMPANY_ADMIN"].includes(currentUser.role)) {
    throw new Forbidden("Chỉ quản trị công ty trở lên mới được thao tác chi nhánh");
  }
}

exports.getBranches = (currentUser) => {
  assertManager(currentUser);
  const values = [];
  const where = buildScopedBranchWhere(currentUser, values, "b");
  return repo.list(where, values);
};

exports.getBranch = async (currentUser, id) => {
  assertManager(currentUser);
  const branch = await repo.findById(id);
  if (!branch) throw new NotFound("Chi nhánh không tồn tại");
  assertBranchScope(currentUser, branch);
  return branch;
};

exports.createBranch = async (currentUser, data) => {
  assertCompanyAdmin(currentUser);

  // Xac dinh cong ty: COMPANY_ADMIN khoa theo cong ty minh; SUPER_ADMIN phai chi dinh.
  let companyId;
  if (currentUser.role === "COMPANY_ADMIN") {
    companyId = currentUser.company_id;
  } else {
    if (!data.company_id) throw new BadRequest("Vui lòng chỉ định công ty");
    if (!(await repo.companyExists(data.company_id))) throw new BadRequest("Công ty không tồn tại");
    companyId = data.company_id;
  }

  return repo.create({ ...data, company_id: companyId });
};

exports.updateBranch = async (currentUser, id, data) => {
  assertManager(currentUser);
  const branch = await repo.findById(id);
  if (!branch) throw new NotFound("Chi nhánh không tồn tại");
  assertBranchScope(currentUser, branch); // BRANCH_MANAGER chi sua chi nhanh minh
  return repo.update(id, data);
};

exports.changeStatus = async (currentUser, id, status) => {
  assertCompanyAdmin(currentUser);
  const branch = await repo.findById(id);
  if (!branch) throw new NotFound("Chi nhánh không tồn tại");
  assertBranchScope(currentUser, branch);
  return repo.update(id, { status });
};

// Xoa mem: chuyen trang thai INACTIVE (giu du lieu vi nhieu bang tham chieu).
exports.deleteBranch = async (currentUser, id) => {
  assertCompanyAdmin(currentUser);
  const branch = await repo.findById(id);
  if (!branch) throw new NotFound("Chi nhánh không tồn tại");
  assertBranchScope(currentUser, branch);
  return repo.update(id, { status: "INACTIVE" });
};
