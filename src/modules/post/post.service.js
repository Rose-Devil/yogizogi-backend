// 게시글 서비스

const postRepository = require("./post.repository");
const { TravelPost, PostImage, Tag } = require("./models");
const { Op } = require("sequelize");
const { sequelize } = require("../../config/db");

// 게시글 목록 조회 (Cursor 기반 페이지네이션)
exports.getPosts = async (queryParams) => {
  const { cursor, limit = 10, region, sort = "latest", tag } = queryParams;

  const where = { is_deleted: false };

  // 광고성 게시글 필터링
  // sort === "advertisement"일 때만 광고성 게시글 표시
  // 그 외의 경우에는 광고성 게시글 제외
  // 주의: 데이터베이스에 is_advertisement 컬럼이 있어야 함
  // 컬럼이 없으면 필터링을 건너뛰고 모든 게시글 표시
  if (sort === "advertisement") {
    where.is_advertisement = true;
  } else {
    // 메인 게시판, 인기 게시글, 조회수 순 등에서는 광고성 게시글 제외
    // 단, 컬럼이 없을 수 있으므로 에러 핸들링은 repository에서 처리
    where.is_advertisement = false;
  }

  // 지역 필터
  if (region) {
    where.region = region;
  }

  // 정렬
  let order = [["created_at", "DESC"]];
  if (sort === "popular") {
    // 인기 게시글은 댓글 수 기준으로 정렬 (offset 기반 페이지네이션 사용)
    order = [
      [sequelize.literal("comment_count"), "DESC"],
      ["created_at", "DESC"],
    ];
  } else if (sort === "views") {
    order = [
      ["view_count", "DESC"],
      ["created_at", "DESC"],
    ];
  } else if (sort === "advertisement") {
    // 광고성 게시글은 최신순으로 정렬
    order = [["created_at", "DESC"]];
  }

  // 태그 검색 (태그는 아직 cursor 기반 미지원, 기존 방식 유지)
  if (tag) {
    const offset = cursor ? 0 : 0; // 태그 검색은 일단 기존 방식
    return await postRepository.findPostsByTag(
      tag,
      parseInt(limit),
      parseInt(offset)
    );
  }

  // 인기 게시글은 offset 기반 페이지네이션 사용 (커스텀 정렬 때문)
  if (sort === "popular") {
    const offset = cursor ? 0 : 0; // 인기 게시글은 cursor를 offset으로 사용하지 않음
    const result = await postRepository.findAllPosts(where, order, parseInt(limit), offset);
    return {
      posts: result.rows,
      hasNextPage: false, // 인기 게시글은 offset 기반, 다음 페이지는 별도 처리 필요 시 추가
      nextCursor: null,
      limit: parseInt(limit),
    };
  }

  // Cursor 기반 조회 (일반 게시글)
  const result = await postRepository.findAllPostsByCursor(
    where,
    order,
    parseInt(limit),
    cursor || null
  );

  return {
    posts: result.posts,
    hasNextPage: result.hasNextPage,
    nextCursor: result.nextCursor,
    limit: parseInt(limit),
  };
};
// 게시글 상세 조회 (조회수 증가)

exports.getPostById = async (id) => {
  const post = await postRepository.findPostById(id);
  if (!post) {
    throw { statusCode: 404, message: "게시글을 찾을 수 없습니다" };
  }

  // 조회수 증가
  await postRepository.incrementViewCount(id);

  return post;
};

// 게시글 작성

