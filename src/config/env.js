// 환경변수 설정
// 환경변수 설정 (X_Server config.mjs 패턴을 CommonJS로 옮김)
const dotenv = require("dotenv");
dotenv.config();

// required: 환경변수가 없으면 서버 시작 단계에서 바로 에러 내기
function required(key, defaultValue = undefined) {
  const value = process.env[key] ?? defaultValue;
  if (value == null) {
    throw new Error(`환경변수 ${key}가 설정되지 않았습니다.`);
  }
  return value;
}

const config = {
  host: {
    port: parseInt(required("HOST_PORT", 9090), 10),
  },
  jwt: {
    secretKey: required("JWT_SECRET"),
    // X_Server는 expiresInSec(초)로 관리했음
    expiresInSec: parseInt(required("JWT_EXPIRES_SEC", 60 * 60 * 24 * 2), 10),
  },
  bcrypt: {
    saltRounds: parseInt(required("BCRYPT_SALT_ROUNDS", 12), 10),
  },
  db: {
    host: required("DB_HOST"),
    port: parseInt(required("DB_PORT", 3306), 10),
    user: required("DB_USER"),
    password: required("DB_PASSWORD", ""),
    name: required("DB_NAME"),
  },
};

module.exports = { config };

