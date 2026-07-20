// src/shared/errors/AppError.js
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; 
    Error.captureStackTrace(this, this.constructor);
  }
}


class BadRequest   extends AppError { constructor(m = "Dữ liệu không hợp lệ") { super(m, 400); } }
class Unauthorized extends AppError { constructor(m = "Chưa xác thực")        { super(m, 401); } }
class Forbidden    extends AppError { constructor(m = "Không có quyền")       { super(m, 403); } }
class NotFound     extends AppError { constructor(m = "Không tìm thấy")       { super(m, 404); } }
class Conflict     extends AppError { constructor(m = "Xung đột dữ liệu")     { super(m, 409); } }

module.exports = { AppError, BadRequest, Unauthorized, Forbidden, NotFound, Conflict };