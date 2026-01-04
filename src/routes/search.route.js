const express = require("express");
const { getEsClient } = require("../lib/esClient");

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

    return res.json({
      items: hits.map((hit) => ({
        id: hit._id,
        score: hit._score,
        ...(hit._source || {}),
      })),
    });
  } catch (err) {
    err.statusCode = err.statusCode || 502;
    next(err);
  }
});

module.exports = router;
