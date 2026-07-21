// src/config/redis.js
const { createClient } = require("redis");
const env = require("./env");

const isSecure = env.REDIS_URL.startsWith("rediss://");

const redisClient = createClient({
  url: env.REDIS_URL,
  // Upstash dong connection idle -> ping dinh ky de giu song, tranh loi "not connected".
  pingInterval: 60000,
  socket: {
    family: 4,
    tls: isSecure,
    rejectUnauthorized: false,
    // Tu noi lai co backoff, cap 3s; khong bo cuoc sau vai lan.
    reconnectStrategy: (retries) => Math.min(retries * 200, 3000),
  }
});

redisClient.on("error", (err) => console.error("Redis error:", err));

async function connectRedis() {
  if (!redisClient.isOpen) await redisClient.connect();
  return redisClient;
}

module.exports = { redisClient, connectRedis };