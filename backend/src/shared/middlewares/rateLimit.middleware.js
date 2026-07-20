// src/shared/middlewares/rateLimit.middleware.js
const rateLimit = require("express-rate-limit");
const env = require("../../config/env");

// Rate limit bat khi: chay production HOAC bat co RATE_LIMIT_ENABLED (de test o dev).
const skip = () => !(env.isProduction || env.RATE_LIMIT_ENABLED);

const generalLimiter = rateLimit({ windowMs: 60_000, max: 120, skip });
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, skip });

module.exports = { generalLimiter, authLimiter };
