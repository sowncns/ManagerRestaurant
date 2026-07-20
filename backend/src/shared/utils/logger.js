// src/shared/utils/logger.js
const pino = require("pino");
const env = require("../../config/env");

const logger = pino({
  level: env.isProduction ? "info" : "debug",
  transport: env.isProduction ? undefined : { target: "pino-pretty" },
});

module.exports = logger;