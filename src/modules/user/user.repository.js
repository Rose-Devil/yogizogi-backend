// src/modules/user/user.repository.js

const { TravelPost } = require("../post/models");
const { pool } = require("../../config/db");

const getUserInfo = async (userId) => {
  const [rows] = await pool.query(
    "SELECT id, email, nickname, bio FROM User WHERE id = ? LIMIT 1",
    [userId]
  );
  return rows[0] || null;
};

const getMyPosts = async (userId) => {
  // 실제 DB에서 사용자의 게시글 조회
  const posts = await TravelPost.findAll({
    where: {
      author_id: userId,
      is_deleted: false,
    },
    order: [["created_at", "DESC"]],
    attributes: [
      "id",
      "title",
      "region",
      "thumbnail_url",
      "view_count",
      "created_at",
    ],
  });

  return posts.map((post) => post.toJSON());
};

const getMyComments = async (userId) => {
  const Comment = require("../interaction/comment.model");
  const comments = await Comment.findAll({
    where: {
      author_id: userId,
    },
    order: [["created_at", "DESC"]],
    attributes: ["id", "post_id", "content", "created_at"],
  });

  return comments.map((comment) => comment.toJSON());
};

const deleteMyPost = async (userId, postId) => {
  // 실제 DB에서 게시글 삭제 (소프트 삭제)
  const post = await TravelPost.findOne({
    where: {
      id: postId,
      author_id: userId,
      is_deleted: false,
    },
  });

  if (!post) return false;

  await post.update({ is_deleted: true });
  return true;
};

const deleteMyComment = async (userId, commentId) => {
  const Comment = require("../interaction/comment.model");
  
  // 실제 DB에서 댓글 삭제
  const comment = await Comment.findOne({
    where: {
      id: commentId,
      author_id: userId,
    },
  });

  if (!comment) return false;

  await comment.destroy();
  return true;
};

module.exports = {
  getUserInfo,
  getMyPosts,
  getMyComments,
  deleteMyPost,
  deleteMyComment,
};
