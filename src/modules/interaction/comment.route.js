const express = require("express");
const router = express.Router();
const commentController = require("./comment.controller");
const { authGuard } = require("../../common/middleware/authGuard");

// 댓글 작성
router.post(
    "/posts/:postId/comments",
    authGuard,
    commentController.createComment
);

// 대댓글 작성
router.post(
    "/comments/:commentId/reply",
    authGuard,
    commentController.createReply
);

// 댓글 목록 조회 (인증 불필요)
router.get("/posts/:postId/comments", commentController.getComments);

module.exports = router;
