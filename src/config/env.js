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

      return ["http://localhost:3000"];
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
};

module.exports = { config };
