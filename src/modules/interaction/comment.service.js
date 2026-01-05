const Comment = require("./comment.model");
const User = require("../user/user.model");
const TravelPost = require("../post/travelPost.model");
const aiCommentService = require("./ai-comment.service");

class CommentService {
  /**
   * 댓글 생성
   * @param {number} postId
   * @param {number} userId
   * @param {string} content
   * @param {number|null} parentId
   */
  async createComment(postId, userId, content, parentId = null) {
    const post = await TravelPost.findByPk(postId);
    if (!post) throw new Error("게시글을 찾을 수 없습니다.");

    if (parentId) {
      const parentComment = await Comment.findByPk(parentId);
      if (!parentComment) throw new Error("부모 댓글을 찾을 수 없습니다.");
      if (parentComment.post_id !== parseInt(postId)) {
        throw new Error("부모 댓글과 같은 게시글이어야 합니다.");
      }
    }

    const comment = await Comment.create({
      post_id: postId,
      author_id: userId,
      content,
      parent_id: parentId,
      is_ai: false,
    });

    // 게시글 댓글 수 업데이트
    await post.increment("comment_count");

    // 작성자 정보 포함하여 반환 (Manual Join)
    const commentData = comment.toJSON();
    try {
      const author = await User.findProfile(userId);
      commentData.author = author || { nickname: "Unknown" };
    } catch (e) {
      console.error("Error fetching author profile:", e);
      commentData.author = { nickname: "Unknown" };
    }

    return commentData;
  }

  /**
   * 계층형 댓글 목록 조회
   * @param {number} postId
   */
  async getComments(postId) {
    const comments = await Comment.findAll({
      where: { post_id: postId },
      order: [
        ["created_at", "ASC"], // 먼저 작성된 순
      ],
    });

    // 작성자 정보 매핑 (Manual Populate)
    const authorIds = [...new Set(comments.map((c) => c.author_id))];
    const authors = {};

    for (const id of authorIds) {
      if (id === 1) {
        // AI or Admin fallback
        authors[id] = {
          id: 1,
          nickname: "AI 여행 봇",
          profile_image: "/ai-bot-avatar.png",
        };
      } else {
        try {
          const profile = await User.findProfile(id);
          authors[id] = profile;
        } catch (e) {
          console.error(`Failed to fetch user ${id}`, e);
        }
      }
    }

    // 계층 구조로 변환
    const rootComments = [];
    const commentMap = {};

    comments.forEach((c) => {
      const commentJson = c.toJSON();
      commentJson.author = authors[c.author_id] || { nickname: "알 수 없음" };
      commentJson.replies = [];
      commentMap[commentJson.id] = commentJson; // 참조 저장
    });

    comments.forEach((c) => {
      const node = commentMap[c.id];
      if (c.parent_id) {
        if (commentMap[c.parent_id]) {
          commentMap[c.parent_id].replies.push(node);
        } else {
          // 부모가 없으면(삭제됨?) 루트로 취급 혹은 무시
          rootComments.push(node);
        }
      } else {
        rootComments.push(node);
      }
    });

    return rootComments;
  }

  /**
   * AI 댓글 생성 및 저장
   * @param {number} postId
   */
  async generateAIComment(postId) {
    try {
      const { config } = require("../../config/env");
      const { Op } = require("sequelize");

      // 1. 딜레이 적용
      if (config.ai.commentDelayMs > 0) {
        console.log(
          `⏳ AI 댓글 생성 대기 중... (${config.ai.commentDelayMs}ms)`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, config.ai.commentDelayMs)
        );
      }

      const post = await TravelPost.findByPk(postId);
      if (!post) return;

      // 2. 글자 수 제한 확인
      if (post.content.length < config.ai.minPostLength) {
        console.log(
          `⚠️ 게시글이 너무 짧아 AI 댓글을 생성하지 않습니다. (길이: ${post.content.length}, 최소: ${config.ai.minPostLength})`
        );
        return;
      }

      const aiUserId = 1;

      // 3. 일일 댓글 제한 확인
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyCount = await Comment.count({
        where: {
          author_id: aiUserId,
          is_ai: true,
          created_at: {
            [Op.gte]: today,
          },
        },
      });

      if (dailyCount >= config.ai.maxDailyComments) {
        console.log(
          `⚠️ 일일 AI 댓글 한도 초과 (${dailyCount}/${config.ai.maxDailyComments})`
        );
        return;
      }

      const generatedContent = await aiCommentService.generateComment(
        post.content,
        post.title
      );

      if (!generatedContent) return;

      const comment = await Comment.create({
        post_id: postId,
        author_id: aiUserId, // 임시: 1번 유저(관리자)가 AI 역할
        content: generatedContent,
        is_ai: true,
      });

      await post.increment("comment_count");
      console.log(`✅ [Post ${postId}] AI 댓글 생성 완료: ${comment.id}`);
    } catch (error) {
      console.error("AI 댓글 생성 중 오류:", error);
    }
  }

  /**
   * 댓글 수정
   * @param {number} commentId
   * @param {number} userId
   * @param {string} content
   */
  async updateComment(commentId, userId, content) {
    const comment = await Comment.findByPk(commentId);
    if (!comment) throw new Error("댓글을 찾을 수 없습니다.");

    // AI 댓글 수정 불가
    if (comment.is_ai) throw new Error("AI 댓글은 수정할 수 없습니다.");

    // 작성자 본인만 수정 가능
    if (comment.author_id !== parseInt(userId)) {
      throw new Error("댓글 수정 권한이 없습니다.");
    }

    comment.content = content;
    await comment.save();

    return comment;
  }

  /**
   * 댓글 삭제
   * @param {number} commentId
   * @param {number} userId
   */
  async deleteComment(commentId, userId) {
    const comment = await Comment.findByPk(commentId);
    if (!comment) throw new Error("댓글을 찾을 수 없습니다.");

    const post = await TravelPost.findByPk(comment.post_id);
    if (!post) throw new Error("관련된 게시글을 찾을 수 없습니다.");

    // 권한 확인: 댓글 작성자 본인 OR 게시글 작성자
    const isCommentAuthor = comment.author_id === parseInt(userId);
    const isPostAuthor = post.author_id === parseInt(userId);

    if (!isCommentAuthor && !isPostAuthor) {
      throw new Error("댓글 삭제 권한이 없습니다.");
    }

    await comment.destroy();
    await post.decrement("comment_count");

    return true;
  }
}

module.exports = new CommentService();
