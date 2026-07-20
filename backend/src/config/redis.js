// src/config/redis.js
const { createClient } = require("redis");
const env = require("./env");

const isSecure = env.REDIS_URL.startsWith("rediss://");

const redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    family: 4,
    tls: isSecure,
    rejectUnauthorized: false,
  }
});

redisClient.on("error", (err) => console.error("Redis error:", err));

async function connectRedis() {
  if (!redisClient.isOpen) await redisClient.connect();
  return redisClient;
}

module.exports = { redisClient, connectRedis };