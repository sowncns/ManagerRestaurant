// src/modules/internal/employee/employee.controller.js
const { asyncHandler } = require("../../../shared/utils/asyncHandler");
const service = require("./employee.service");
const audit = require("../../../shared/services/audit.service");

exports.listEmployees = asyncHandler(async (req, res) => {
  const employees = await service.getEmployees(req.user);
  res.json({ message: "Lấy danh sách nhân viên thành công", employees });
});

exports.getEmployee = asyncHandler(async (req, res) => {
  const employee = await service.getEmployee(req.user, req.params.id);
  res.json({ message: "Lấy thông tin nhân viên thành công", employee });
});

exports.createEmployee = asyncHandler(async (req, res) => {
  const employee = await service.createEmployee(req.user, req.body);
  audit.record(audit.ctx(req), {
    action: "CREATE", entityType: "EMPLOYEE", entityId: employee.id,
    description: `Tạo nhân viên "${employee.full_name || employee.username}"`,
  });
  res.status(201).json({ message: "Tạo nhân viên thành công", employee });
});

exports.updateEmployee = asyncHandler(async (req, res) => {
  const employee = await service.updateEmployee(req.user, req.params.id, req.body);
  audit.record(audit.ctx(req), {
    action: "UPDATE", entityType: "EMPLOYEE", entityId: Number(req.params.id),
    description: `Cập nhật nhân viên #${req.params.id}`,
  });
  res.json({ message: "Cập nhật nhân viên thành công", employee });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  await service.resetPassword(req.user, req.params.id, req.body.password);
  audit.record(audit.ctx(req), {
    action: "RESET_PASSWORD", entityType: "EMPLOYEE", entityId: Number(req.params.id),
    description: `Đặt lại mật khẩu nhân viên #${req.params.id}`,
  });
  res.json({ message: "Đặt lại mật khẩu thành công" });
});

exports.changeStatus = asyncHandler(async (req, res) => {
  const employee = await service.changeStatus(req.user, req.params.id, req.body.status);
  audit.record(audit.ctx(req), {
    action: "CHANGE_STATUS", entityType: "EMPLOYEE", entityId: Number(req.params.id),
    description: `Đổi trạng thái nhân viên #${req.params.id} → ${req.body.status}`,
  });
  res.json({ message: "Cập nhật trạng thái thành công", employee });
});

exports.listRoles = asyncHandler(async (req, res) => {
  const roles = await service.getRoles(req.user);
  res.json({ message: "Lấy danh sách vai trò thành công", roles });
});

exports.listKitchenTypes = asyncHandler(async (req, res) => {
  const kitchen_types = await service.getKitchenTypes(req.user);
  res.json({ message: "Lấy danh sách loại bếp thành công", kitchen_types });
});
