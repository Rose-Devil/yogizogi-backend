const express = require("express");
const { getEsClient } = require("../lib/esClient");
const { TravelPost, PostImage } = require("../modules/post/models");
const { pool } = require("../config/db");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q) {
      return res.status(400).json({ success: false, message: "q is required" });
    }

    const es = getEsClient();
    if (!es) {
      return res.status(503).json({
        success: false,
        message: "Elasticsearch is not configured (set ES_NODE and ES_API_KEY)",
      });
    }

    const indexName = process.env.ES_INDEX || "travel_posts";
    const limit = Math.min(
      Math.max(parseInt(req.query.limit ?? 20, 10) || 20, 1),
      50
    );

    const tokens = q.split(/\s+/).filter(Boolean);

    const should = [
      {
        multi_match: {
          query: q,
          fields: ["title^5", "tags.text^2", "content^1"],
          type: "best_fields",
          fuzziness: "AUTO",
          prefix_length: 1,
          max_expansions: 50
        }
      }
    ];

    if (tokens.length > 0) {
      should.push({
        constant_score: {
          filter: { terms: { tags: tokens } },
          boost: 3
        }
      });
    }

    const body = {
      size: limit,
      query: { bool: { should, minimum_should_match: 1 } },
      sort: [{ createdAt: { order: "desc" } }]
    };


    const response = await es.search({ index: indexName, body });
    const hits = response?.hits?.hits || [];

    // Elasticsearch 결과에서 postId 추출
    const postIds = hits.map((hit) => parseInt(hit._id, 10)).filter((id) => !isNaN(id));

    // DB에서 추가 정보 조회 (이미지, 작성자 정보, 좋아요/댓글 수 등)
    const enrichedItems = [];
    if (postIds.length > 0) {
      try {
        // 게시글 기본 정보 조회
        const posts = await TravelPost.findAll({
          where: { id: postIds, is_deleted: false },
          attributes: [
            "id",
            "author_id",
            "title",
            "content",
            "region",
            "thumbnail_url",
            "like_count",
            "comment_count",
            "created_at",
          ],
          include: [
            {
              model: PostImage,
              as: "images",
              attributes: ["image_url", "sort_order"],
              separate: true,
              order: [["sort_order", "ASC"]],
              limit: 1,
            },
          ],
        });

        // 작성자 정보 일괄 조회
        const authorIds = [...new Set(posts.map((p) => p.author_id).filter(Boolean))];
        const authorMap = new Map();
        if (authorIds.length > 0) {
          const placeholders = authorIds.map(() => "?").join(",");
          const [authorRows] = await pool.query(
            `SELECT id, nickname, profile_image_url FROM \`User\` WHERE id IN (${placeholders})`,
            authorIds
          );
          authorRows.forEach((row) => {
            let profileImageUrl = row.profile_image_url;
            if (profileImageUrl && profileImageUrl.startsWith("/uploads/")) {
              const bucketName = process.env.AWS_BUCKET_NAME;
              const region = process.env.AWS_REGION || "ap-northeast-2";
              const s3Key = profileImageUrl.replace(/^\/uploads\//, "");
              profileImageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
            }
            authorMap.set(row.id, {
              id: row.id,
              nickname: row.nickname || "작성자",
              profile_image_url: profileImageUrl,
            });
          });
        }

        // Elasticsearch 결과와 DB 데이터 매칭
        const postMap = new Map();
        posts.forEach((post) => {
          const postData = post.get ? post.get({ plain: true }) : post;
          const authorInfo = authorMap.get(postData.author_id) || {
            id: postData.author_id,
            nickname: "작성자",
            profile_image_url: null,
          };

          postMap.set(postData.id, {
            id: postData.id,
            postId: postData.id,
            title: postData.title,
            content: postData.content,
            region: postData.region,
            thumbnail_url: postData.thumbnail_url,
            image_url: postData.thumbnail_url,
            images: postData.images || [],
            like_count: postData.like_count || 0,
            comment_count: postData.comment_count || 0,
            author_id: postData.author_id,
            author_name: authorInfo.nickname,
            author_avatar: authorInfo.profile_image_url,
            created_at: postData.created_at,
            createdAt: postData.created_at,
          });
        });

        // Elasticsearch 결과 순서 유지하면서 데이터 보완
        hits.forEach((hit) => {
          const postId = parseInt(hit._id, 10);
          const esData = hit._source || {};
          const dbData = postMap.get(postId);

          if (dbData) {
            // DB 데이터 우선, ES 데이터로 태그 보완
            enrichedItems.push({
              ...dbData,
              tags: esData.tags || [],
              score: hit._score,
            });
          } else {
            // DB에 없는 경우 ES 데이터만 사용
            enrichedItems.push({
              id: postId,
              postId: postId,
              score: hit._score,
              ...esData,
            });
          }
        });
      } catch (dbError) {
        console.error("검색 결과 보완 실패:", dbError);
        // DB 조회 실패 시 ES 데이터만 반환
        enrichedItems.push(
          ...hits.map((hit) => ({
            id: hit._id,
            postId: hit._id,
            score: hit._score,
            ...(hit._source || {}),
          }))
        );
      }
    }

    return res.json({
      items: enrichedItems,
    });
  } catch (err) {
    err.statusCode = err.statusCode || 502;
    next(err);
  }
});

module.exports = router;
