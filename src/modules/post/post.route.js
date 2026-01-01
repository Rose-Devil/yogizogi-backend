// /api/posts, /api/me/posts

const express = require("express");
const postController = require("./post.controller");
const { postImagesUpload } = require("../../common/middleware/upload");
const { authGuard } = require("../../common/middleware/authGuard");

const router = express.Router();

// ===== 게시글 CRUD =====
router.get("/popular", postController.getPopularPosts);
router.get("/region/:region", postController.getPostsByRegion);
router.get("/", postController.getPosts);

router.post(
  "/",
  authGuard,
  postImagesUpload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "images", maxCount: 6 },
  ]),
  postController.createPost
);

router.get("/:id", postController.getPostById);
router.put(
  "/:id",
  authGuard,
  postImagesUpload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "images", maxCount: 6 },
  ]),
  postController.updatePost
);
router.delete("/:id", authGuard, postController.deletePost);

// ===== 이미지 =====
router.post("/images", postImagesUpload.single("image"), postController.uploadImage);
router.get("/:postId/images", postController.getImagesByPost);
router.delete("/images/:id", postController.deleteImage);

// ===== 태그 =====
router.get("/:postId/tags", postController.getTagsByPost);
router.post("/:postId/tags", postController.addTagToPost);
router.delete("/:postId/tags/:tagId", postController.removeTagFromPost);

module.exports = router;
