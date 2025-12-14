// User 조회/저장
// X_Server data/auth.mjs 역할(= DB 접근)
// 여기서는 MySQL로 바꿔서 구현
const { pool } = require("../../config/db");

// 회원 중복 체크 (userid로 찾기)
async function findByUserid(userid) {
  const [rows] = await pool.query(
    "SELECT id, userid, password_hash AS passwordHash, name, email, url FROM users WHERE userid = ? LIMIT 1",
    [userid]
  );
  return rows[0] || null;
}

// ID로 찾기 (로그인 유지용)
async function findById(id) {
  const [rows] = await pool.query(
    "SELECT id, userid, name, email, url FROM users WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

// 회원가입
async function createUser({ userid, passwordHash, name, email, url }) {
  const [result] = await pool.query(
    "INSERT INTO users (userid, password_hash, name, email, url) VALUES (?, ?, ?, ?, ?)",
    [userid, passwordHash, name, email, url ?? null]
  );

  // X_Server는 생성 후 user.id를 반환했음(여기선 insertId)
  return result.insertId;
}

module.exports = { findByUserid, findById, createUser };
