const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { pool } = require("../src/config/db");
const { getEsClient } = require("../src/lib/esClient");

function getArgValue(args, name) {
  const prefix = `${name}=`;
  const byEquals = args.find((a) => a.startsWith(prefix));
  if (byEquals) return byEquals.slice(prefix.length);

  const idx = args.indexOf(name);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

function parseTagsCsv(tagsCsv) {
  if (!tagsCsv) return [];
  return String(tagsCsv)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function toIso(value) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function buildBulkNdjson(indexName, rows) {
  const lines = [];

  for (const row of rows) {
    const id = String(row.postId);
    const doc = {
      postId: id,
      title: row.title ?? "",
      content: row.content ?? "",
      tags: parseTagsCsv(row.tagsCsv),
      authorId: row.authorId != null ? String(row.authorId) : undefined,
      createdAt: toIso(row.createdAt),
    };

    lines.push(JSON.stringify({ index: { _index: indexName, _id: id } }));
    lines.push(JSON.stringify(doc));
  }

  return lines.join("\n") + "\n";
}

function extractBulkErrors(bulkResponse) {
  const failures = [];
  const items = Array.isArray(bulkResponse?.items) ? bulkResponse.items : [];

  for (const item of items) {
    const action =
      (item && (item.index || item.create || item.update || item.delete)) || null;
    if (action && action.error) {
      failures.push({
        id: action._id,
        status: action.status,
        error: action.error,
      });
    }
  }

  return failures;
}

async function main() {
  const args = process.argv.slice(2);
  const chunkSize = parseInt(getArgValue(args, "--chunk") || "500", 10);
  const dryRun = args.includes("--dry-run");

  if (!Number.isFinite(chunkSize) || chunkSize <= 0) {
    console.error("Invalid --chunk value");
    process.exit(1);
  }

  const indexName = getArgValue(args, "--index") || process.env.ES_INDEX || "travel_posts";
  const es = getEsClient();
  if (!es) {
    console.error("Missing ES config. Set ES_NODE and ES_API_KEY in .env");
    process.exit(1);
  }

  console.log(`Reindex target: ${indexName}`);
  console.log(`Chunk size: ${chunkSize}${dryRun ? " (dry-run)" : ""}`);

  let lastId = 0;
  let total = 0;
  let samplePrinted = false;

  const sql = `
    SELECT
      p.id AS postId,
      p.title AS title,
      p.content AS content,
      p.author_id AS authorId,
      p.created_at AS createdAt,
      GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ',') AS tagsCsv
    FROM \`TravelPost\` p
    LEFT JOIN \`PostTag\` pt ON pt.post_id = p.id
    LEFT JOIN \`Tag\` t ON t.id = pt.tag_id
    WHERE p.is_deleted = 0 AND p.id > ?
    GROUP BY p.id
    ORDER BY p.id ASC
    LIMIT ?
  `;

  while (true) {
    const [rows] = await pool.query(sql, [lastId, chunkSize]);
    if (!rows || rows.length === 0) break;

    total += rows.length;
    lastId = Number(rows[rows.length - 1].postId);

    const ndjson = buildBulkNdjson(indexName, rows);
    if (dryRun) {
      console.log(`Prepared bulk batch: size=${rows.length} lastId=${lastId}`);
      if (!samplePrinted && rows.length > 0) {
        const sampleId = String(rows[0].postId);
        console.log("Sample doc:");
        console.log(
          JSON.stringify(
            {
              postId: sampleId,
              title: rows[0].title ?? "",
              content: (rows[0].content ?? "").slice(0, 120),
              tags: parseTagsCsv(rows[0].tagsCsv),
              authorId: rows[0].authorId != null ? String(rows[0].authorId) : undefined,
              createdAt: toIso(rows[0].createdAt),
            },
            null,
            2
          )
        );
        samplePrinted = true;
      }
      continue;
    }

    const resp = await es.bulk({ body: ndjson });
    if (resp && resp.errors) {
      const failures = extractBulkErrors(resp);
      console.error(`Bulk errors in batch (size=${rows.length}). Sample:`);
      console.error(JSON.stringify(failures.slice(0, 10), null, 2));
      process.exit(1);
    }

    console.log(`Bulk OK: size=${rows.length} lastId=${lastId} total=${total}`);
  }

  console.log(`Done. Total indexed: ${total}`);
}

main()
  .catch((err) => {
    console.error("reindex-travel-posts failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await pool.end();
    } catch {}
  });
