// User 엔티티 (ORM 모델)

const { pool } = require("../../config/db.js");

const findProfile = async (userid) => {
  // auth.repository.js uses `User` and selects nickname/profile_image_url. 
  // usersSettings.model.js uses `users`. 
  // Assuming `id` is PK. 
  // We'll select nickname and profile_image to match CommentService expectation.
  const [rows] = await pool.query(
    "SELECT id, nickname, profile_image_url as profile_image FROM `User` WHERE id = ?",
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