exports.createPost = async (postData, imageUrls = []) => {
  const {
    author_id,
    title,
    content,
    region,
    start_date,
    end_date,
    people_count,
    thumbnail_url,
    tags, // ["해변", "맛집", "가족여행"]
  } = postData;

  // 필수값 검증
  if (!author_id || !title || !content || !region) {
    throw {
      statusCode: 400,
      message: "필수 항목을 입력해주세요 (author_id, title, content, region",
    };
  }

  // 콘텐츠 검열 (욕설, 비방 등 부적절한 내용 검사)
  const contentModeration = require("./content-moderation.service");
  const moderationResult = await contentModeration.moderatePost(title, content);
  
  if (moderationResult.flagged) {
    throw {
      statusCode: 400,
      message: moderationResult.reason || "부적절한 표현이 포함되어 있습니다. 수정 후 다시 시도해주세요.",
    };
  }

  // 광고성 게시글 검열
  const advertisementDetection = require("./advertisement-detection.service");
  const adDetectionResult = await advertisementDetection.detectPost(title, content);
  
  console.log(`[광고성 검사 결과] isAdvertisement: ${adDetectionResult.isAdvertisement}, confidence: ${(adDetectionResult.confidence * 100).toFixed(1)}%`);

  // 게시글 생성
  const newPost = await postRepository.createPost({
    author_id,
    title,
    content,
    region,
    start_date,
    end_date,
    people_count,
    thumbnail_url:
      thumbnail_url ??
      (Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls[0] : null),
    is_advertisement: adDetectionResult.isAdvertisement, // 광고성 여부 저장
  });

  // 태그 처리
  if (tags && Array.isArray(tags)) {
    for (const tagName of tags) {
      const tag = await postRepository.findOrCreateTag(tagName);
      await postRepository.addTagToPost(newPost.id, tag.id);
    }
  }

  if (Array.isArray(imageUrls) && imageUrls.length > 0) {
    for (let i = 0; i < imageUrls.length; i += 1) {
      await postRepository.createPostImage({
        post_id: newPost.id,
        image_url: imageUrls[i],
        sort_order: i,
      });
    }
  }

  // 태그 포함해서 다시 조회
  const createdPost = await postRepository.findPostById(newPost.id);

  // AI 여행 비서 분석 트리거 (비동기 처리)
  const aiTravelAssistant = require("./ai-travel-assistant.service");
  aiTravelAssistant
    .analyzePost(title, content, region, start_date, end_date)
    .then(async (aiData) => {
      if (aiData) {
        // AI 분석 결과를 DB에 저장
        await postRepository.updatePost(newPost.id, { ai_data: aiData });
        console.log("✅ AI 여행 비서 분석 결과 저장 완료");
      }
    })
    .catch((err) => {
      console.error("AI 여행 비서 분석 실패:", err);
    });

  // AI 댓글 생성 트리거 (비동기 처리)
  // 오류가 발생해도 게시글 생성은 성공으로 처리하기 위해 await 하지 않거나 catch 처리
  const commentService = require("../interaction/comment.service");
  commentService.generateAIComment(createdPost.id).catch((err) => {
    console.error("AI 댓글 생성 트리거 실패:", err);
  });

  return createdPost;
};

// 게시글 수정
exports.updatePost = async (id, updateData) => {
  // 태그는 별도로 처리
  const tags = updateData.tags;
  delete updateData.tags;

  // 수정 불가 필드 제거
  delete updateData.id;
  delete updateData.author_id;
  delete updateData.view_count;
  delete updateData.like_count;
  delete updateData.comment_count;
  delete updateData.created_at;

  // 제목이나 내용이 변경되는 경우 검열
  if (updateData.title || updateData.content) {
    // 기존 게시글 정보 가져오기
    const existingPost = await postRepository.findPostById(id);
    if (!existingPost) {
      throw { statusCode: 404, message: "게시글을 찾을 수 없습니다." };
    }

    // 변경될 제목과 내용 (없으면 기존 값 사용)
    const title = updateData.title || existingPost.title || "";
    const content = updateData.content || existingPost.content || "";

    // 콘텐츠 검열
    const contentModeration = require("./content-moderation.service");
    const moderationResult = await contentModeration.moderatePost(title, content);
    
    if (moderationResult.flagged) {
      throw {
        statusCode: 400,
        message: moderationResult.reason || "부적절한 표현이 포함되어 있습니다. 수정 후 다시 시도해주세요.",
      };
    }

    // 광고성 게시글 검열
    const advertisementDetection = require("./advertisement-detection.service");
    const adDetectionResult = await advertisementDetection.detectPost(title, content);
    
    console.log(`[광고성 검사 결과 (수정)] isAdvertisement: ${adDetectionResult.isAdvertisement}, confidence: ${(adDetectionResult.confidence * 100).toFixed(1)}%`);
    
    // 광고성 여부 업데이트
    updateData.is_advertisement = adDetectionResult.isAdvertisement;
  }

  // 이미지 업데이트 (imageUrls가 제공된 경우)
  const imageUrls = updateData.imageUrls;
  delete updateData.imageUrls;

  const updatedPost = await postRepository.updatePost(id, updateData);

  if (!updatedPost) {
    throw { statusCode: 404, message: "게시글을 찾을 수 없습니다." };
  }

  // 이미지 업데이트 처리
  if (imageUrls !== undefined && Array.isArray(imageUrls)) {
    // 기존 이미지 모두 삭제
    await PostImage.destroy({ where: { post_id: id } });

    // 새 이미지 추가
    if (imageUrls.length > 0) {
      for (let i = 0; i < imageUrls.length; i += 1) {
        await postRepository.createPostImage({
          post_id: id,
          image_url: imageUrls[i],
          sort_order: i,
        });
      }
    }
  }

  // 태그 업데이트 (tags가 제공된 경우)
  if (tags !== undefined) {
    if (Array.isArray(tags)) {
      // 기존 태그 모두 제거
      const existingTags = await postRepository.findTagsByPostId(id);
      for (const tag of existingTags) {
        await postRepository.removeTagFromPost(id, tag.id);
      }

      // 새 태그 추가
      for (const tagName of tags) {
        const tag = await postRepository.findOrCreateTag(tagName);
        // 중복 체크
        const existingPostTag = await postRepository.findPostTag(id, tag.id);
        if (!existingPostTag) {
          await postRepository.addTagToPost(id, tag.id);
        }
      }
    }
  }

  // 태그 포함해서 다시 조회
  return await postRepository.findPostById(id);
};

