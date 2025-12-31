// 게시글 리포지토리

const { TravelPost, PostImage, Tag, PostTag } = require("./models");
const { Op } = require("sequelize");
const sequelize = require("../../config/db");
const { pool } = require("../../config/db");

/**
 * 게시글 목록 조회 (페이지네이션 + 필터)
 */
exports.findAllPosts = async (where, order, limit, offset) => {
  const result = await TravelPost.findAndCountAll({
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
    raw: false, // Sequelize 인스턴스로 반환 (나중에 plain object로 변환)
  });

  // 작성자 정보 추가 (plain object로 변환하면서)
  result.rows = await enrichPostsWithAuthor(result.rows);

  return result;
};

/**
 * 게시글 목록 조회 (Cursor 기반 페이지네이션)
 * cursor는 마지막 게시글의 created_at (ISO 문자열 또는 timestamp)
 */
exports.findAllPostsByCursor = async (where, order, limit, cursor) => {
  // cursor가 있으면 where 조건에 추가 (created_at 기준)
  if (cursor) {
    // cursor는 ISO 문자열이거나 timestamp
    const cursorDate = cursor instanceof Date ? cursor : new Date(cursor);
    where.created_at = { [Op.lt]: cursorDate };
  }

  // limit + 1로 조회해서 다음 페이지 존재 여부 확인
  const posts = await TravelPost.findAll({
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
        through: { attributes: [] },
      },
    ],
    order,
    limit: limit + 1, // 하나 더 가져와서 다음 페이지 여부 확인
    distinct: true,
  });

  // 다음 페이지 존재 여부 확인
  const hasNextPage = posts.length > limit;
  if (hasNextPage) {
    posts.pop(); // 마지막 하나 제거
  }

  // 작성자 정보 추가
  const enrichedPosts = await enrichPostsWithAuthor(posts);

  // 다음 cursor 계산 (마지막 게시글의 created_at)
  let nextCursor = null;
  if (enrichedPosts.length > 0) {
    const lastPost = enrichedPosts[enrichedPosts.length - 1];
    nextCursor = lastPost.created_at.toISOString();
  }

  return {
    posts: enrichedPosts,
    hasNextPage,
    nextCursor,
  };
};

/**
 * 작성자 정보 조회 (User 테이블에서)
 */
