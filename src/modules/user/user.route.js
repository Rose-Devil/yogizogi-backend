const express = require("express");
const { authGuard } = require("../../common/middleware/authGuard");
const {
  getMyPage,
  deleteMyPost,
  deleteMyComment,
  updateNickname,
  updateProfile,
} = require("./user.controller");

const router = express.Router();

router.use(authGuard);

// 조회
router.get("/me", getMyPage);

// 수정
router.patch("/me", updateProfile);        // ✅ 편집완료용
router.patch("/me/nickname", updateNickname); // (유지해도 됨)

// 삭제
router.delete("/me/posts/:postId", deleteMyPost);
router.delete("/me/comments/:commentId", deleteMyComment);

module.exports = router;
