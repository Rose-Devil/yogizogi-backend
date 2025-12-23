// /api/posts/:id/likes

const express = require("express");
const router = express.Router();
const likeController = require("./like.controller");

// 좋아요 추가
// POST /api/posts/:id/likes
router.post("/posts/:id/likes", likeController.addLike);

// 좋아요 취소
// DELETE /api/posts/:id/likes
router.delete("/posts/:id/likes", likeController.removeLike);

// 게시글 좋아요 개수 조회
// GET /api/posts/:id/likes
router.get("/posts/:id/likes", likeController.getLikeCount);

module.exports = router;
