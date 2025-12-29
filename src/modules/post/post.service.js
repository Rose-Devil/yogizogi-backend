// 게시글 서비스

const postRepository = require("./post.repository");
const { TravelPost, PostImage, Tag } = require("./models");
const { Op } = require("sequelize");
const sequelize = require("../../config/db");

// 게시글 목록 조회 (Cursor 기반 페이지네이션)
exports.getPosts = async (queryParams) => {
  const { cursor, limit = 10, region, sort = "latest", tag } = queryParams;

  const where = { is_deleted: false };

  // 지역 필터
  if (region) {
    where.region = region;
  }

  // 정렬
  let order = [["created_at", "DESC"]];
  if (sort === "popular") {
    // 인기 게시글: 댓글 수를 우선으로, 그 다음 좋아요 수로 정렬
    order = [
      ["comment_count", "DESC"],
      ["like_count", "DESC"],
      ["created_at", "DESC"],
    ];
  } else if (sort === "views") {
    order = [
      ["view_count", "DESC"],
      ["created_at", "DESC"],
    ];
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

  // 인기 게시글의 경우 cursor 사용하지 않음 (좋아요+댓글 수로 정렬하므로)
  if (sort === "popular") {
    const result = await postRepository.findAllPosts(where, order, parseInt(limit), 0);
    return {
      posts: result.rows,
      hasNextPage: false, // 인기 게시글은 페이지네이션 없음
      nextCursor: null,
      limit: parseInt(limit),
    };
  }

  // Cursor 기반 조회
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

exports.createPost = async (postData) => {
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

  // 게시글 생성
  const newPost = await postRepository.createPost({
    author_id,
    title,
    content,
    region,
    start_date,
    end_date,
    people_count,
    thumbnail_url,
  });

  // 태그 처리
  if (tags && Array.isArray(tags)) {
    for (const tagName of tags) {
      const tag = await postRepository.findOrCreateTag(tagName);
      await postRepository.addTagToPost(newPost.id, tag.id);
    }
  }

  // 태그 포함해서 다시 조회
  return await postRepository.findPostById(newPost.id);
};

// 게시글 수정
exports.updatePost = async (id, updateData, imageUrls = undefined) => {
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

  const updatedPost = await postRepository.updatePost(id, updateData);

  if (!updatedPost) {
    throw { statusCode: 404, message: "게시글을 찾을 수 없습니다." };
  }

  // 이미지 업데이트 (imageUrls가 제공된 경우)
  if (imageUrls !== undefined && Array.isArray(imageUrls)) {
    // 기존 이미지 모두 제거
    const existingImages = await postRepository.findImagesByPostId(id);
    for (const image of existingImages) {
      await postRepository.deleteImage(image.id);
    }

    // 새 이미지 추가
    for (let i = 0; i < imageUrls.length; i += 1) {
      await postRepository.createPostImage({
        post_id: id,
        image_url: imageUrls[i],
        sort_order: i,
      });
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
    where: { is_deleted: false },
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
