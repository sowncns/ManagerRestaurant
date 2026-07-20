// src/modules/internal/menu/menu.service.js
// Nghiep vu thuc don: danh muc + mon an. Pham vi theo company_id.
const repo = require("./menu.repository");
const { NotFound, BadRequest, Conflict } = require("../../../shared/errors/AppError");

// ---------------- Categories ----------------
exports.listCategories = (companyId, filters) => repo.findCategories(companyId, filters);

exports.getCategory = async (id, companyId) => {
  const category = await repo.findCategoryById(id, companyId);
  if (!category) throw new NotFound("Không tìm thấy danh mục");
  return category;
};

exports.createCategory = async (companyId, data) => {
  try {
    return await repo.createCategory(companyId, data);
  } catch (e) {
    if (e.code === "23505") throw new Conflict("Tên danh mục đã tồn tại");
    throw e;
  }
};

exports.updateCategory = async (id, companyId, data) => {
  await exports.getCategory(id, companyId);
  try {
    const category = await repo.updateCategory(id, companyId, data);
    if (!category) throw new NotFound("Không tìm thấy danh mục");
    return category;
  } catch (e) {
    if (e.code === "23505") throw new Conflict("Tên danh mục đã tồn tại");
    throw e;
  }
};

exports.removeCategory = async (id, companyId) => {
  await exports.getCategory(id, companyId);
  const n = await repo.countActiveItemsInCategory(id, companyId);
  if (n > 0) throw new BadRequest(`Không thể xóa: danh mục còn ${n} món đang hoạt động`);
  const category = await repo.deactivateCategory(id, companyId);
  if (!category) throw new NotFound("Không tìm thấy danh mục");
  return category;
};

// ---------------- Items ----------------
async function assertCategoryInCompany(categoryId, companyId) {
  const ok = await repo.categoryExistsInCompany(categoryId, companyId);
  if (!ok) throw new BadRequest("Danh mục không tồn tại hoặc không thuộc công ty");
}

async function assertKitchenTypeExists(kitchenTypeId) {
  const ok = await repo.kitchenTypeExists(kitchenTypeId);
  if (!ok) throw new BadRequest("Loại bếp (kitchen_type_id) không tồn tại");
}

exports.listItems = (companyId, filters) => repo.findItems(companyId, filters);

exports.getItem = async (id, companyId) => {
  const item = await repo.findItemById(id, companyId);
  if (!item) throw new NotFound("Không tìm thấy món ăn");
  return item;
};

exports.createItem = async (companyId, data) => {
  await assertCategoryInCompany(data.category_id, companyId);
  await assertKitchenTypeExists(data.kitchen_type_id);
  try {
    return await repo.createItem(companyId, data);
  } catch (e) {
    if (e.code === "23505") throw new Conflict("Món ăn đã tồn tại");
    throw e;
  }
};

exports.updateItem = async (id, companyId, data) => {
  await exports.getItem(id, companyId);
  if (data.category_id) await assertCategoryInCompany(data.category_id, companyId);
  if (data.kitchen_type_id) await assertKitchenTypeExists(data.kitchen_type_id);
  try {
    const item = await repo.updateItem(id, companyId, data);
    if (!item) throw new NotFound("Không tìm thấy món ăn");
    return item;
  } catch (e) {
    if (e.code === "23505") throw new Conflict("Món ăn đã tồn tại");
    throw e;
  }
};

exports.setAvailability = async (id, companyId, isAvailable) => {
  await exports.getItem(id, companyId);
  const item = await repo.updateItem(id, companyId, { is_available: isAvailable });
  if (!item) throw new NotFound("Không tìm thấy món ăn");
  return item;
};

exports.removeItem = async (id, companyId) => {
  await exports.getItem(id, companyId);
  const item = await repo.deactivateItem(id, companyId);
  if (!item) throw new NotFound("Không tìm thấy món ăn");
  return item;
};
