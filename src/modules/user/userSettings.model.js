// UserSettings 모델

// User Settings ORM 모델 - 프로필 설정

const { pool } = require("../../config/db.js");

const getProfileSettings = async (userId) => {
  const [rows] = await pool.query(
    `
    SELECT id, email, nickname, bio, profile_image_url, created_at
    FROM User
    WHERE id = ?
    `,
    [userId]
  );

  if (rows.length === 0) return null;

  const user = rows[0];
  
  // 프로필 이미지 URL 처리 (상대 경로를 S3 URL로 변환)
  let profileImageUrl = user.profile_image_url;
  if (profileImageUrl && profileImageUrl.startsWith("/uploads/")) {
    const bucketName = process.env.AWS_BUCKET_NAME;
    const region = process.env.AWS_REGION || "ap-northeast-2";
    const s3Key = profileImageUrl.replace(/^\/uploads\//, "");
    profileImageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
  }

  return {
    ...user,
    image: profileImageUrl,
    profile_image_url: profileImageUrl,
  };
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
