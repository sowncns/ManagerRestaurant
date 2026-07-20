// src/shared/middlewares/error.middleware.js
const { AppError } = require("../errors/AppError");
const logger = require("../utils/logger");

function notFoundHandler(req, res) {
  res.status(404).json({ message: `Không tìm thấy route ${req.method} ${req.originalUrl}` });
}


// Ban do ma loi Postgres -> thong bao than thien
const PG_ERRORS = {
  "23505": { status: 409, message: "Dữ liệu đã tồn tại (trùng khóa duy nhất)" },
  "23503": { status: 409, message: "Vi phạm ràng buộc khóa ngoại" },
  "23502": { status: 400, message: "Thiếu trường bắt buộc" },
  "22P02": { status: 400, message: "Dữ liệu sai định dạng" },
};

function errorHandler(err, req, res, next) {
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  const pg = err && err.code ? PG_ERRORS[err.code] : null;
  if (pg) {
    return res.status(pg.status).json({ message: pg.message });
  }
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ message: "Lỗi hệ thống" });
}

module.exports = { notFoundHandler, errorHandler };