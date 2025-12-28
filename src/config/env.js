// src/config/env.js
const dotenv = require("dotenv");
dotenv.config();

function required(key, defaultValue = undefined) {
  const value = process.env[key] ?? defaultValue;
  if (value == null || value === "") {
    throw new Error(`환경변수 ${key}가 설정되지 않았습니다.`);
  }
  return value;
}

// PORT 우선순위: HOST_PORT > PORT > 9090
const portFromEnv = process.env.HOST_PORT ?? process.env.PORT ?? 9090;
// HOST 주소: HOST > 기본값(0.0.0.0 - 모든 인터페이스에서 수신)
const hostFromEnv = process.env.HOST ?? "0.0.0.0";

const config = {
  host: {
    address: hostFromEnv,
    port: parseInt(portFromEnv, 10),
  },

  nodeEnv: process.env.NODE_ENV ?? "development",

  jwt: {
    secretKey: required("JWT_SECRET"),
    // 기본: 2일(초)
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
