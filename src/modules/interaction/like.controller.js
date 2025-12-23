// 좋아요 컨트롤러

const likeService = require("./like.service");
const { success } = require("../../common/utils/response");

/**
 * 좋아요 추가
 */
exports.addLike = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.body.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId가 필요합니다.",
      });
    }

    const result = await likeService.addLike(userId, postId);
    return success(res, result, "좋아요 추가 완료", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * 좋아요 취소
 */
exports.removeLike = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.body.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId가 필요합니다.",
      });
    }

    const result = await likeService.removeLike(userId, postId);
    return success(res, result, "좋아요 취소 완료");
  } catch (err) {
    next(err);
  }
};

/**
 * 좋아요 개수 조회 (선택적으로 사용자 좋아요 여부도 반환)
 */
exports.getLikeCount = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.query.userId ? parseInt(req.query.userId) : null; // 쿼리 파라미터로 userId 받기
    const result = await likeService.getLikeCount(postId, userId);
    return success(res, result, "좋아요 개수 조회 성공");
  } catch (err) {
    next(err);
  }
};
