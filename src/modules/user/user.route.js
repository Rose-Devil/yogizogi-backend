const express = require("express");
const authGuard = require("../../common/middleware/authGuard");
const {
  getMyPage,
  deleteMyPost,
  deleteMyComment,
} = require("./user.controller");

const router = express.Router();

router.use(authGuard);

// 조회
router.get("/me", getMyPage);

// 삭제
router.delete("/me/posts/:postId", deleteMyPost);
router.delete("/me/comments/:commentId", deleteMyComment);

module.exports = router;
