const express = require("express");
const { authGuard } = require("../../common/middleware/authGuard");
const {
  getMyPage,
  deleteMyPost,
  deleteMyComment,
  updateProfileSettings,
  getUserProfile,
} = require("./user.controller");

const router = express.Router();

// 인증 필요한 라우트 (먼저 정의)
router.get("/me", authGuard, getMyPage);

// 삭제
router.delete("/me/posts/:postId", authGuard, deleteMyPost);
router.delete("/me/comments/:commentId", authGuard, deleteMyComment);
router.patch("/me/profile", authGuard, updateProfileSettings);

// 공개 프로필 조회 (인증 불필요, /me보다 뒤에 정의)
router.get("/:userId", getUserProfile);

module.exports = router;
