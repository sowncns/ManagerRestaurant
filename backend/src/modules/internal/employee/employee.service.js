// src/modules/internal/employee/employee.service.js
// Tang nghiep vu quan ly nhan vien + kiem soat pham vi (scope) va thu bac vai tro.
//  - SUPER_ADMIN : toan quyen moi cong ty / chi nhanh.
//  - COMPANY_ADMIN: toan bo chuoi trong cong ty cua minh.
//  - BRANCH_MANAGER: chi trong chi nhanh cua minh.
const bcrypt = require("bcrypt");
const repo = require("./employee.repository");
const { NotFound, BadRequest, Conflict } = require("../../../shared/errors/AppError");
const {
  createInternalAuthUser,
  updateInternalAuthPassword,
} = require("../../../shared/utils/supabaseAuth");
const {
  assertManager,
  assertEmployeeScope,
  buildScopedBranchWhere,
  assertCanAssignRole,
  resolveEmployeeScope,
} = require("../../../shared/utils/permission");

// Vai tro gan lien mot chi nhanh cu the (bat buoc co branch_id).
const BRANCH_LEVEL_ROLES = ["BRANCH_MANAGER", "RECEPTIONIST", "WAITER", "CASHIER", "KITCHEN"];

// Kiem tra nguoi thao tac co du quyen quan ly nhan vien dich (pham vi + thu bac).
function assertCanManage(currentUser, employee) {
  assertEmployeeScope(currentUser, employee); // dung pham vi cong ty / chi nhanh
  assertCanAssignRole(currentUser, employee.role); // khong dong toi nguoi ngang/cao hon
}

// Chuan hoa & kiem tra company/branch cho role dich; tra ve { company_id, branch_id }.
async function resolveScope(currentUser, roleCode, input) {
  const scope = resolveEmployeeScope(currentUser, input);

  if (scope.branch_id != null) {
    const branch = await repo.findBranchById(scope.branch_id);
    if (!branch) throw new BadRequest("Chi nhánh không tồn tại");
    if (scope.company_id == null) scope.company_id = branch.company_id;
    if (branch.company_id !== scope.company_id) {
      throw new BadRequest("Chi nhánh không thuộc công ty đã chọn");
    }
  }

  if (BRANCH_LEVEL_ROLES.includes(roleCode) && scope.branch_id == null) {
    throw new BadRequest("Vai trò này cần chỉ định chi nhánh");
  }
  if (roleCode !== "SUPER_ADMIN" && scope.company_id == null) {
    throw new BadRequest("Vui lòng chỉ định công ty");
  }
  return scope;
}

// Nhan vien BEP phai gan 1 loai bep (nong/lanh/bar); role khac -> khong gan.
// Tra ve kitchen_type_id da chuan hoa (so hoac null).
async function resolveKitchenType(roleCode, input) {
  if (roleCode !== "KITCHEN") return null; // role khac: bo qua loai bep
  const id = input.kitchen_type_id;
  if (id == null) throw new BadRequest("Nhân viên bếp cần chọn loại bếp (nóng/lạnh/bar)");
  const kt = await repo.findKitchenTypeById(id);
  if (!kt) throw new BadRequest("Loại bếp không tồn tại");
  return kt.id;
}

exports.getEmployees = (currentUser) => {
  assertManager(currentUser);
  const values = [];
  const where = buildScopedBranchWhere(currentUser, values, "e");
  return repo.list(where, values);
};

exports.getEmployee = async (currentUser, id) => {
  assertManager(currentUser);
  const employee = await repo.findById(id);
  if (!employee) throw new NotFound("Nhân viên không tồn tại");
  assertEmployeeScope(currentUser, employee);
  return employee;
};

