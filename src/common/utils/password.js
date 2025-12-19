// bcrypt 해시/검증
// 비밀번호 해시/검증 유틸 (X_Server의 bcrypt 사용 흐름 기반)
const bcrypt = require("bcryptjs");
const { config } = require("../../config/env");

// 비밀번호 해싱
function hashPassword(plainPassword) {
  return bcrypt.hashSync(plainPassword, config.bcrypt.saltRounds);
}

// 비밀번호 비교
function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compareSync(plainPassword, passwordHash);
}

module.exports = { hashPassword, verifyPassword };
