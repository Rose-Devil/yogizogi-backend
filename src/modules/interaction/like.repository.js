// 좋아요 리포지토리

const PostLike = require("../post/postLike.model");

/**
 * 좋아요 추가
 */
exports.createLike = async (userId, postId) => {
  return await PostLike.create({
    user_id: userId,
    post_id: postId,
  });
};

/**
 * 좋아요 취소
 */
exports.deleteLike = async (userId, postId) => {
  return await PostLike.destroy({
    where: {
      user_id: userId,
      post_id: postId,
    },
  });
};

/**
 * 사용자가 이미 좋아요 눌렀는지 확인
 */
exports.findUserLike = async (userId, postId) => {
  return await PostLike.findOne({
    where: {
      user_id: userId,
      post_id: postId,
    },
  });
};

/**
 * 게시글의 좋아요 개수 조회
 */
exports.countLikesByPost = async (postId) => {
  return await PostLike.count({
    where: {
      post_id: postId,
    },
  });
};
