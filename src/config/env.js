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

const portFromEnv = process.env.HOST_PORT ?? process.env.PORT ?? 9090;

const config = {
  host: {
    port: parseInt(portFromEnv, 10),
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
