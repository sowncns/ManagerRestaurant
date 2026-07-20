// src/server.js
const app = require("./app");
const env = require("./config/env");
const pool = require("./config/db");
const { connectRedis, redisClient } = require("./config/redis");
const { confirmWebhookUrl } = require("./modules/customer/payment/payment.service");
const realtimeService = require("./shared/services/realtime.service");
const logger = require("./shared/utils/logger");

let server;

async function start() {
  try {
    await pool.query("SELECT 1");
    logger.info("PostgreSQL connected");

    await connectRedis();
    logger.info("Redis connected");

    await confirmWebhookUrl(); // xac nhan webhook PayOS (an toan neu chua cau hinh)

    realtimeService.start(); // subscribe Supabase Realtime (an toan neu chua cau hinh)

    server = app.listen(env.PORT, () =>
      logger.info(`Server chạy tại http://localhost:${env.PORT}`)
    );
  } catch (err) {
    logger.error({ err }, "Khởi động server thất bại");
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info(`${signal} nhận được, đang tắt...`);
  if (server) await new Promise((r) => server.close(r));
  await pool.end();
  if (redisClient.isOpen) await redisClient.quit();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();