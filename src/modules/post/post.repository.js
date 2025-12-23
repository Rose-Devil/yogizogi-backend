// 게시글 리포지토리

const { TravelPost, PostImage, Tag, PostTag } = require("./models");
const { Op } = require("sequelize");
const sequelize = require("../../config/db");

/**
 * 게시글 목록 조회 (페이지네이션 + 필터)
 */
exports.findAllPosts = async (where, order, limit, offset) => {
  return await TravelPost.findAndCountAll({
    where,
    include: [
      {
        model: PostImage,
        as: "images",
        attributes: ["id", "image_url", "sort_order"],
        separate: true,
        order: [["sort_order", "ASC"]],
      },
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name"],
        through: { attributes: [] }, // PostTag 테이블 숨김
      },
    ],
    order,
    limit,
    offset,
    distinct: true,
  });
};

/**
 * 게시글 상세 조회
 */
exports.findPostById = async (id) => {
  return await TravelPost.findOne({
    where: { id, is_deleted: false },
    include: [
      {
        model: PostImage,
        as: "images",
        attributes: ["id", "image_url", "sort_order"],
        order: [["sort_order", "ASC"]],
      },
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name"],
        through: { attributes: [] },
      },
    ],
  });
};

/**
 * 게시글 작성
 */
exports.createPost = async (postData) => {
  return await TravelPost.create(postData);
};

/**
 * 게시글 수정
 */
exports.updatePost = async (id, updateData) => {
  const post = await TravelPost.findOne({
    where: { id, is_deleted: false },
  });

  if (!post) return null;

  return await post.update(updateData);
};

/**
 * 게시글 삭제 (Soft Delete)
 */
exports.deletePost = async (id) => {
  const post = await TravelPost.findOne({
    where: { id, is_deleted: false },
  });

  if (!post) return null;

  return await post.update({ is_deleted: true });
};

/**
 * 조회수 증가
 */
exports.incrementViewCount = async (id) => {
  const post = await TravelPost.findByPk(id);
  if (post) {
    await post.increment("view_count");
    await post.reload();
  }
  return post;
};

/**
 * 인기 게시글 조회 (페이지네이션 지원)
 */
exports.findPopularPosts = async (limit, offset) => {
  return await TravelPost.findAndCountAll({
    where: { is_deleted: false },
    include: [
      {
        model: PostImage,
        as: "images",
        attributes: ["id", "image_url"],
        separate: true,
        order: [["sort_order", "ASC"]],
        limit: 1,
      },
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name"],
        through: { attributes: [] },
      },
    ],
    order: [
      ["like_count", "DESC"],
      ["created_at", "DESC"],
    ],
    limit,
    offset,
    distinct: true,
  });
};

/**
 * 지역별 게시글 조회
 */
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
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name"],
        through: { attributes: [] },
      },
    ],
    order: [["created_at", "DESC"]],
    limit,
    offset,
    distinct: true,
  });
};

/**
 * 태그로 게시글 검색
 */
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

/**
 * 이미지 업로드
 */
exports.createPostImage = async (imageData) => {
  return await PostImage.create(imageData);
};

/**
 * 게시글의 이미지 목록 조회
 */
exports.findImagesByPostId = async (postId) => {
  return await PostImage.findAll({
    where: { post_id: postId },
    order: [["sort_order", "ASC"]],
  });
};

/**
 * 이미지 삭제
 */
exports.deleteImage = async (id) => {
  const image = await PostImage.findByPk(id);
  if (!image) return null;

  await image.destroy();
  return image;
};

// ===== Tag 관련 =====

/**
 * 태그 생성 또는 조회 (findOrCreate)
 */
exports.findOrCreateTag = async (tagName) => {
  const [tag, created] = await Tag.findOrCreate({
    where: { name: tagName },
    defaults: { name: tagName },
  });
  return tag;
};

/**
 * 게시글에 태그 연결
 */
exports.addTagToPost = async (postId, tagId) => {
  return await PostTag.create({ post_id: postId, tag_id: tagId });
};

/**
 * 게시글의 태그 삭제
 */
exports.removeTagFromPost = async (postId, tagId) => {
  return await PostTag.destroy({
    where: { post_id: postId, tag_id: tagId },
  });
};

/**
 * 게시글의 모든 태그 조회
 */
exports.findTagsByPostId = async (postId) => {
  return await Tag.findAll({
    include: [
      {
        model: TravelPost,
        as: "posts",
        where: { id: postId },
        through: { attributes: [] },
      },
    ],
  });
};

/**
 * 게시글-태그 연결 확인
 */
exports.findPostTag = async (postId, tagId) => {
  return await PostTag.findOne({
    where: { post_id: postId, tag_id: tagId },
  });
};
