// JWT 유틸리티
// JWT 생성/검증 유틸 (X_Server controller/auth.mjs 흐름 기반)
const jwt = require("jsonwebtoken");
const { config } = require("../../config/env");

const AUTH_ERROR = { message: "인증 에러" };

// X_Server처럼 { id } payload로 토큰 만들기
function createJwtToken(id) {
  return jwt.sign({ id }, config.jwt.secretKey, {
    expiresIn: config.jwt.expiresInSec, // 초 단위
  });
}

// 토큰 검증 (에러나면 null 반환하게 해서 middleware에서 처리하기 쉽도록)
function verifyJwtToken(token) {
  try {
    return jwt.verify(token, config.jwt.secretKey);
  } catch (e) {
    return null;
  }
}

module.exports = { AUTH_ERROR, createJwtToken, verifyJwtToken };
