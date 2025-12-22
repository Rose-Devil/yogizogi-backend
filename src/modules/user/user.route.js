const express = require("express");
const { authGuard } = require("../../common/middleware/authGuard");
const {
  getMyPage,
  deleteMyPost,
  deleteMyComment,
  updateNickname,
} = require("./user.controller");

const router = express.Router();

router.use(authGuard);

// 조회
router.get("/me", authGuard, getMyPage);

// 삭제
router.delete("/me/posts/:postId", deleteMyPost);
router.delete("/me/comments/:commentId", deleteMyComment);

// 수정 ✅
router.patch("/me/nickname", updateNickname);

// 삭제
router.delete("/me/posts/:postId", deleteMyPost);
router.delete("/me/comments/:commentId", deleteMyComment);
module.exports = router;
