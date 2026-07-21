// src/modules/public/public.service.js
// Tang nghiep vu cho API cong khai: kiem tra ton tai va gom nhom menu theo danh muc.
const repo = require("./public.repository");
const { NotFound } = require("../../shared/errors/AppError");

exports.getCompanies = () => repo.listCompanies();

exports.getCompanyDetail = async (companyId) => {
  const company = await repo.findCompanyById(companyId);
  if (!company) throw new NotFound("Công ty không tồn tại");
  company.branches = await repo.listBranchesByCompany(companyId);
  return company;
};

exports.getBranchesByCompany = async (companyId) => {
  const company = await repo.findCompanyById(companyId);
  if (!company) throw new NotFound("Công ty không tồn tại");
  return repo.listBranchesByCompany(companyId);
};

exports.getBranchDetail = async (branchId) => {
  const branch = await repo.findBranchById(branchId);
  if (!branch) throw new NotFound("Chi nhánh không tồn tại");
  return branch;
};

exports.getCategoriesByCompany = async (companyId) => {
  const company = await repo.findCompanyById(companyId);
  if (!company) throw new NotFound("Công ty không tồn tại");
  return repo.listCategoriesByCompany(companyId);
};

// Menu tra ve dang gom nhom theo danh muc de client hien thi de dang.
exports.getMenuByCompany = async (companyId) => {
  const company = await repo.findCompanyById(companyId);
  if (!company) throw new NotFound("Công ty không tồn tại");

  const items = await repo.listMenuItemsByCompany(companyId);
  const byCategory = new Map();
  for (const item of items) {
    if (!byCategory.has(item.category_id)) {
      byCategory.set(item.category_id, {
        category_id: item.category_id,
        category_name: item.category_name,
        items: [],
      });
    }
    const { category_id, category_name, ...rest } = item;
    byCategory.get(category_id).items.push(rest);
  }
  return Array.from(byCategory.values());
};

exports.getMenuItemDetail = async (menuItemId) => {
  const item = await repo.findMenuItemById(menuItemId);
  if (!item) throw new NotFound("Món ăn không tồn tại");
  return item;
};

// Anh trang chu (slide type=1, "Hom nay an gi" type=2). Cong khai, khong can dang nhap.
exports.getHomeBanners = () => repo.listHomeBanners();
