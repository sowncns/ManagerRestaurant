
const { BadRequest } = require("../errors/AppError");

const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const msg = result.error.issues.map((i) => i.message).join(", ");
    return next(new BadRequest(msg));
  }
  req[source] = result.data; 
  next();
};

module.exports = { validate };