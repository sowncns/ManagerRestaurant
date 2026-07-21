// src/modules/internal/voucher/voucher.service.js
const pool = require("../../../config/db");
const repo = require("./voucher.repository");
const { AppError, BadRequest, NotFound } = require("../../../shared/errors/AppError");

// SUPER_ADMIN: moi voucher. COMPANY_ADMIN: chi voucher cong ty minh.
function assertOwnVoucher(currentUser, voucher) {
  if (currentUser.role === "SUPER_ADMIN") return;
  if (currentUser.role === "COMPANY_ADMIN" && Number(voucher.company_id) === Number(currentUser.company_id)) return;
  throw new AppError("Bạn không có quyền với voucher này", 403);
}

exports.list = (currentUser, { company_id, status }) => {
  const companyId = currentUser.role === "SUPER_ADMIN" ? (company_id ?? null) : currentUser.company_id;
  return repo.list({ companyId, status });
};

exports.get = async (currentUser, id) => {
  const v = await repo.findById(id);
  if (!v) throw new NotFound("Không tìm thấy voucher");
  assertOwnVoucher(currentUser, v);
  const stats = await repo.stats(id);
  return { ...v, issued: stats.issued, used: stats.used };
};

exports.create = async (currentUser, data) => {
  const company_id = currentUser.role === "SUPER_ADMIN" ? data.company_id : currentUser.company_id;
  if (!company_id) throw new BadRequest("Thiếu company_id cho voucher");
  try {
    const id = await repo.create({ ...data, company_id });
    return repo.findById(id);
  } catch (e) {
    if (e.code === "23505") throw new BadRequest("Mã voucher đã tồn tại");
    throw e;
  }
};

exports.update = async (currentUser, id, data) => {
  const v = await repo.findById(id);
  if (!v) throw new NotFound("Không tìm thấy voucher");
  assertOwnVoucher(currentUser, v);
  try {
    await repo.update(id, data);
    return repo.findById(id);
  } catch (e) {
    if (e.code === "23505") throw new BadRequest("Mã voucher đã tồn tại");
    throw e;
  }
};

exports.deactivate = async (currentUser, id) => {
  const v = await repo.findById(id);
  if (!v) throw new NotFound("Không tìm thấy voucher");
  assertOwnVoucher(currentUser, v);
  return repo.deactivate(id);
};

exports.assign = async (currentUser, id, { customerIds, rank, birthMonth, all_customers, reason }) => {
  const v = await repo.findById(id);
  if (!v) throw new NotFound("Không tìm thấy voucher");
  assertOwnVoucher(currentUser, v);
  if (v.status !== "active") throw new BadRequest("Voucher không ở trạng thái active");
  if (new Date() > new Date(v.end_date)) throw new BadRequest("Voucher đã hết hạn");

  let targets = customerIds;
  if (!targets && rank) targets = await repo.getCustomerIdsByRank(rank);
  if (!targets && birthMonth) targets = await repo.getCustomerIdsByBirthMonth(birthMonth);
  if (!targets && all_customers) targets = await repo.getAllCustomerIds();
  if (!targets || !targets.length) return { issued: 0, skipped: 0 };

  const assignedBy = currentUser.employee_id || currentUser.id;
  const limit = v.per_customer_limit || 1;
  let issued = 0, skipped = 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const customerId of targets) {
      const held = await repo.countUnusedForCustomer(client, id, customerId);
      if (held >= limit) { skipped++; continue; }
      await repo.insertCustomerVoucher(client, { templateId: id, customerId, assignedBy, reason });
      issued++;
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return { issued, skipped };
};
