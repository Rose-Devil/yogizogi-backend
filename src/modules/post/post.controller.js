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
/**
 * 게시글 작성
 */
exports.createPost = async (req, res, next) => {
  try {
    const thumbnailFile = req.files?.thumbnail?.[0] ?? null;
    const imageFiles = req.files?.images ?? [];

    // S3 location 사용
    const thumbnailUrl = thumbnailFile ? thumbnailFile.location : null;
    const imageUrls = imageFiles.map((file) => file.location);

    const { author_id: ignoredAuthorId, ...restBody } = req.body;

    // 인증된 사용자 ID 확인
    if (!req.user || !req.user.id) {
      console.error("[게시글 작성 실패] 인증이 필요합니다. req.user:", req.user);
      return error(res, "인증이 필요합니다.", 401);
    }

    console.log(`[게시글 작성] author_id: ${req.user.id}, title: ${req.body.title}`);

    const body = {
      ...restBody,
      author_id: req.user.id,
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

    // S3 location 사용
    const imageUrl = req.file.location;
    const newImage = await postService.uploadImage({
      post_id: req.body.post_id,
      image_url: imageUrl,
      sort_order: req.body.sort_order,
    });

    return success(res, newImage, "이미지 업로드 완료", 201);
  } catch (err) {
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

    // TODO: S3에서 파일 삭제 로직 추가 필요 (현재는 DB만 삭제)

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