exports.createEmployee = async (currentUser, data) => {
  assertManager(currentUser);

  const role = await repo.findRoleById(data.role_id);
  if (!role) throw new BadRequest("Vai trò không tồn tại");
  assertCanAssignRole(currentUser, role.code);

  const scope = await resolveScope(currentUser, role.code, data);
  const kitchen_type_id = await resolveKitchenType(role.code, data);

  if (await repo.existsUsername(data.username)) {
    throw new Conflict("Tên đăng nhập đã tồn tại");
  }

  const password_hash = await bcrypt.hash(data.password, 10);
  const employee = await repo.create({
    full_name: data.full_name,
    username: data.username,
    phone: data.phone ?? null,
    password_hash,
    role_id: data.role_id,
    company_id: scope.company_id,
    branch_id: scope.branch_id,
    kitchen_type_id,
    status: data.status ?? null,
  });

  // Tao song song Supabase Auth user (best-effort, khong chan luong tao nhan vien).
  const supabaseUid = await createInternalAuthUser({
    username: data.username,
    password: data.password,
    metadata: { employee_id: employee.id, role: role.code },
  });
  if (supabaseUid) await repo.updateSupabaseUid(employee.id, supabaseUid);

  return employee;
};

exports.updateEmployee = async (currentUser, id, data) => {
  assertManager(currentUser);
  const employee = await repo.findById(id);
  if (!employee) throw new NotFound("Nhân viên không tồn tại");
  assertCanManage(currentUser, employee);

  const fields = {};
  if (data.full_name !== undefined) fields.full_name = data.full_name;
  if (data.phone !== undefined) fields.phone = data.phone;
  if (data.status !== undefined) fields.status = data.status;

  // Doi vai tro: phai du quyen cap vai tro moi.
  let roleCode = employee.role;
  if (data.role_id !== undefined && data.role_id !== employee.role_id) {
    const role = await repo.findRoleById(data.role_id);
    if (!role) throw new BadRequest("Vai trò không tồn tại");
    assertCanAssignRole(currentUser, role.code);
    fields.role_id = data.role_id;
    roleCode = role.code;
  }

  // Doi chi nhanh: chi SUPER_ADMIN / COMPANY_ADMIN moi duoc chuyen; kiem tra hop le.
  if (data.branch_id !== undefined) {
    const scope = await resolveScope(currentUser, roleCode, {
      company_id: employee.company_id,
      branch_id: data.branch_id,
    });
    fields.branch_id = scope.branch_id;
    fields.company_id = scope.company_id;
  } else if (fields.role_id !== undefined) {
    // Doi role nhung khong doi branch: dam bao role moi hop voi branch hien tai.
    await resolveScope(currentUser, roleCode, {
      company_id: employee.company_id,
      branch_id: employee.branch_id,
    });
  }

  // Loai bep: BEP phai co loai; role khac -> xoa loai bep (null).
  if (roleCode === "KITCHEN") {
    if (data.kitchen_type_id != null) {
      fields.kitchen_type_id = await resolveKitchenType("KITCHEN", data);
    } else if (employee.kitchen_type_id == null) {
      // Vua chuyen sang BEP nhung chua chon loai.
      throw new BadRequest("Nhân viên bếp cần chọn loại bếp (nóng/lạnh/bar)");
    }
  } else if (employee.kitchen_type_id != null || data.kitchen_type_id !== undefined) {
    fields.kitchen_type_id = null;
  }

  return repo.update(id, fields);
};

exports.resetPassword = async (currentUser, id, newPassword) => {
  assertManager(currentUser);
  const employee = await repo.findById(id);
  if (!employee) throw new NotFound("Nhân viên không tồn tại");
  assertCanManage(currentUser, employee);
  await repo.updatePassword(id, await bcrypt.hash(newPassword, 10));
  // Dong bo mat khau sang Supabase Auth (best-effort).
  await updateInternalAuthPassword(employee.supabase_uid, newPassword);
};

exports.changeStatus = async (currentUser, id, status) => {
  assertManager(currentUser);
  const employee = await repo.findById(id);
  if (!employee) throw new NotFound("Nhân viên không tồn tại");
  assertCanManage(currentUser, employee);
  return repo.update(id, { status });
};

exports.getRoles = (currentUser) => {
  assertManager(currentUser);
  return repo.listRoles();
};

exports.getKitchenTypes = (currentUser) => {
  assertManager(currentUser);
  return repo.listKitchenTypes();
};
