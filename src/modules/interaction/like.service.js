// 좋아요 서비스
const likeRepository = require("./like.repository");
const { error } = require("../../common/utils/response");

const likeRepository = require("./like.repository");

/**
 * 좋아요 추가
 */
exports.addLike = async (userId, postId) => {
  // 이미 좋아요 눌렀는지 확인
  const existing = await likeRepository.findUserLike(userId, postId);
  if (existing) {
    throw {
      statusCode: 409,
      message: "이미 좋아요한 게시글입니다.",
    };
  }

  // 좋아요 추가
  const like = await likeRepository.createLike(userId, postId);

  // 좋아요 개수 조회
  const likeCount = await likeRepository.countLikesByPost(postId);

  return {
    like,
    likeCount,
  };
};

/**
 * 좋아요 취소
 */
exports.removeLike = async (userId, postId) => {
  // 좋아요 눌렀는지 확인
  const existing = await likeRepository.findUserLike(userId, postId);
  if (!existing) {
    throw {
      statusCode: 404,
      message: "좋아요 정보가 없습니다.",
    };
  }

  // 좋아요 취소
  await likeRepository.deleteLike(userId, postId);

  // 좋아요 개수 조회
  const likeCount = await likeRepository.countLikesByPost(postId);

  return {
    likeCount,
  };
};

/**
 * 좋아요 개수 조회 (선택적으로 사용자 좋아요 여부도 반환)
 */
exports.getLikeCount = async (postId, userId = null) => {
  const likeCount = await likeRepository.countLikesByPost(postId);
  const result = { likeCount };

  // userId가 제공되면 해당 사용자가 좋아요 눌렀는지도 확인
  if (userId) {
    const userLike = await likeRepository.findUserLike(userId, postId);
    result.isLiked = !!userLike;
  }

  return result;
};
