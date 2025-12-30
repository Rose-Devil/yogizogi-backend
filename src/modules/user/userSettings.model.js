// UserSettings 모델

// User Settings ORM 모델 - 프로필 설정

const { pool } = require("../../config/db.js");

const getProfileSettings = async (userId) => {
  const [rows] = await pool.query(
    `
    SELECT id, email, nickname, bio
    FROM User
    WHERE id = ?
    `,
    [userId]
  );

  return rows[0] || null;
};

const findUserIdByEmail = async (email) => {
  const [rows] = await pool.query("SELECT id FROM User WHERE email = ? LIMIT 1", [email]);
  return rows[0]?.id ?? null;
};

/**
 * 프로필 설정 변경
 * @param {number} userId
 * @param {string} name        - 실명
 * @param {string} nickname    - 닉네임
 * @param {string} bio         - 소개글
 */
const updateProfileSettings = async (userId, nickname, bio) => {
  await pool.query(
    `
    UPDATE User
    SET nickname = ?, bio = ?
    WHERE id = ?
    `,
    [nickname, bio, userId]
  );

  // 변경된 값 반환
  const [rows] = await pool.query(
    `
    SELECT id, email, nickname, bio
    FROM User
    WHERE id = ?
    `,
    [userId]
  );

  return rows[0];
};

module.exports = {
  getProfileSettings,
  findUserIdByEmail,
  updateProfileSettings,
};
