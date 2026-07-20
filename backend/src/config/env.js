// src/config/env.js
const { cleanEnv, str, num, port, bool } = require("envalid");

require("dotenv").config();

const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ["development", "production", "test"], default: "development" }),
  PORT: port({ default: 5000 }),

  DATABASE_URL: str(),                 // postgres connection string
  REDIS_URL: str({ default: "redis://localhost:6379" }),

  JWT_ACCESS_SECRET: str(),
  JWT_REFRESH_SECRET: str(),
  JWT_ACCESS_EXPIRES: str({ default: "1d" }),
  JWT_REFRESH_EXPIRES: str({ default: "7d" }),

  // Ep bat rate limit ngay ca o development (de test truoc khi len prod).
  // Production luon bat bat ke bien nay.
  RATE_LIMIT_ENABLED: bool({ default: false }),

  CORS_ORIGINS: str({ default: "http://localhost:5173" }),
  FRONTEND_URL: str({ default: "http://localhost:5173" }),

  PAYOS_CLIENT_ID: str({ default: "" }),
  PAYOS_API_KEY: str({ default: "" }),
  PAYOS_CHECKSUM_KEY: str({ default: "" }),

  MAIL_USER: str({ default: "" }),
  MAIL_PASS: str({ default: "" }),

  // Supabase (Realtime + Auth hybrid). SERVICE_ROLE_KEY chi dung o backend, khong ra frontend.
  SUPABASE_URL: str({ default: "" }),
  SUPABASE_ANON_KEY: str({ default: "" }),
  SUPABASE_SERVICE_ROLE_KEY: str({ default: "" }),

  // Domain email ao cho tai khoan noi bo (nhan vien khong co email that).
  INTERNAL_AUTH_EMAIL_DOMAIN: str({ default: "restaurant-internal.local" }),

  // So phut truoc gio hen bat dau canh bao le tan chuan bi / doi ban
  RESERVATION_ALERT_MINUTES: num({ default: 30 }),

  // Ti le dat coc khi khach dat mon truoc (0 -> 1). Vd 0.3 = coc 30% gia tri mon.
  // De 0 => tat tinh nang dat coc.
  RESERVATION_DEPOSIT_RATE: num({ default: 0.3 }),
});

module.exports = env;