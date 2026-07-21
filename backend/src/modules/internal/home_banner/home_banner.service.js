// src/modules/internal/home_banner/home_banner.service.js
// SUPER_ADMIN quan ly anh trang chu (slide / "Hom nay an gi"). Chi luu anh + loai.
const repo = require("./home_banner.repository");
const { NotFound } = require("../../../shared/errors/AppError");

exports.list = () => repo.list();

exports.create = (data) => repo.create(data);

exports.remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) throw new NotFound("Không tìm thấy ảnh");
};
