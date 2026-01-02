// 좋아요 컨트롤러
const likeService = require("./like.service");
const { success, error } = require("../../common/utils/response");



/**
 * 좋아요 토글
 */
exports.toggleLike = async (req, res, next) => {
  try {
    const postId = req.params.id;
    
    // 인증된 사용자 ID 확인
    if (!req.user || !req.user.id) {
      return error(res, "인증이 필요합니다.", 401);
    }
    
    const userId = req.user.id;

    try {
      // 좋아요 추가 시도
      const result = await likeService.addLike(userId, postId);
      return success(res, { isLiked: true, ...result }, "좋아요 추가 완료", 201);
    } catch (error) {
      // 409 Conflict: 이미 좋아요가 되어 있는 경우 -> 취소
      if (error.statusCode === 409) {
        const result = await likeService.removeLike(userId, postId);
        return success(res, { isLiked: false, ...result }, "좋아요 취소 완료");
      }
      throw error;
    }
  } catch (err) {
    next(err);
  }
};

/**
 * 좋아요 상태 및 개수 조회
 */
exports.getLikeState = async (req, res, next) => {
  try {
    const postId = req.params.id;
    
    // 인증된 사용자 ID 확인 (선택적 - 비로그인 사용자도 조회 가능하게 하려면 주석 처리)
    const userId = req.user?.id || null;

    const result = await likeService.getLikeCount(postId, userId);
    return success(res, result, "좋아요 상태 조회 성공");
  } catch (err) {
    next(err);
  }
};

