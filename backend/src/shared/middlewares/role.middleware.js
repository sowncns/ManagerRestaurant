
const { Unauthorized, Forbidden } = require("../errors/AppError");

function authorize(...allowedRoles) {
  const flatRoles = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user) return next(new Unauthorized());
    if (flatRoles.length > 0 && !flatRoles.includes(req.user.role)) {
      return next(new Forbidden("Bạn không có quyền truy cập"));
    }
    next();
  };
}

module.exports = { authorize };
