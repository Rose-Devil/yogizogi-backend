// User 조회/저장 (DB 접근 레이어)
const { pool } = require("../../config/db");

// email로 찾기 (중복 체크 + 로그인)
async function findByEmail(email) {
  const [rows] = await pool.query(
    "SELECT id, email, password_hash AS passwordHash, nickname, profile_image_url AS url FROM `User` WHERE email = ? LIMIT 1",
    [email]
  );
  return rows[0] || null;
}

// ID로 찾기 (로그인 유지용)
async function findById(id) {
  const [rows] = await pool.query(
    "SELECT id, email, nickname, profile_image_url AS url FROM `User` WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

// 회원가입
async function createUser({ email, passwordHash, nickname, url }) {
  const [result] = await pool.query(
    "INSERT INTO `User` (email, password_hash, nickname, profile_image_url) VALUES (?, ?, ?, ?)",
    [email, passwordHash, nickname, url ?? null]
  );
  return result.insertId;
}

async function updateProfileImageUrl(id, url) {
  await pool.query("UPDATE `User` SET profile_image_url = ? WHERE id = ?", [
    url ?? null,
    id,
  ]);
}

module.exports = { findByEmail, findById, createUser, updateProfileImageUrl };
