// User 엔티티 (ORM 모델)

const { pool } = require("../../config/db.js");

const findProfile = async (userid) => {
  const [rows] = await pool.query(
    "SELECT id, username, email FROM users WHERE id = ?",
    [userid]
  );
  return rows[0];
};

const findMyPosts = async (userid) => {
  const [rows] = await pool.query(
    "SELECT id, title, created_at FROM posts WHERE user_id = ?",
    [userid]
  );
  return rows;
};

const findMyComments = async (userid) => {
  const [rows] = await pool.query(
    "SELECT id, content, created_at FROM comments WHERE user_id = ?",
    [userid]
  );
  return rows;
};

module.exports = {
  findProfile,
  findMyPosts,
  findMyComments,
};