// 게시글 삭제
exports.deletePost = async (id) => {
  const deletedPost = await postRepository.deletePost(id);

  if (!deletedPost) {
    throw { statusCode: 404, message: "게시글을 찾을 수 없습니다." };
  }

  return deletedPost;
};

// 인기 게시글 조회 (페이지네이션 추가)
exports.getPopularPosts = async (queryParams) => {
  const { page = 1, limit = 10 } = queryParams || {};
  const offset = (page - 1) * limit;

  const result = await postRepository.findPopularPosts(
    parseInt(limit),
    parseInt(offset)
  );

  return {
    posts: result.rows,
    total: result.count,
    page: parseInt(page),
    limit: parseInt(limit),
  };
};

// 지역별 게시글 조회 (페이지네이션 추가)
exports.getPostsByRegion = async (region, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const result = await postRepository.findPostsByRegion(
    region,
    parseInt(limit),
    parseInt(offset)
  );

  return {
    posts: result.rows,
    total: result.count,
    page: parseInt(page),
    limit: parseInt(limit),
  };
};

// 태그로 게시글 검색 (페이지네이션 반환 형식 통일)
exports.findPostsByTag = async (tagName, limit, offset) => {
  const result = await TravelPost.findAndCountAll({
    where: { is_deleted: false, is_advertisement: false }, // 광고성 게시글 제외
    include: [
      {
        model: Tag,
        as: "tags",
        where: { name: tagName },
        attributes: ["id", "name"],
        through: { attributes: [] },
      },
      {
        model: PostImage,
        as: "images",
        attributes: ["id", "image_url"],
        separate: true,
        order: [["sort_order", "ASC"]],
        limit: 1,
      },
    ],
    order: [["created_at", "DESC"]],
    limit,
    offset,
    distinct: true,
  });

  return result;
};

// ===== Tag 관련 =====

/**
 * 게시글의 태그 목록 조회
 */
exports.getTagsByPost = async (postId) => {
  const post = await postRepository.findPostById(postId);
  if (!post) {
    throw { statusCode: 404, message: "게시글을 찾을 수 없습니다." };
  }

  return await postRepository.findTagsByPostId(postId);
};

/**
 * 게시글에 태그 추가
 */
exports.addTagToPost = async (postId, tagName) => {
  // 게시글 존재 확인
  const post = await postRepository.findPostById(postId);
  if (!post) {
    throw { statusCode: 404, message: "게시글을 찾을 수 없습니다." };
  }

  // 태그 생성 또는 조회
  const tag = await postRepository.findOrCreateTag(tagName);

  // 이미 연결된 태그인지 확인
  const existingPostTag = await postRepository.findPostTag(postId, tag.id);
  if (existingPostTag) {
    throw { statusCode: 400, message: "이미 추가된 태그입니다." };
  }

  // 게시글에 태그 연결
  await postRepository.addTagToPost(postId, tag.id);

  return tag;
};

/**
 * 게시글에서 태그 제거
 */
exports.removeTagFromPost = async (postId, tagId) => {
  // 게시글 존재 확인
  const post = await postRepository.findPostById(postId);
  if (!post) {
    throw { statusCode: 404, message: "게시글을 찾을 수 없습니다." };
  }

  // 태그 연결 제거
  const deleted = await postRepository.removeTagFromPost(postId, tagId);

  if (deleted === 0) {
    throw { statusCode: 404, message: "연결된 태그를 찾을 수 없습니다." };
  }

  return { message: "태그가 제거되었습니다." };
};

// ===== PostImage 관련 =====

exports.uploadImage = async (imageData) => {
  const { post_id, image_url, sort_order } = imageData || {};

  if (!post_id || !image_url) {
    throw { statusCode: 400, message: "post_id, image_url은 필수입니다." };
  }

  const post = await postRepository.findPostById(post_id);
  if (!post) {
    throw { statusCode: 404, message: "게시글을 찾을 수 없습니다." };
  }

  const created = await postRepository.createPostImage({
    post_id,
    image_url,
    sort_order: sort_order ?? 0,
  });

  if (!post.thumbnail_url) {
    await postRepository.updatePost(post_id, { thumbnail_url: image_url });
  }

  return created;
};

exports.getImagesByPost = async (postId) => {
  const post = await postRepository.findPostById(postId);
  if (!post) {
    throw { statusCode: 404, message: "게시글을 찾을 수 없습니다." };
  }

  return await postRepository.findImagesByPostId(postId);
};

exports.deleteImage = async (id) => {
  const deleted = await postRepository.deleteImage(id);
  if (!deleted) {
    throw { statusCode: 404, message: "이미지를 찾을 수 없습니다." };
  }
  return deleted;
};
