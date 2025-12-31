// 좋아요 서비스
const likeRepository = require("./like.repository");
const { error } = require("../../common/utils/response");
const { TravelPost } = require("../post/models");



/**
 * 좋아요 추가
 */
exports.addLike = async (userId, postId) => {
  console.log(`[좋아요 추가] userId: ${userId}, postId: ${postId}`);
  
  // 이미 좋아요 눌렀는지 확인
  const existing = await likeRepository.findUserLike(userId, postId);
  if (existing) {
    console.log(`[좋아요 추가 실패] 이미 좋아요한 게시글입니다. userId: ${userId}, postId: ${postId}`);
    throw {
      statusCode: 409,
      message: "이미 좋아요한 게시글입니다.",
    };
  }

  // 좋아요 추가
  const like = await likeRepository.createLike(userId, postId);
  console.log(`[좋아요 추가 성공] DB에 저장됨. like.id: ${like.id}, userId: ${userId}, postId: ${postId}`);

  // TravelPost의 like_count 증가
  const post = await TravelPost.findByPk(postId);
  if (post) {
    await post.increment("like_count");
    await post.reload();
    console.log(`[좋아요 수 증가] postId: ${postId}, like_count: ${post.like_count}`);
  } else {
    console.warn(`[좋아요 수 증가 실패] 게시글을 찾을 수 없습니다. postId: ${postId}`);
  }

  // 좋아요 개수 조회
  const likeCount = await likeRepository.countLikesByPost(postId);
  console.log(`[좋아요 개수 조회] postId: ${postId}, 총 좋아요 수: ${likeCount}`);

  return {
    like,
    likeCount,
  };
};

/**
 * 좋아요 취소
 */
exports.removeLike = async (userId, postId) => {
  console.log(`[좋아요 취소] userId: ${userId}, postId: ${postId}`);
  
  // 좋아요 눌렀는지 확인
  const existing = await likeRepository.findUserLike(userId, postId);
  if (!existing) {
    console.log(`[좋아요 취소 실패] 좋아요 정보가 없습니다. userId: ${userId}, postId: ${postId}`);
    throw {
      statusCode: 404,
      message: "좋아요 정보가 없습니다.",
    };
  }

  // 좋아요 취소
  const deletedCount = await likeRepository.deleteLike(userId, postId);
  console.log(`[좋아요 취소 성공] DB에서 삭제됨. deletedCount: ${deletedCount}, userId: ${userId}, postId: ${postId}`);

  // TravelPost의 like_count 감소
  const post = await TravelPost.findByPk(postId);
  if (post && post.like_count > 0) {
    await post.decrement("like_count");
    await post.reload();
    console.log(`[좋아요 수 감소] postId: ${postId}, like_count: ${post.like_count}`);
  }

  // 좋아요 개수 조회
  const likeCount = await likeRepository.countLikesByPost(postId);
  console.log(`[좋아요 개수 조회] postId: ${postId}, 총 좋아요 수: ${likeCount}`);

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
