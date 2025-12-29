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
    "SELECT id, email, nickname, profile_image_url AS url, bio, created_at FROM `User` WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function findMyTravelPosts(userId) {
  const [rows] = await pool.query(
    `SELECT 
      id,
      title,
      region,
      view_count,
      DATE_FORMAT(created_at, '%Y-%m-%d') AS created_at,
      thumbnail_url
    FROM TravelPost 
    WHERE author_id = ? AND is_deleted = FALSE 
    ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

async function getMyPostsStats(userId) {
  const [rows] = await pool.query(
    `SELECT 
      COUNT(*) AS post_count,
      COALESCE(SUM(view_count), 0) AS total_views
    FROM TravelPost 
    WHERE author_id = ? AND is_deleted = FALSE`,
    [userId]
  );
  return rows[0] || { post_count: 0, total_views: 0 };
}

// 내 프로필 조회
async function findByMyProfile(id) {
  const [rows] = await pool.query("");
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

module.exports = {
  findByEmail,
  findById,
  createUser,
  updateProfileImageUrl,
  findByMyProfile,
  findMyTravelPosts,
  getMyPostsStats,
};
