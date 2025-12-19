// 게시글 서비스

const postRepository = require("./post.repository");
const { TravelPost, PostImage, Tag } = require("./models");
const { Op } = require("sequelize");

// 게시글 목록 조회
exports.getPosts = async (queryParams) => {
  const { page = 1, limit = 10, region, sort = "lastes", tag } = queryParams;

  const offset = (page - 1) * limit;
  const where = { is_deleted: false };

  // 지역 필터
  if (region) {
    where.region = region;
  }

  // 정렬
  let order = [["created_at", "DESC"]];
  if (sort === "popular") {
    order = [
      ["like_count", "DESC"],
      ["created_at", "DESC"],
    ];
  } else if (sort === "views") {
    order = [
      ["view_count", "DESC"],
      ["created_at", "DESC"],
    ];
  }

  // 태그 검색
  if (tag) {
    return await postRepository.findPostsByTag(
      tag,
      parseInt(limit),
      parseInt(offset)
    );
  }

  const result = await postRepository.findAllPosts(
    where,
    order,
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
exports.updatePost = async (id, updateData) => {
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

  return updatedPost;
};

// 게시글 삭제
exports.deletePost = async (id) => {
  const deletedPost = await postRepository.deletePost(id);

  if (!deletedPost) {
    throw { statusCode: 404, message: "게시글을 찾을 수 없습니다." };
  }

  return deletedPost;
};

// 인기 게시글 조회
exports.getPopularPosts = async (limit = 10) => {
  return await postRepository.findPopularPosts(parseInt(limit));
};

// 지역별 게시글 조회
exports.findPostsByRegion = async (region, limit, offset) => {
  return await TravelPost.findAndCountAll({
    where: { region, is_deleted: false },
    include: [
      {
        model: PostImage,
        as: "images",
        attributes: ["id", "image_url", "sort_order"],
        separate: true,
        order: [["sort_order", "ASC"]],
      },
    ],
    order: [["created_at", "DESC"]],
    limit,
    offset,
    distinct: true,
  });
};

// 태그로 게시글 검색

exports.findPostsByTag = async (tagName, limit, offset) => {
  return await TravelPost.findAndCountAll({
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
};

// ===== PostImage 관련 =====
