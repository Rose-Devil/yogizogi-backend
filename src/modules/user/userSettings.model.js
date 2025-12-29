// UserSettings 모델

// User Settings ORM 모델 - 프로필 설정

const { pool } = require("../../config/db.js");

/**
 * 프로필 설정 변경
 * @param {number} userId
 * @param {string} name        - 실명
 * @param {string} nickname    - 닉네임
 * @param {string} bio         - 소개글
 */
const updateProfileSettings = async (userId, email, nickname, bio) => {
  await pool.query(
    `
    UPDATE User
    SET email = ?, nickname = ?, bio = ?
    WHERE id = ?
    `,
    [email, nickname, bio, userId]
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
  updateProfileSettings,
};
