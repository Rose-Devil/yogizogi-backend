// src/config/env.js
const dotenv = require("dotenv");
dotenv.config();

function required(key, defaultValue = undefined) {
  const value = process.env[key] ?? defaultValue;
  if (value == null || value === "") {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

function parseCsv(value) {
  if (value == null) return [];
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

// PORT 우선순위: HOST_PORT > PORT > 9090
const portFromEnv = process.env.HOST_PORT ?? process.env.PORT ?? 9090;

const config = {
  host: {
    port: parseInt(portFromEnv, 10),
  },

  nodeEnv: process.env.NODE_ENV ?? "development",

  cors: {
    origins: (() => {
      const fromList = parseCsv(process.env.CORS_ORIGINS);
      if (fromList.length > 0) return fromList;

      const single = (process.env.CORS_ORIGIN ?? "").trim();
      if (single) return [single];

      return ["http://localhost:5173", "http://localhost:3000"];
    })(),
  },

  jwt: {
    secretKey: required("JWT_SECRET"),
    expiresInSec: parseInt(process.env.JWT_EXPIRES_SEC ?? 60 * 60 * 24 * 2, 10),
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? 12, 10),
  },

  db: {
    host: required("DB_HOST"),
    port: parseInt(process.env.DB_PORT ?? 3306, 10),
    user: required("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    name: required("DB_NAME"),
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },

  ai: {
    minPostLength: parseInt(process.env.MIN_POST_LENGTH ?? 100, 10),
    maxDailyComments: parseInt(process.env.MAX_DAILY_AI_COMMENTS ?? 50, 10),
    commentDelayMs: parseInt(process.env.AI_COMMENT_DELAY_MS ?? 10000, 10),
  },

  
  otp: {
    secret: process.env.OTP_SECRET,                 // 없으면 서비스에서 500 처리
    expiresMin: parseInt(process.env.OTP_EXPIRES_MIN ?? 10, 10),
    maxTries: parseInt(process.env.OTP_MAX_TRIES ?? 5, 10),
  },

  invites: {
    secret: process.env.INVITE_SECRET,
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? 465, 10),
    secure: process.env.SMTP_SECURE ?? "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM,
  },
};

module.exports = { config };
