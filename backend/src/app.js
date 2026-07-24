// src/app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const pinoHttp = require("pino-http");

const env = require("./config/env");
const logger = require("./shared/utils/logger");
const routes = require("./routes");
const { generalLimiter } = require("./shared/middlewares/rateLimit.middleware");
const { notFoundHandler, errorHandler } = require("./shared/middlewares/error.middleware");

const app = express();

// Sau reverse proxy (nginx...) can tin cay X-Forwarded-For de req.ip / rate-limit dung IP client that.
app.set("trust proxy", 1);

const allowedOrigins = env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));
app.use(generalLimiter);

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;