async function getAuthorInfo(authorId) {
  try {
    const [rows] = await pool.query(
      "SELECT id, nickname, profile_image_url FROM `User` WHERE id = ? LIMIT 1",
      [authorId]
    );
    if (rows.length === 0) {
      console.log(
        `[작성자 정보 조회] 사용자를 찾을 수 없음: authorId=${authorId}`
      );
      return { id: authorId, nickname: "작성자", profile_image_url: null };
    }

    const user = rows[0];
    // profile_image_url이 null이거나 빈 문자열이면 null로 처리
    let profileImageUrl =
      user.profile_image_url && user.profile_image_url.trim() !== ""
        ? user.profile_image_url
        : null;

    // 상대 경로인 경우 S3 URL로 변환 (S3 버킷 URL 추가)
    if (profileImageUrl && profileImageUrl.startsWith("/uploads/")) {
      // S3 버킷 URL로 변환
      const bucketName = process.env.AWS_BUCKET_NAME;
      const region = process.env.AWS_REGION || "ap-northeast-2";
      // S3 URL 형식: https://{bucket}.s3.{region}.amazonaws.com/{key}
      const s3Key = profileImageUrl.replace(/^\/uploads\//, "");
      profileImageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
      console.log(
        `[프로필 이미지 경로 변환] 상대 경로 -> S3 URL: ${user.profile_image_url} -> ${profileImageUrl}`
      );
    }

    console.log(
      `[작성자 정보 조회] authorId=${authorId}, nickname=${user.nickname}, profile_image_url=${user.profile_image_url} -> ${profileImageUrl}`
    );

    return {
      id: user.id,
      nickname: user.nickname || "작성자",
      profile_image_url: profileImageUrl,
    };
  } catch (error) {
    console.error(`[작성자 정보 조회 실패] authorId=${authorId}:`, error);
    return { id: authorId, nickname: "작성자", profile_image_url: null };
  }
}

/**
 * 게시글에 작성자 정보 추가
 */
async function enrichPostWithAuthor(post) {
  if (!post || !post.author_id) {
    console.log(`[작성자 정보 추가 실패] post가 없거나 author_id가 없음:`, {
      post: post ? { id: post.id, author_id: post.author_id } : null,
    });
    return post;
  }

  // Sequelize 모델을 plain object로 변환
  const postData = post.get ? post.get({ plain: true }) : post;

  console.log(
    `[작성자 정보 조회 시작] postId: ${postData.id}, authorId: ${
      postData.author_id
    }, authorId 타입: ${typeof postData.author_id}`
  );

  const authorInfo = await getAuthorInfo(postData.author_id);

  // plain object에 작성자 정보 추가
  postData.author_id = authorInfo.id;
  postData.author_name = authorInfo.nickname;
  postData.author_avatar = authorInfo.profile_image_url || null;

  console.log(
    `[작성자 정보 추가 완료] postId: ${postData.id}, authorId: ${
      authorInfo.id
    }, nickname: ${authorInfo.nickname}, avatar: ${
      authorInfo.profile_image_url || "null"
    }`
  );
  console.log(
    `[최종 반환 데이터] postData.author_name: ${postData.author_name}, postData.author_avatar: ${postData.author_avatar}`
  );

  return postData;
}

/**
 * 게시글 배열에 작성자 정보 추가
 */
async function enrichPostsWithAuthor(posts) {
  if (!Array.isArray(posts)) return posts;

  const authorIds = [...new Set(posts.map((p) => p.author_id).filter(Boolean))];
  const authorMap = new Map();

  // 모든 작성자 정보를 한 번에 조회
  if (authorIds.length > 0) {
    try {
      const placeholders = authorIds.map(() => "?").join(",");
      const [rows] = await pool.query(
        `SELECT id, nickname, profile_image_url FROM \`User\` WHERE id IN (${placeholders})`,
        authorIds
      );
      rows.forEach((row) => {
        let profileImageUrl = row.profile_image_url;

        // 상대 경로인 경우 S3 URL로 변환
        if (profileImageUrl && profileImageUrl.startsWith("/uploads/")) {
          const bucketName = process.env.AWS_BUCKET_NAME;
          const region = process.env.AWS_REGION || "ap-northeast-2";
          const s3Key = profileImageUrl.replace(/^\/uploads\//, "");
          profileImageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
        }

        authorMap.set(row.id, {
          id: row.id,
          nickname: row.nickname,
          profile_image_url: profileImageUrl,
        });
      });
    } catch (error) {
      console.error("작성자 정보 일괄 조회 실패:", error);
    }
  }

  // 각 게시글에 작성자 정보 추가
  return posts.map((post) => {
    if (!post || !post.author_id) {
      // Sequelize 모델을 plain object로 변환
      const postData = post.get ? post.get({ plain: true }) : post;
      console.log(
        `[작성자 정보 추가 실패] postId: ${postData?.id}, author_id가 없음`
      );
      return postData;
    }

    // Sequelize 모델을 plain object로 변환
    const postData = post.get ? post.get({ plain: true }) : post;

    // author_id 타입 확인 (숫자로 변환 필요할 수 있음)
    const authorId = Number(postData.author_id);
    if (isNaN(authorId)) {
      console.error(
        `[작성자 정보 추가 실패] postId: ${postData.id}, 유효하지 않은 author_id: ${postData.author_id}`
      );
    }

    const authorInfo = authorMap.get(authorId) || {
      id: authorId,
      nickname: "작성자",
      profile_image_url: null,
    };

    // authorMap에 없으면 기본값 사용 (로그 출력)
    if (!authorMap.has(authorId)) {
      console.log(
        `[작성자 정보 없음] postId: ${postData.id}, authorId: ${authorId}에 해당하는 사용자를 찾을 수 없음. 기본값 사용.`
      );
    }

    postData.author_id = authorInfo.id;
    postData.author_name = authorInfo.nickname;
    postData.author_avatar = authorInfo.profile_image_url || null;

    if (postData.id) {
      console.log(
        `[작성자 정보 추가] postId: ${postData.id}, authorId: ${
          authorInfo.id
        }, nickname: ${authorInfo.nickname}, avatar: ${
          authorInfo.profile_image_url || "null"
        }`
      );
    }

    return postData;
  });
}

/**
 * 게시글 상세 조회
 */
exports.findPostById = async (id) => {
  const post = await TravelPost.findOne({
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

  if (!post) return null;

  // 작성자 정보 추가
  return await enrichPostWithAuthor(post);
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
  const result = await TravelPost.findAndCountAll({
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

  // 작성자 정보 추가
  result.rows = await enrichPostsWithAuthor(result.rows);

  return result;
};

/**
 * 지역별 게시글 조회
 */
exports.findPostsByRegion = async (region, limit, offset) => {
  const result = await TravelPost.findAndCountAll({
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

  // 작성자 정보 추가
  result.rows = await enrichPostsWithAuthor(result.rows);

  return result;
};

/**
 * 태그로 게시글 검색
 */
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

  // 작성자 정보 추가
  result.rows = await enrichPostsWithAuthor(result.rows);

  return result;
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
