// /api/posts/:id/likes

const express = require("express");
const router = express.Router();
const likeController = require("./like.controller");
const { authGuard } = require("../../common/middleware/authGuard");

// 좋아요 토글 (인스타 스타일)
// POST /api/posts/:id/likes
router.post("/posts/:id/likes", authGuard, likeController.toggleLike);

// 게시글 좋아요 상태 조회
// GET /api/posts/:id/likes
router.get("/posts/:id/likes", authGuard, likeController.getLikeState);

module.exports = router;
