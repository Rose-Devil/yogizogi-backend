const express = require("express");
const { authGuard } = require("../../common/middleware/authGuard");
const {
  getMyPage,
  deleteMyPost,
  deleteMyComment,
  updateProfileSettings,
} = require("./user.controller");

const router = express.Router();

router.use(authGuard);

// 조회
router.get("/me", getMyPage);

// 삭제
router.delete("/me/posts/:postId", deleteMyPost);
router.delete("/me/comments/:commentId", deleteMyComment);
router.patch("/me/profile", updateProfileSettings);

module.exports = router;
