// 게시글 컨트롤러

const postService = require("./post.service");
const { success, error, paginated } = require("../../common/utils/response");
const fs = require("fs").promises;
const path = require("path");

function parseTags(raw) {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) return raw;

  const text = String(raw).trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {}

  return text
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#/, "").trim())
    .filter(Boolean);
}

function collectUploadedFiles(req) {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === "object") {
    return Object.values(req.files).flat();
  }
  return [];
}

/**
 * 게시글 목록 조회 (Cursor 기반 페이지네이션)
 */
exports.getPosts = async (req, res, next) => {
  try {
    const result = await postService.getPosts(req.query);

    // Cursor 기반 응답 형식
    return res.status(200).json({
      success: true,
      message: "게시글 목록 조회 성공",
      data: result.posts,
      cursorPagination: {
        hasNextPage: result.hasNextPage,
        nextCursor: result.nextCursor,
        limit: result.limit,
      },
    });
  } catch (err) {
    if (req.files && Array.isArray(req.files)) {
      await Promise.allSettled(req.files.map((f) => fs.unlink(f.path)));
    }
    next(err);
  }
};

/**
 * 게시글 상세 조회
 */
exports.getPostById = async (req, res, next) => {
  try {
    const post = await postService.getPostById(req.params.id);
    return success(res, post, "게시글 조회 성공");
  } catch (err) {
    const files = collectUploadedFiles(req);
    if (files.length > 0) {
      await Promise.allSettled(files.map((f) => fs.unlink(f.path)));
    }
    next(err);
  }
};

/**
 * 게시글 작성
 */
exports.createPost = async (req, res, next) => {
  try {
    const thumbnailFile = req.files?.thumbnail?.[0] ?? null;
    const imageFiles = req.files?.images ?? [];

    const thumbnailUrl = thumbnailFile
      ? `/uploads/posts/${thumbnailFile.filename}`
      : null;
    const imageUrls = imageFiles.map(
      (file) => `/uploads/posts/${file.filename}`
    );

    const body = {
      ...req.body,
      tags: parseTags(req.body.tags),
    };

    const newPost = await postService.createPost(
      {
        ...body,
        thumbnail_url: thumbnailUrl ?? body.thumbnail_url,
      },
      thumbnailUrl ? [thumbnailUrl, ...imageUrls] : imageUrls
    );
    return success(res, newPost, "게시글 작성 완료", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * 게시글 수정
 */
exports.updatePost = async (req, res, next) => {
  try {
    const updatedPost = await postService.updatePost(req.params.id, req.body);
    return success(res, updatedPost, "게시글 수정 완료");
  } catch (err) {
    next(err);
  }
};

/**
 * 게시글 삭제
 */
exports.deletePost = async (req, res, next) => {
  try {
    await postService.deletePost(req.params.id);
    return success(res, null, "게시글 삭제 완료");
  } catch (err) {
    next(err);
  }
};

/**
 * 인기 게시글 조회 (페이지네이션)
 */
exports.getPopularPosts = async (req, res, next) => {
  try {
    const result = await postService.getPopularPosts(req.query);
    return paginated(
      res,
      result.posts,
      {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
      "인기 게시글 조회 성공"
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 지역별 게시글 조회
 */
exports.getPostsByRegion = async (req, res, next) => {
  try {
    const result = await postService.getPostsByRegion(
      req.params.region,
      req.query.page,
      req.query.limit
    );

    return paginated(
      res,
      result.posts,
      {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
      `${req.params.region} 지역 게시글 조회 성공`
    );
  } catch (err) {
    next(err);
  }
};

// ===== 이미지 관련 =====

/**
 * 이미지 업로드
 */
exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return error(res, "이미지 파일을 업로드해주세요", 400);
    }

    const imageUrl = `/uploads/posts/${req.file.filename}`;
    const newImage = await postService.uploadImage({
      post_id: req.body.post_id,
      image_url: imageUrl,
      sort_order: req.body.sort_order,
    });

    return success(res, newImage, "이미지 업로드 완료", 201);
  } catch (err) {
    // 에러 시 업로드된 파일 삭제
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(err);
  }
};

/**
 * 이미지 목록 조회
 */
exports.getImagesByPost = async (req, res, next) => {
  try {
    const images = await postService.getImagesByPost(req.params.postId);
    return success(res, images, "이미지 목록 조회 성공");
  } catch (err) {
    next(err);
  }
};

/**
 * 이미지 삭제
 */
exports.deleteImage = async (req, res, next) => {
  try {
    const deletedImage = await postService.deleteImage(req.params.id);

    // 파일 시스템에서 삭제
    const filename = deletedImage.image_url.split("/").pop();
    const filePath = path.resolve(__dirname, "../../../uploads/posts", filename);
    await fs.unlink(filePath).catch(() => {});

    return success(res, null, "이미지 삭제 완료");
  } catch (err) {
    next(err);
  }
};

// ===== 태그 관련 =====

/**
 * 게시글에 태그 추가
 */
exports.addTagToPost = async (req, res, next) => {
  try {
    const { tagName } = req.body;
    const tag = await postService.addTagToPost(req.params.postId, tagName);
    return success(res, tag, "태그 추가 완료", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * 게시글의 태그 제거
 */
exports.removeTagFromPost = async (req, res, next) => {
  try {
    await postService.removeTagFromPost(req.params.postId, req.params.tagId);
    return success(res, null, "태그 제거 완료");
  } catch (err) {
    next(err);
  }
};

/**
 * 게시글의 태그 목록
 */
exports.getTagsByPost = async (req, res, next) => {
  try {
    const tags = await postService.getTagsByPost(req.params.postId);
    return success(res, tags, "태그 목록 조회 성공");
  } catch (err) {
    next(err);
  }
};
