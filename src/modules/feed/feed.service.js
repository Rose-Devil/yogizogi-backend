// 피드/검색 서비스 (조회 전용)

const { pool } = require("../../config/db");

// 피드 목록
async function getFeed({ limit = 20, offset = 0 }) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT 
         p.id,
         p.title,
         p.location,
         p.created_at AS date,
         u.nickname AS author,
         u.url AS authorUrl,
         (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likes,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments,
         (SELECT pi.url FROM post_images pi WHERE pi.post_id = p.id ORDER BY pi.id LIMIT 1) AS image,
         GROUP_CONCAT(t.name) AS tags
       FROM posts p
       JOIN users u ON u.id = p.author_id
       LEFT JOIN post_tags pt ON pt.post_id = p.id
       LEFT JOIN tags t ON t.id = pt.tag_id
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const items = rows.map((row) => ({
      id: row.id,
      title: row.title,
      author: row.author,
      authorUrl: row.authorUrl,
      location: row.location,
      likes: Number(row.likes ?? 0),
      comments: Number(row.comments ?? 0),
      image: row.image,
      tags: row.tags ? row.tags.split(",") : [],
      date: row.date,
    }));

    return { items, limit, offset };
  } finally {
    conn.release();
  }
}

module.exports = { getFeed };
