// /api/posts, /api/me/posts

const express = require("express");
const router = express.Router();
const postController = require("./post.controller");
// const upload = require('../../common/middleware/') 업로드 파일 없음
const upload = null; // TODO: 업로드 미들웨어 구현 필요

// ===== 게시글 CRUD =====
// 구체적인 라우트를 먼저 정의 (동적 라우트보다 위에)
router.get("/popular", postController.getPopularPosts); // 인기 게시글
router.get("/region/:region", postController.getPostsByRegion); // 지역별 게시글
router.get("/", postController.getPosts); // 목록 조회
router.post("/", postController.createPost); // 작성
router.get("/:id", postController.getPostById); // 상세 조회
router.put("/:id", postController.updatePost); // 수정
router.delete("/:id", postController.deletePost); // 삭제

// ===== 이미지 관리 =====
// TODO: upload 미들웨어 구현 후 주석 해제
// router.post("/images", upload.single("image"), postController.uploadImage); // 이미지 업로드
router.post("/images", postController.uploadImage); // 이미지 업로드 (임시)
router.get("/:postId/images", postController.getImagesByPost); //이미지 목록
router.delete("/images/:id", postController.deleteImage); // 이미지 삭제

// ===== 태그 관리 =====
router.get("/:postId/tags", postController.getTagsByPost); //태그 목록
router.post("/:postId/tags", postController.addTagToPost); // 태그 추가
router.delete("/:postId/tags/:tagId", postController.removeTagFromPost); // 태그 제거

module.exports = router;
