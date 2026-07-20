// src/modules/internal/combo/combo.service.js
// Nghiep vu combo mon: catalog gia co dinh gom nhieu mon. Pham vi theo company_id.
const repo = require("./combo.repository");
const { NotFound, BadRequest } = require("../../../shared/errors/AppError");

async function assertItemsInCompany(items, companyId) {
  const ids = [...new Set(items.map((i) => i.menu_item_id))];
  const n = await repo.countMenuItemsInCompany(ids, companyId);
  if (n !== ids.length) throw new BadRequest("Có món không tồn tại hoặc không thuộc công ty");
}

exports.list = (companyId, filters) => repo.findCombos(companyId, filters);

exports.get = async (id, companyId) => {
  const combo = await repo.findComboById(id, companyId);
  if (!combo) throw new NotFound("Không tìm thấy combo");
  combo.items = await repo.findComboItems(id);
  return combo;
};

exports.create = async (companyId, data) => {
  await assertItemsInCompany(data.items, companyId);
  const id = await repo.createWithItems(companyId, data, data.items);
  return exports.get(id, companyId);
};

exports.update = async (id, companyId, data) => {
  const combo = await repo.findComboById(id, companyId);
  if (!combo) throw new NotFound("Không tìm thấy combo");

  const { items, ...fields } = data;
  if (items) await assertItemsInCompany(items, companyId);

  const ok = await repo.updateWithItems(id, companyId, fields, items);
  if (!ok) throw new NotFound("Không tìm thấy combo");
  return exports.get(id, companyId);
};

exports.remove = async (id, companyId) => {
  const combo = await repo.deactivate(id, companyId);
  if (!combo) throw new NotFound("Không tìm thấy combo");
  return combo;
};
